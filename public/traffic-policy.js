// Only these public routes and actions can cross from the site into the Google tag frame.
export const siteOrigin = "https://willforfree.com";
export const frameOrigin = "https://partners.willforfree.com";
export const measurementId = "G-SQH3WZCPF9";
export const pages = new Map([
  ["/", "WillForFree"], ["/free-and-private/", "Free and private"],
  ["/why-do-i-need-a-will/", "Why do I need a will?"],
  ["/why-do-i-need-a-will/after-the-will/", "After the will"],
  ["/our-mission/", "Our Mission"], ["/fine-print/", "The fine print"],
  ["/partners/", "Sponsor free wills"], ["/partners/brief/", "Sponsorship brief"],
  ["/partners/ideas/", "Partnership ideas by industry"], ["/open-source/", "Open source"],
]);
const actions = new Set(["page_view", "interview_start", "kit_download_start", "sponsor_inquiry_sent"]);
export const choiceDetails = "With your permission, Google Analytics uses a browser identifier to measure visits, traffic sources, interview starts, kit downloads and sponsor inquiries. Your answers and messages stay out of Analytics.";
const campaigns = {
  source: ["google", "bing", "newsletter", "partner", "linkedin", "facebook", "instagram", "reddit", "minddrive"],
  medium: ["organic", "email", "referral", "social", "cpc", "print", "qr"],
  name: ["launch", "partner-outreach", "newsletter", "community", "broker-outreach"],
};
export function campaignFields(query) {
  const parameters = new URLSearchParams(query);
  const result = {};
  for (const [field, allowed] of Object.entries(campaigns)) {
    const key = field === "name" ? "campaign" : field;
    const value = parameters.get("utm_" + key)?.toLowerCase();
    if (allowed.includes(value)) result["campaign_" + field] = value;
  }
  return result;
}
export function publicPath(path) {
  const canonical = path.replace(/\/index\.html$/, "/").replace(/([^/])$/, "$1/");
  return pages.has(canonical) ? canonical : null;
}
export function safeReferrer(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    if (url.origin === siteOrigin) return siteOrigin + (publicPath(url.pathname) || "/");
    // Keep common acquisition sources. Subdomains can contain a person's name.
    const known = ["google.com", "google.ca", "google.co.uk", "google.com.au", "google.co.nz", "google.ie", "google.fr", "google.de", "google.at",
      "google.be", "google.es", "google.it", "google.nl", "google.se", "google.no", "google.dk", "google.fi",
      "google.pl", "google.cz", "google.sk", "google.is", "google.com.mt", "google.hr", "google.ee", "google.com.sg", "bing.com", "duckduckgo.com", "search.yahoo.com",
      "linkedin.com", "facebook.com", "instagram.com", "reddit.com", "youtube.com", "t.co", "minddrive.io"];
    const host = known.find(name => url.hostname === name || url.hostname.endsWith("." + name));
    return host ? "https://" + host + "/" : "https://other-referral.invalid/";
  } catch { return ""; }
}
export function eventFields(name, path, referrer, campaign) {
  if (!actions.has(name) || !pages.has(path)) return null;
  const fields = {page_location: siteOrigin + path, page_title: pages.get(path), page_referrer: safeReferrer(referrer)};
  for (const [key, allowed] of Object.entries(campaigns)) {
    const value = campaign?.["campaign_" + key];
    if (allowed.includes(value)) fields["campaign_" + key] = value;
  }
  return fields;
}
