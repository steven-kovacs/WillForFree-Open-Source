import { markets, regions } from "../../public/places.js";

const idPattern = /^[a-z][a-z0-9-]{0,59}$/;
export function validId(id) { return typeof id === "string" && idPattern.test(id); }
export function areaName(key) {
  const [country, region, extra] = key.split("-");
  if (extra !== undefined || !Object.hasOwn(markets, country)) return null;
  if (region === undefined) return markets[country];
  return Object.hasOwn(regions[country] || {}, region) ? regions[country][region] + ", " + markets[country] : null;
}
const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const line = (s, max) => typeof s === "string" && s.trim().length > 0 && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s);
export function campaignsFrom(entries) {
  if (!Array.isArray(entries)) throw Error("Campaigns must be a list.");
  const seen = new Set();
  for (const c of entries) {
    if (!c || !validId(c.id) || !validId(c.partner) || seen.has(c.id) || !["paid","house"].includes(c.kind) ||
        !Number.isSafeInteger(c.maxDownloads) || c.maxDownloads < 1 || c.maxDownloads > 100000 ||
        !date(c.start) || !date(c.end) || c.end < c.start || !Array.isArray(c.areas) || !c.areas.length ||
        !c.areas.every(k=>typeof k === "string" && areaName(k)) || new Set(c.areas).size !== c.areas.length ||
        !line(c.name,80) || !line(c.title,100) || !line(c.message,380) || !line(c.url,500))
      throw Error("Check the campaign identity, area, dates, offer and maxDownloads (1 to 100000).");
    const url = new URL(c.url);
    if (url.protocol !== "https:" || url.username || url.password) throw Error("Partner links must use HTTPS.");
    for (const existing of entries.slice(0, seen.size)) {
      if (existing.start <= c.end && c.start <= existing.end && c.areas.some(a=>existing.areas.includes(a)))
        throw Error("Two campaigns claim the same service area on overlapping dates.");
    }
    seen.add(c.id);
  }
  return entries;
}
export { activeOn, selectCampaign } from "../../public/sponsor-campaigns.js";
