import { COUNTRIES } from "@/constants/options";
import { matchState } from "@/constants/regions";
import type { AddressBlock } from "@/types/driver";

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
