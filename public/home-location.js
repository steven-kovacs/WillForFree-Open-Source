import { suggestion, validPlace } from "./markets.js";

// Keep only the home jurisdiction in this tab. Older guide-only choices could
// differ from the home setting and must not override it.
const key = "wff-home-location";
const selectedPrefix = "selected:";
let inMemory = "";
let pendingDetection;
let storageWritable = true;

export function readHomeLocation({confirmedOnly = false} = {}) {
  let value = inMemory;
  if (storageWritable) {
    try { value = sessionStorage.getItem(key) || ""; } catch { /* Use this tab's in-memory choice. */ }
  }
  // Older tabs stored both guesses and explicit choices as a bare code.
  const confirmed = value.startsWith(selectedPrefix);
  if (confirmedOnly && !confirmed) return null;
  const [country, region = "", ...extra] = (confirmed ? value.slice(selectedPrefix.length) : value).split("-");
  const place = {country, region};
  return !extra.length && validPlace(place) ? place : null;
}

export function setHomeLocation(place, {confirmed = true} = {}) {
  if (!validPlace(place)) throw Error("Unknown jurisdiction");
  const code = place.region ? place.country + "-" + place.region : place.country;
  inMemory = (confirmed ? selectedPrefix : "") + code;
  try {
    sessionStorage.setItem(key, inMemory);
  } catch {
    storageWritable = false;
  }
  return {country: place.country, region: place.region};
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
      return validPlace(guess) ? setHomeLocation(guess, {confirmed: false}) : guess;
    });
  }
  return pendingDetection;
}
