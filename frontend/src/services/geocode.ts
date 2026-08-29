import { COUNTRIES } from "@/constants/options";
import { matchState } from "@/constants/regions";
import { isGoogleAuthFailed, loadGoogleMaps } from "./googleMaps";
import type { AddressBlock } from "@/types/driver";

/**
 * When set, address search answers from Google Places rather than OpenStreetMap.
 * It is a browser key inlined into the bundle, so it must be restricted by HTTP
 * referrer in the Google Cloud Console. Left unset, the free OSM lookup is used.
 */
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/**
 * Turns the browser's location into a street address.
 *
 * Uses the OpenStreetMap Nominatim service, which needs no API key and answers
 * with CORS open, so the lookup runs straight from the browser and never sends
 * a driver's coordinates through our own servers.
 *
 * The result is only ever a starting point: every field it fills stays editable,
 * because a reverse lookup lands on the building, not always on the flat.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

/** Zoom levels to try, closest first. The second one is only for a post code. */
const HOUSE_ZOOM = 18;
const AREA_ZOOM = 14;

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  town?: string;
  city_district?: string;
  city?: string;
  county?: string;
  state?: string;
  state_district?: string;
  province?: string;
  region?: string;
  country?: string;
  postcode?: string;
}

/** The dropdown only holds known countries, so an unknown one becomes "Other". */
function matchCountry(name?: string): string {
  if (!name) return "";
  const match = COUNTRIES.find(
    (option) => option.toLowerCase() === name.trim().toLowerCase(),
  );
  return match ?? "Other";
}

function toAddressBlock(address: NominatimAddress): AddressBlock {
  const country = matchCountry(address.country);

  // Which key carries the first level division differs by country: `state` in
  // most, `state_district` or `province` elsewhere, `county` in Ireland.
  const rawState =
    address.state ?? address.province ?? address.region ?? address.county ?? address.state_district;

  return {
    houseNumber: address.house_number ?? "",
    street: address.road ?? "",
    suburb:
      address.suburb ??
      address.neighbourhood ??
      address.village ??
      address.town ??
      address.city_district ??
      address.city ??
      "",
    // Matched against that country's own divisions, so the dropdown can show it.
    state: matchState(country, rawState),
    country,
    postCode: address.postcode ?? "",
  };
}

/** The browser's position, or a message explaining why it was not given. */
function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser cannot share a location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location access was blocked. Allow it in your browser, then try again."
          : error.code === error.TIMEOUT
            ? "Finding your location took too long. Please try again."
            : "Your location is not available right now.";
      reject(new Error(message));
    }, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
  });
}

async function reverseLookup(
  latitude: number,
  longitude: number,
  zoom: number,
): Promise<NominatimAddress | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const body = (await response.json()) as { address?: NominatimAddress };
  return body.address ?? null;
}

/** Where the driver is standing, as address fields ready for the form. */
export async function locateCurrentAddress(): Promise<AddressBlock> {
  const { coords } = await currentPosition();

  const house = await reverseLookup(coords.latitude, coords.longitude, HOUSE_ZOOM);
  if (!house) {
    throw new Error("Could not look up that location. Please fill the address in yourself.");
  }

  // A building is not always tagged with a post code, but the suburb around it
  // usually is, so a missing one is asked for a second time further out.
  let address = house;
  if (!house.postcode) {
    const area = await reverseLookup(coords.latitude, coords.longitude, AREA_ZOOM);
    if (area) address = { ...area, ...house, postcode: house.postcode ?? area.postcode };
  }

  return toAddressBlock(address);
}

// ---------------------------------------------------------------------------
// Searching for an address
// ---------------------------------------------------------------------------

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

/** How many results the box offers. Enough to choose from, few enough to read. */
const SEARCH_LIMIT = 6;

export interface AddressSuggestion {
  /** Stable key for the list. */
  id: string;
  /** The one line the register prints, which is what the box shows. */
  label: string;
  /**
   * The same place split into the fields a form asks for. OpenStreetMap parses
   * it up front, so it is here; Google resolves it on pick, so it is not, and
   * `resolve` is used instead. `resolveSuggestion` reads whichever one is set.
   */
  address?: AddressBlock;
  /** Fetches the split address when the provider only has it on demand. */
  resolve?: () => Promise<AddressBlock>;
}

/** The split address behind a suggestion, however its provider holds it. */
export async function resolveSuggestion(
  suggestion: AddressSuggestion,
): Promise<AddressBlock | null> {
  if (suggestion.address) return suggestion.address;
  if (suggestion.resolve) return suggestion.resolve();
  return null;
}

/**
 * Looks a place up by name, anywhere in the world.
 *
 * The same service as the reverse lookup above, asked the other way round: a
 * typed line in, a list of real places out. Picking one fills the address in,
 * and every field it fills stays editable, because the closest match to what
 * somebody typed is still a guess at what they meant.
 *
 * The caller passes a signal, because the box searches as it is typed and an
 * answer to an older query must never land on top of a newer one.
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  // As little as a single character is enough to start suggesting: the inline
  // address fields search from the first letter typed.
  if (trimmed.length < 1) return [];

  // Google when it is configured and working; OpenStreetMap otherwise.
  if (googleAvailable()) {
    try {
      return await googleSearch(trimmed, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      standDownGoogle(error);
    }
  }

  return nominatimSearch(trimmed, signal);
}

/**
 * How long Google is stood down for after a failure that may well pass.
 *
 * A slow answer, a rate limit or a dropped connection says nothing about the
 * next search, so it must not cost the whole session. This used to latch on the
 * first failure of any kind, which meant one four second timeout left the admin
 * on OpenStreetMap until they reloaded the page.
 */
