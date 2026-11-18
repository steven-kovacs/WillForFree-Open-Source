import { profile } from "./markets.js";
import { maineWitnesses } from "./procedures.js";
import { publicKitHost } from "./release-target.js";

const runtime = fetch("/runtime.json", { cache:"no-store", credentials:"same-origin" })
  .then(response => response.ok ? response.json() : {}).catch(() => ({}));
export async function partnerOffersEnabled() { return (await runtime).partnerOffers === true; }
export async function topicHelpEnabled() { return (await runtime).topicHelp === true; }
const loopback = hostname => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

// Hosting is deliberately closed. A saved file, a query string or a copied runtime
// configuration cannot enable public delivery. Public distribution is a separate decision.
export function documentUse(p, mode, hostname) {
  const published = mode === "public" && publicKitHost !== "" && hostname === publicKitHost;
  if (!published && (!loopback(hostname) || !["workbench","public","local"].includes(mode))) return "closed";
  if (p.route === "planning") return "planning";
  if (p.route === "fixed") return "fixed";
  if (p.route === "official") return "official";
  if (p.route === "deposit") return "deposit";
  return "will";
}
export async function serviceOpen() { return documentUse({}, (await runtime).release, location.hostname) !== "closed"; }
export async function placeForSession(place, purpose) {
  const p = profile(place);
  const use = documentUse(p, (await runtime).release, location.hostname);
  if (use === "closed") throw Error("WillForFree is not open for public downloads.");
  if (purpose === "statutory" && p.key === "US-ME")
    return {...p, route:"statutory", use:"statutory", rule:maineWitnesses, legalSource:"https://legislature.maine.gov/statutes/18-C/title18-Csec2-517.html"};
  return purpose === "planning" ? { ...p, route:"planning", use:"planning" } : { ...p, use };
}
