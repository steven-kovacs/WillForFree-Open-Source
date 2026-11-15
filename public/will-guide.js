import { currentLanguage, sentence, wording } from "./locale.js";
import { markets, profile, validPlace } from "./markets.js";
import { readHomeLocation, resolveHomeLocation } from "./home-location.js";
import { renderLocalRules } from "./legal-locations.js";
import { guideResources } from "./guide-sources.js";
import { serviceOpen } from "./release.js";

const defaultChildren = "Think about two jobs. Who would you want to care for your children if they needed a guardian? Who would you trust with money you leave them? A will can record your choices where local law allows. A surviving parent’s rights and a court’s decision can affect who cares for a child.";

function sourceLink(label, url) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function renderWillGuide(root, place) {
  const children = root.querySelector("[data-guide-children]");
  const family = root.querySelector("[data-guide-family-sources]");
  const business = root.querySelector("[data-guide-business-source]");
  const sources = place && guideResources(place, currentLanguage());
  children.textContent = sources?.example?.text || defaultChildren;
  family.replaceChildren();
  business.replaceChildren();
  family.hidden = !sources;
  business.hidden = !sources;
  if (!sources) return;
  family.append(sourceLink(sentence("Wills and estates · {0}", wording(place.name)), sources.family));
  if (sources.example) family.append(" · ", sourceLink(sources.example.label, sources.example.href));
  business.append(sourceLink(sentence("Business ownership · {0}", wording(markets[place.country])), sources.business));
}

export async function setupLocationGuidance(root) {
  const rules = root.querySelector("[data-rules-result]");
  const guide = root.querySelector("[data-guide-children]");
  const section = rules || guide;
  if (!section) return;

  let place = readHomeLocation();
  if (!place && await serviceOpen()) place = await resolveHomeLocation();
  if (!section.isConnected) return;
  const jurisdiction = validPlace(place) ? profile(place) : null;
  if (rules) {
    root.querySelector("[data-location-fallback]").hidden = Boolean(jurisdiction);
    renderLocalRules(rules, jurisdiction);
  }
  if (guide) renderWillGuide(root, jurisdiction);
}

if (typeof document !== "undefined") {
  setupLocationGuidance(document);
  if (location.hash === "#privacy") {
    const policy = document.getElementById("privacy");
    if (policy) policy.open = true;
  }
  window.addEventListener("pageshow", event => {
    if (event.persisted) setupLocationGuidance(document);
  });
  document.addEventListener("wff:language", () => setupLocationGuidance(document));
}
