/**
 * Loads the Google Maps JavaScript API, once, with the Places library.
 *
 * The script tag is added the first time something asks for it and never again:
 * every later call waits on the same promise. Google is told to call back when
 * it is ready (`loading=async` with a `callback`), which is the way it asks to
 * be loaded now.
 *
 * The key is a browser key and ships in the bundle, so it must be restricted by
 * HTTP referrer in the Google Cloud Console, with the Places API enabled and
 * billing on. When any of those is wrong Google runs `gm_authFailure`, which is
 * caught here so the caller can fall back rather than hang.
 */

declare global {
  interface Window {
    google?: typeof google;
    __onGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

const SCRIPT_ID = "google-maps-js";

/** How long to wait for the script before giving up on Google. */
const LOAD_TIMEOUT_MS = 10_000;

let loader: Promise<typeof google> | null = null;

/**
 * True once Google has told us the key was rejected. Latching it means every
 * later lookup skips Google and goes straight to the fallback instead of waiting
 * on a request that will never answer.
 */
let authFailed = false;

export function isGoogleAuthFailed(): boolean {
  return authFailed;
}

export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (authFailed) return Promise.reject(new Error("Google Maps key was rejected."));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      loader = null;
      reject(new Error("Google Maps took too long to load."));
    }, LOAD_TIMEOUT_MS);

    const settleReject = (error: Error) => {
      window.clearTimeout(timer);
      reject(error);
    };

    // Google runs this on a bad key, a blocked referrer or billing that is off.
    window.gm_authFailure = () => {
      authFailed = true;
      loader = null;
      settleReject(
        new Error(
          "Google Maps rejected the key. Check that the Places API is enabled, " +
            "billing is on, and this origin is allowed in the key's HTTP referrer " +
            "restrictions.",
        ),
      );
    };

    window.__onGoogleMapsReady = () => {
      window.clearTimeout(timer);
      if (window.google?.maps?.places) resolve(window.google);
      else reject(new Error("Google Maps loaded without the Places library."));
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&libraries=places&loading=async&callback=__onGoogleMapsReady";
    script.onerror = () => {
      loader = null;
      settleReject(new Error("Could not load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return loader;
}
