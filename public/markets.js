import { sentence, wording } from "./locale.js";
import {offersSurvival, survivalHelp} from "./survival.js";
import { fixedStates, depositCountries, procedureIntro } from "./procedures.js";
import { evidence } from "./jurisdiction-evidence.js";

import { markets, regions, validPlace } from "./places.js";
export { markets, regions, validPlace } from "./places.js";

const clean = (str) =>
  typeof str === "string"
    ? str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    : "";
const aliases = {
  "US-washingtondc": "DC",
  "US-districtofcolumbia": "DC",
  "CA-newfoundland": "NL",
  "CA-newfoundlandlabrador": "NL",
  "CA-terreneuveetlabrador": "NL",
  "CA-colombiebritannique": "BC",
  "CA-nouveaubrunswick": "NB",
  "CA-nouvelleecosse": "NS",
  "CA-ileduprinceedouard": "PE",
  "CA-territoiresdunordouest": "NT",
  "GB-cymru": "WLS",
  "GB-alba": "SCT",
};
export function suggestion(countryInput, regionInput) {
  let country =
    typeof countryInput === "string" ? countryInput.trim().toUpperCase() : "";
  if (country === "UK") country = "GB";
  if (!Object.hasOwn(markets, country)) return null;
  if (!Object.hasOwn(regions, country)) return { country, region: "" };
  const raw =
    typeof regionInput === "string"
      ? regionInput.trim().replace(new RegExp("^" + country + "[-_]", "i"), "")
      : "";
  const key = clean(raw);
  const region =
    Object.entries(regions[country]).find(
      ([code, name]) => clean(code) === key || clean(name) === key,
    )?.[0] ||
    aliases[country + "-" + key] ||
    "";
  return { country, region };
}
export function placeName(place) {
  return validPlace(place)
    ? regions[place.country]?.[place.region] || markets[place.country]
    : "";
}
export function placeLabel(place) {
  return validPlace(place)
    ? place.region
      ? sentence("{0}, {1}", wording(placeName(place)), wording(markets[place.country]))
      : markets[place.country]
    : "";
}
const manualCountries = new Set([
  "BE",
  "DE",
  "CH",
  "LU",
  "PL",
  "AT",
  "HR",
  "SK",
  "CZ",
]);

export function profile(place) {
  if (!validPlace(place)) throw Error("Choose your home jurisdiction.");
  const { country, region } = place;
  const key = region ? country + "-" + region : country;
  const research = evidence[key];
  const source = research?.source || null;
  let route = "paper";
  if (manualCountries.has(country) || key === "US-LA") route = "handwriting";
  if (depositCountries.has(country)) route = "deposit";
  if (fixedStates.has(key)) route = "fixed";
  if (key === "US-CA" || key === "US-TX") route = "official";
  const parentPlan = ["CA-ON","GB-ENG","GB-WLS"].includes(key);
  const civil =
    manualCountries.has(country) || depositCountries.has(country) ||
    ["FI", "SE", "NO", "EE", "IS", "DK"].includes(country);
  return {
    key,
    country,
    region,
    name: placeName(place),
    label: placeLabel(place),
    legalSource: source,
    rule: research?.rule,
    handRule: research?.handRule,
    caveat: research?.caveat,
    route,
    parentPlan,
    handOption: country === "CA" && !["BC", "PE"].includes(region),
    civil,
    minimum:
      country === "SG"
        ? 21
        : country === "CA" &&
            ["NB", "NL", "NS", "NT", "NU", "YT"].includes(region)
          ? 19
          : 18,
  };
}
export function planDescription(p) {
  if (p.route === "statutory") return "Your kit includes Maine’s unchanged statutory will and its instructions. Fill it in yourself using your own handwriting or a typewriter, including the family choices you select. No names or estate answers are collected for this form.";
  if (p.route === "planning")
    return "You chose private notes. Save what matters to you and the questions you want to resolve before making a will.";
  if (p.route === "fixed") return sentence("Choose our free, fixed simple will form for {0}. Fill in the names on the printed form yourself, then sign with two eligible witnesses. This form leaves the residue to one adult, then a backup. It does not provide for minor children, appoint a guardian or create a trust. Select a different form if you need those provisions.", wording(p.name));
  if (p.route === "deposit") return procedureIntro[p.country];
  if (p.key === "EE") return "Your kit includes an Estonian domestic will for two witnesses. If you are still alive six months after making it, it expires. For a lasting alternative, use a notarial will.";
  if (p.route === "official")
    return "Your kit includes your local will form and its original instructions.";
  if (p.key === "US-PA")
    return "Your kit includes a will to print and sign personally at the end, with Pennsylvania signing instructions.";
  if (p.route === "handwriting")
    return "Your kit includes the wording to copy entirely by hand, with local instructions. Signing a printout alone does not complete this type of will.";
  return sentence("Your kit includes your will to print and local signing instructions.{0}", wording(offersSurvival(p) ? " " + survivalHelp(p) : ""));
}

export const copyByHand = "Write it entirely by hand";
export function executionProfile(jurisdiction, answers) {
  if (
    jurisdiction.handOption &&
    jurisdiction.route === "paper" &&
    answers.execution === copyByHand
  )
    return {
      ...jurisdiction,
      route: "handwriting",
      rule: jurisdiction.handRule,
      legalSource:
        jurisdiction.key === "CA-QC"
          ? "https://www.quebec.ca/en/justice-and-civil-status/wills-estate/wills/forms-will/holograph-will"
          : jurisdiction.legalSource,
    };
  return jurisdiction;
}
