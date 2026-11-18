import {display, currentLanguage, languages, sentence, wording} from "./locale.js";
import {markets} from "./places.js";
import {readHomeLocation, resolveHomeLocation} from "./home-location.js";
import {sponsorBrochures} from "./sponsor-brochures.js";

export function brochureFor(place) {
  return place && Object.hasOwn(sponsorBrochures, place.country) ? sponsorBrochures[place.country] : null;
}

function render(card, place) {
  const brochure = brochureFor(place);
  const details = card.querySelector("[data-brochure-details]");
  const link = card.querySelector("[data-brochure-download]");
  const label = link.querySelector("span");
  const size = card.querySelector("[data-brochure-size]");
  link.querySelector("svg").toggleAttribute("hidden", !brochure);
  size.hidden = !brochure;
  if (!brochure) {
    details.textContent = display("Choose your location to see the guide and rates for your country.");
    link.href = "/#place-chip";
    link.removeAttribute("download");
    label.textContent = "Choose your location";
    return;
  }

  const country = document.createElement("a");
  country.href = "/#place-chip";
  country.textContent = display(markets[place.country]);
  country.setAttribute("aria-label", display(sentence("Change location: {0}", wording(markets[place.country]))));
  details.replaceChildren(country, " · " + brochure.currency + " · ");
  brochure.languages.forEach((code, index) => {
    if (index) details.append(" + ");
    const language = document.createElement("span");
    language.lang = code;
    language.textContent = languages[code];
    details.append(language);
  });
  link.href = brochure.href;
  link.download = brochure.href.split("/").at(-1);
  label.textContent = brochure.format === "zip" ? "Download ZIP" : "Download PDF";
  size.textContent = new Intl.NumberFormat(currentLanguage(), {
    style:"unit", unit:"kilobyte", maximumFractionDigits:0,
  }).format(brochure.bytes / 1000);
}

export async function setupSponsorDownload(root) {
  const card = root.querySelector("[data-sponsor-download]");
  if (!card) return;
  const selected = readHomeLocation();
  render(card, selected);
  if (selected) return;
  const detected = await resolveHomeLocation();
  if (card.isConnected) render(card, readHomeLocation() || detected);
}

if (typeof document !== "undefined") {
  void setupSponsorDownload(document);
  document.addEventListener("wff:language", () => void setupSponsorDownload(document));
  window.addEventListener("pageshow", () => void setupSponsorDownload(document));
}
