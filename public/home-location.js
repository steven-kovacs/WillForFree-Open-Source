import { suggestion, validPlace } from "./markets.js";

// Keep only the home jurisdiction in this tab. Older guide-only choices could
// differ from the home setting and must not override it.
const key = "wff-home-location";
let inMemory = null;
let pendingDetection;
let storageWritable = true;

export function readHomeLocation() {
  if (!storageWritable) return inMemory;
  try {
    const code = sessionStorage.getItem(key) || "";
    const [country, region = "", ...extra] = code.split("-");
    const place = { country, region };
    return !extra.length && validPlace(place) ? place : null;
  } catch {
    return inMemory;
  }
}

export function setHomeLocation(place) {
  if (!validPlace(place)) throw Error("Unknown jurisdiction");
  inMemory = { country: place.country, region: place.region };
  try {
    sessionStorage.setItem(key, place.region ? place.country + "-" + place.region : place.country);
  } catch {
    storageWritable = false;
  }
  return inMemory;
}

export async function detectLocation(fetcher = fetch, timeout = 2600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher("https://get.geojs.io/v1/ip/geo.json", {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const value = await response.json();
    return suggestion(value?.country_code, value?.region);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function resolveHomeLocation() {
  const saved = readHomeLocation();
  if (saved) return Promise.resolve(saved);
  if (!pendingDetection) {
    pendingDetection = detectLocation().then(guess => {
      const chosen = readHomeLocation();
      if (chosen) return chosen;
      // A country without a required region is only a hint for the home dialog.
      return validPlace(guess) ? setHomeLocation(guess) : guess;
    });
  }
  return pendingDetection;
}