const GOOGLE_COOLDOWN_MS = 60_000;

/** When Google may be asked again. */
let googleRetryAt = 0;

/**
 * Set once Google has refused the request outright, which is a key, referrer or
 * billing problem. Waiting does not fix any of those, so it is not retried.
 */
let googleMisconfigured = false;

/** Whether Google is configured, working, and not currently stood down. */
function googleAvailable(): boolean {
  if (!GOOGLE_KEY || googleMisconfigured || isGoogleAuthFailed()) return false;
  return Date.now() >= googleRetryAt;
}

/**
 * The ways Google says the key, its restrictions or the project are wrong.
 *
 * Waiting fixes none of them, so they are not retried. The legacy API said
 * REQUEST_DENIED; Places API (New) says PERMISSION_DENIED and names the
 * restriction that refused it, so both wordings are matched.
 */
const MISCONFIGURED = [
  "REQUEST_DENIED",
  "PERMISSION_DENIED",
  "API_KEY_HTTP_REFERRER_BLOCKED",
  "API_KEY_SERVICE_BLOCKED",
  "SERVICE_DISABLED",
  "ApiNotActivatedMapError",
  "not authorized",
  "not activated",
];

/** Steps back from Google, for a minute or for good, depending on why it failed. */
function standDownGoogle(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);

  if (MISCONFIGURED.some((reason) => message.includes(reason))) {
    googleMisconfigured = true;
    console.error(
      "[address search] Google Places refused the request, so OpenStreetMap is " +
        "being used instead and Google will not be asked again this session. " +
        "Check, in the Google Cloud Console: Places API (New) is enabled, the " +
        "key is allowed to call it, billing is on, and this origin is in the " +
        "key's HTTP referrer list.",
      error,
    );
    return;
  }

  googleRetryAt = Date.now() + GOOGLE_COOLDOWN_MS;
  console.warn(
    "[address search] Google Places did not answer; using OpenStreetMap for the " +
      "next minute, then trying Google again.",
    error,
  );
}

async function nominatimSearch(
  trimmed: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(SEARCH_LIMIT));
  url.searchParams.set("q", trimmed);

  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error("The address search is not answering right now.");

  const body = (await response.json()) as Array<{
    place_id?: number | string;
    display_name?: string;
    address?: NominatimAddress;
  }>;

  return body
    .filter((row) => row.address && row.display_name)
    .map((row) => ({
      id: String(row.place_id ?? row.display_name),
      label: row.display_name as string,
      address: toAddressBlock(row.address as NominatimAddress),
    }));
}

// ---------------------------------------------------------------------------
// Google Places
// ---------------------------------------------------------------------------

/**
 * The Places library, loaded once and kept.
 *
 * These are the Places API (New) classes. This used the legacy
 * `AutocompleteService` and `PlacesService`, which answer REQUEST_DENIED unless
 * the legacy Places API is enabled on the Cloud project. It is not, and on a
 * project of this age it cannot be, so every search was quietly falling back to
 * OpenStreetMap. That is why addresses Google Maps knows perfectly well were
 * coming back as "nothing found".
 */
let placesLibrary: google.maps.PlacesLibrary | null = null;

/**
 * The billing session. The suggestions and the `fetchFields` that follows a pick
 * are billed as one session when they share a token, so the token is held across
 * a search and rotated once the details have been fetched.
 */
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

async function ensurePlaces(): Promise<google.maps.PlacesLibrary> {
  if (!GOOGLE_KEY) throw new Error("No Google Maps key is configured.");

  await loadGoogleMaps(GOOGLE_KEY);

  placesLibrary ??= (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
  sessionToken ??= new placesLibrary.AutocompleteSessionToken();

  return placesLibrary;
}

/** How long a Google call is given before it is treated as a failure. */
const GOOGLE_TIMEOUT_MS = 4_000;

/** Rejects if the wrapped Google call has not answered in time. */
function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Google Maps request timed out.")),
      GOOGLE_TIMEOUT_MS,
    );

    work.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

async function googleSearch(
  trimmed: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const places = await ensurePlaces();
  if (signal?.aborted) return [];

  const { suggestions } = await withTimeout(
    places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: sessionToken ?? undefined,
    }),
  );

  if (signal?.aborted) return [];

  // A suggestion can be a query rather than a place ("pizza near me"); those
  // carry no placePrediction and are no use to an address field.
  return suggestions
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is google.maps.places.PlacePrediction => prediction !== null)
    .map((prediction) => ({
      id: prediction.placeId,
      label: prediction.text.toString(),
      resolve: () => googleResolve(prediction),
    }));
}

async function googleResolve(
  prediction: google.maps.places.PlacePrediction,
): Promise<AddressBlock> {
  const place = prediction.toPlace();

  await withTimeout(place.fetchFields({ fields: ["addressComponents"] }));

  // The details call closes the billing session, so the next search starts a new
  // one.
  sessionToken = null;

  return componentsToAddressBlock(place.addressComponents ?? []);
}

/** Turns Google's address components into the fields a form asks for. */
function componentsToAddressBlock(
  components: google.maps.places.AddressComponent[],
): AddressBlock {
  const pick = (type: string): string =>
    components.find((component) => component.types.includes(type))?.longText ?? "";

  const country = matchCountry(pick("country"));
  const rawState = pick("administrative_area_level_1");
  const suburb =
    pick("locality") ||
    pick("postal_town") ||
    pick("sublocality") ||
    pick("sublocality_level_1") ||
    pick("administrative_area_level_2");

  return {
    houseNumber: pick("street_number"),
    street: pick("route"),
    suburb,
    state: matchState(country, rawState),
    country,
    postCode: pick("postal_code"),
  };
}
