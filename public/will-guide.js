import { currentLanguage, sentence, wording } from "./locale.js";
import { markets, profile, validPlace } from "./markets.js";
import { readHomeLocation, resolveHomeLocation } from "./home-location.js";
import { renderLocalRules } from "./legal-locations.js";
import { guideResources } from "./guide-sources.js";
import { serviceOpen } from "./release.js";
import { downloadLiability, readDownloadTermsLink } from "./download-notice.js";

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
  const after = root.querySelector("[data-after-location]");
  const section = rules || guide || after;
  if (!section) return;

  const terms = root.querySelector("#responsibility");
  const kitFromLink = () => terms && readDownloadTermsLink(location.hash)?.place;
  const confirmed = kitFromLink() || readHomeLocation({confirmedOnly: true});
  if (terms) {
    const kit = confirmed && profile(confirmed);
    const clause = terms.querySelector("[data-download-liability]");
    clause.textContent = downloadLiability(kit);
    clause.hidden = !kit;
    const source = terms.querySelector("[data-download-source]");
    if (kit) {
      const link = sourceLink(sentence("Read the source for {0}", wording(kit.name)), kit.legalSource);
      link.className = "with-arrow";
      source.replaceChildren(link);
    } else {
      const choose = document.createElement("a");
      choose.href = "/#place-chip";
      choose.textContent = "Choose your location";
      source.replaceChildren(choose);
    }
  }
  let place = confirmed || readHomeLocation();
  if (!place && await serviceOpen()) place = await resolveHomeLocation();
  if (!section.isConnected) return;
  place = kitFromLink() || readHomeLocation() || place;
  const jurisdiction = validPlace(place) ? profile(place) : null;
  if (rules) {
    root.querySelector("[data-location-fallback]").hidden = Boolean(jurisdiction);
    renderLocalRules(rules, jurisdiction);
  }
  if (guide) renderWillGuide(root, jurisdiction);
  if (after) {
    const {renderAfterWill} = await import("./after-will.js");
    if (after.isConnected) renderAfterWill(after.closest(".after-guide"), jurisdiction);
  }
}

export function focusDownloadTerms(root, hash) {
  if (hash !== "#responsibility" && !readDownloadTermsLink(hash)) return false;
  const terms = root.querySelector("#responsibility");
  if (!terms) return false;
  terms.querySelector("details").open = true;
  terms.focus({preventScroll: true});
  terms.scrollIntoView({block: "start", behavior: "instant"});
  return true;
}

if (typeof document !== "undefined") {
  const terms = document.getElementById("responsibility");
  if (terms) {
    window.addEventListener("hashchange", () => {
      setupLocationGuidance(document);
      if (location.hash) focusDownloadTerms(document, location.hash);
      else terms.querySelector("details").open = false;
    });
    if (focusDownloadTerms(document, location.hash)) {
      // Loading the kit's language can move the section before the first interaction.
      document.addEventListener("wff:language", () => requestAnimationFrame(() => {
        if (document.activeElement === terms) terms.scrollIntoView({block: "start", behavior: "instant"});
      }), {once: true});
    }
  }
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
