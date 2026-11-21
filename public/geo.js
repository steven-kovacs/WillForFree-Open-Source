import { readHomeLocation, resolveHomeLocation, setHomeLocation } from "./home-location.js";
import { currentLanguage, display, sentence, wording } from "./locale.js";
import { installChoicePicker } from "./choice-picker.js";
import {
  markets,
  regions,
  validPlace,
  placeLabel,
} from "./markets.js";
export { detectLocation } from "./home-location.js";

const firstCountries = ["US", "CA", "GB"];
const regionQuestion = {
  CA: "Which province or territory do you live in?",
  US: "Which state or district do you live in?",
  GB: "Which part of the UK do you live in?",
  AU: "Which state or territory do you live in?",
};

export function locationUI(onSelect, suggest = true) {
  const chip = document.getElementById("place-chip"),
    country = document.getElementById("country"),
    region = document.getElementById("region");
  const dialog = document.getElementById("place-dialog"),
    regionField = document.getElementById("region-field"),
    help = document.getElementById("place-help"),
    cancel = document.getElementById("cancel-place"),
    submit = document.getElementById("use-place");
  let confirmed = false,
    hint, // A completed lookup returns null if it could not suggest a country.
    dialogEdited = false,
    afterSelect = null;

  function fieldPicker(select, prompt) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = select.id + "-picker";
    button.className = "place-picker";
    if (!installChoicePicker(select, button, () => display(prompt))) return () => {};
    const label = select.labels[0];
    label.id = select.id + "-label";
    label.htmlFor = button.id;
    const value = document.createElement("span");
    value.id = select.id + "-value";
    value.dataset.verbatim = "";
    button.setAttribute("aria-labelledby", label.id + " " + value.id);
    button.append(value);
    select.after(button);
    button.addEventListener("click", () => { dialogEdited = true; });
    return text => {
      button.disabled = select.disabled;
      value.textContent = display(text || prompt);
    };
  }
  const paintCountry = fieldPicker(country, "Choose a country");
  const paintRegion = fieldPicker(region, "Choose a region");
  function paintFields() {
    paintCountry(markets[country.value]);
    paintRegion(regions[country.value]?.[region.value]);
  }

  function listCountries() {
    const selected = country.value;
    const collator = new Intl.Collator(currentLanguage());
    const remaining = Object.keys(markets).filter(code => !firstCountries.includes(code));
    remaining.sort((a, b) => collator.compare(display(markets[a]), display(markets[b])));
    const options = [...firstCountries, ...remaining].map(code => new Option(markets[code], code));
    country.replaceChildren(country.options[0], ...options);
    country.value = selected;
    paintFields();
  }
  listCountries();
  document.addEventListener("wff:language", listCountries);

  function updateHelp() {
    let copy = "Choose the country where you live permanently. A network location can be approximate.";
    if (afterSelect && !country.value && hint === null) {
      copy = "We couldn’t find your location automatically. Choose where you live so we can prepare the right will kit for you.";
    } else if (afterSelect && !region.value && regionQuestion[country.value]) {
      copy = regionQuestion[country.value];
    }
    help.textContent = copy;
  }
  const options = (c, preferred = "") => {
    region.replaceChildren(new Option("Choose a region", ""));
    for (const [code, label] of Object.entries(regions[c] || {}))
      region.add(new Option(label, code));
    region.value = preferred;
    regionField.hidden = !regions[c];
    region.disabled = !regions[c];
    submit.disabled = !validPlace({ country: c, region: region.value });
    paintFields();
    updateHelp();
  };
  function paint() {
    const p = readHomeLocation() || hint;
    chip.textContent = p
      ? sentence("{0} ▾", wording(placeLabel(p) || markets[p.country]))
      : "Choose your location ▾";
    chip.setAttribute(
      "aria-label",
      p
        ? sentence("Change location: {0}", wording(placeLabel(p) || markets[p.country]))
        : "Choose your location",
    );
  }
  function fillDialog() {
    const p = readHomeLocation() || hint;
    country.value = p?.country || "";
    options(country.value, p?.region || "");
  }
  function show(next) {
    afterSelect = typeof next === "function" ? next : null;
    dialogEdited = false;
    submit.textContent = afterSelect ? "Start my will" : "Use this location";
    cancel.textContent = afterSelect ? "Back" : "Cancel";
    fillDialog();
    dialog.showModal();
  }
  country.addEventListener("change", () => {
    dialogEdited = true;
    options(country.value);
  });
  region.addEventListener("change", () => {
    dialogEdited = true;
    submit.disabled = !validPlace({
      country: country.value,
      region: region.value,
    });
    paintFields();
    updateHelp();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) afterSelect = null;
  });
  function use(place) {
    const selected = setHomeLocation(place);
    confirmed = true;
    paint();
    onSelect(selected);
  }
  document.getElementById("place-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const place = { country: country.value, region: region.value };
    if (!validPlace(place)) return;
    const next = afterSelect;
    dialog.close();
    use(place);
    if (next) next(place);
  });
  cancel.addEventListener("click", () => dialog.close());
  chip.addEventListener("click", () => show());
  paint();
  if (suggest) resolveHomeLocation().then(place => {
    hint = place;
    paint();
    if (!dialog.open) return;
    if (dialogEdited) updateHelp();
    else fillDialog();
  });
  return {
    show,
    use,
    resetConfirmation() {
      confirmed = false;
      afterSelect = null;
      if (dialog.open) dialog.close();
      paint();
    },
    ensure(next) {
      const selected = readHomeLocation();
      if (confirmed && selected) {
        next(selected);
        return;
      }
      show(next);
    },
  };
}
