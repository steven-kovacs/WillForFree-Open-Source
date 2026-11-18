import {languages} from "./locale.js";
import {validPlace} from "./places.js";

// The fragment stays in the browser. It contains no interview answers.
export function readDownloadTermsLink(hash) {
  const match = /^#responsibility\/([A-Z]{2})(?:-([A-Z]{1,3}))?\/([A-Za-z-]+)$/.exec(hash);
  if (!match) return null;
  const place = {country: match[1], region: match[2] || ""};
  return validPlace(place) && Object.hasOwn(languages, match[3]) ? {place, language: match[3]} : null;
}

const regionalLiability = new Map([
  ["CA-QC", "For Québec kits, WillForFree remains responsible for its own acts and those of its representatives as required by law."],
  ["US-NC", "For North Carolina kits, WillForFree does not disclaim any warranty or liability or limit any remedy available under applicable law."],
]);

export function downloadAgreement(profile) {
  return regionalLiability.has(profile.key)
    ? "I accept the terms and will check my kit against local rules."
    : "I accept the terms limiting WillForFree’s liability for kit errors.";
}

export function downloadLiability(profile) {
  if (!profile) return "";
  return regionalLiability.get(profile.key) ?? "Where the law permits, WillForFree excludes liability for the part of a loss caused by inaccurate or incomplete answers you give, changes you make after download, or required steps you miss. The exclusion also covers losses from errors or omissions in the kit or its translation, including those arising from changes in the law, that WillForFree could not reasonably have prevented.";
}

// Keep the reminder in the downloaded guide meaningful after the checkbox is gone.
export function downloadNotice(profile) {
  if (profile.use === "planning" || profile.use === "appointment") {
    return "This kit contains planning notes for a future will. There is no will to sign. Check that the notes record your wishes. You keep your legal rights.";
  }
  if (profile.key === "US-NC") {
    return "Check the North Carolina form and follow its signing instructions. All warranties, rights and remedies available under applicable law are preserved.";
  }
  return "Check your kit against your wishes and current local requirements before you rely on it. You keep every right and remedy the law protects.";
}
