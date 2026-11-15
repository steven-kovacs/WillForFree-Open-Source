// UI language is independent of the jurisdiction the maker confirms.
export const languages = Object.freeze({
  en:"English", fr:"Français", es:"Español", de:"Deutsch", it:"Italiano", nl:"Nederlands",
  da:"Dansk", sv:"Svenska", nb:"Norsk bokmål", fi:"Suomi", is:"Íslenska", pt:"Português",
  et:"Eesti", cs:"Čeština", pl:"Polski", hr:"Hrvatski", sk:"Slovenčina", mt:"Malti", "zh-Hans":"简体中文"
});
export const preferenceKey = "wff-language";
export function detectLanguage(preferences = []) {
  for (const input of preferences) {
    try {
      const loc = new Intl.Locale(input);
      if (loc.language === "zh") { if (loc.maximize().script === "Hans") return "zh-Hans"; continue; }
      if (loc.script && loc.script !== "Latn") continue;
      if (loc.language === "no") return "nb";
      if (Object.hasOwn(languages, loc.language)) return loc.language;
    } catch { /* Try the next browser preference. */ }
  }
  return "en";
}
const catalogCache = new Map();
let catalog = {}, locale = "en", choice = "", revision = 0, generating = 0;
export function duringKit(action) {
  generating++;
  return Promise.resolve().then(action).finally(()=>generating--);
}
export const currentLanguage = () => locale;
export const languagePreference = () => choice;
export function savedLanguage() {
  try {
    const value = localStorage.getItem(preferenceKey);
    return Object.hasOwn(languages,value) ? value : "";
  } catch { return ""; }
}
export async function setLanguage(preference, {remember = true} = {}) {
  if(generating)throw Error("Wait for the download to finish.");
  const explicit = Object.hasOwn(languages,preference) ? preference : "";
  const requested = explicit || detectLanguage(globalThis.navigator?.languages || [globalThis.navigator?.language]);
  const version = ++revision;
  if (requested !== "en" && !catalogCache.has(requested)) {
    catalogCache.set(requested,fetch("/locales/" + requested + ".json",{credentials:"same-origin"})
      .then(response => { if (!response.ok) throw Error("Language download unavailable"); return response.json(); })
      .catch(error => { catalogCache.delete(requested); throw error; }));
  }
  const next = requested === "en" ? {} : await catalogCache.get(requested);
  if (revision !== version) return;
  if (generating)throw Error("Wait for the download to finish.");
  locale = requested; catalog = next; choice = explicit;
  if (remember) try {
    if (explicit) localStorage.setItem(preferenceKey,explicit);
    else localStorage.removeItem(preferenceKey);
  } catch { /* A private tab can still change language. */ }
  if (typeof document !== "undefined") {
    document.documentElement.lang = requested;
    document.dispatchEvent(new CustomEvent("wff:language",{detail:requested}));
  }
}
const tidy = text => text.replace(/\s+/gu," ").trim();
const formatting = new Map();
const marker = Symbol("localize authored substitution");
export const wording = value => ({[marker]:true, value});
// The English spelling is part of saved cash confirmations. Localize only their displayed amount.
export const wholeNumber = number => ({[marker]:true, value:number.toLocaleString("en"), number});
const fill = (pattern, pick) => pattern.replace(/\{(\d+)\}/g,(_,i)=>String(pick(Number(i))));
export function sentence(pattern,...values) {
  // Keep canonical choices and identifiers intact. Only the view resolves these messages.
  const key = fill(pattern,i=> values[i]?.[marker] ? values[i].value : values[i]);
  if (values.length && !values.some(v=>v?.[marker] && v.value===key)) formatting.set(key,{pattern,values});
  return key;
}
export function sourcePattern(value) { return formatting.get(value)?.pattern ?? value; }
export function clearWording() { formatting.clear(); }
export function translatedList(words, separator) {
  return words.reduce((all,word,i) => i ? sentence("{0}"+separator+"{1}",wording(all),wording(word)) : word, "");
}
export function hasCopy(key) { return Object.hasOwn(catalog, key); }
const kitFiles = {
  "00-Start-here.pdf":"Start here", "01-Last-will-and-testament.pdf":"Last will and testament",
  "01-Will-for-formal-completion.pdf":"Last will and testament", "01-Maine-statutory-will.pdf":"Maine statutory family will",
  "01-Official-will-form.pdf":"Last will and testament", "01-Simple-will-form.pdf":"Last will and testament",
  "01-Will-text-to-handwrite.pdf":"Text to copy entirely by hand", "01-My-planning-notes.pdf":"My planning notes",
  "01-Notes-for-my-appointment.pdf":"Notes for my appointment", "02-Local-next-steps.pdf":"Your next steps",
  "02-Signing-and-next-steps.pdf":"Signing and next steps", "03-My-answers.pdf":"Your interview answers",
  "04-Personal-wishes.pdf":"Personal wishes", "05-Business-next-steps.pdf":"Your business and your personal will",
  "Sponsor-offer.pdf":"An offer from our sponsor"
};
export function kitFileName(name) {
  if(locale==="en" || !Object.hasOwn(kitFiles,name))return name;
  const title=catalog[kitFiles[name]];
  if(!title)return name;
  const safe=title.normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"");
  return (name.match(/^\d+-/)?.[0] || "")+safe+".pdf";
}
const fileReferences = text => text.replace(/(?:\d{2}-[A-Za-z-]+|Sponsor-offer)\.pdf/g,kitFileName);
export function display(value, depth=0) {
  if (typeof value !== "string" || locale === "en" || !value || depth>16) return value;
  const record = formatting.get(value);
  if (record) {
    const pattern = catalog[tidy(record.pattern)];
    const replace = i => {
      const part = record.values[i];
      if (!part?.[marker]) return part;
      return typeof part.number === "number" ? part.number.toLocaleString(locale) : display(part.value,depth+1);
    };
    return fill(fileReferences(pattern ? edgeSpaces(record.pattern,pattern) : record.pattern),replace);
  }
  if(Object.hasOwn(kitFiles,value))return kitFileName(value);
  const trimmed=tidy(value);
  if(!Object.hasOwn(catalog,trimmed) && value.trim()!==value && formatting.has(value.trim()))return edgeSpaces(value,display(value.trim(),depth+1));
  const translated = catalog[trimmed];
  return typeof translated === "string" ? edgeSpaces(value,fileReferences(translated)) : fileReferences(value);
}
function edgeSpaces(source, content) {
  return (source.match(/^\s+/u)?.[0] || "") + content + (source.match(/\s+$/u)?.[0] || "");
}
export function editionNotice(place) {
  if (locale === "en" || !place) return "";
  if (place.route === "fixed" || place.route === "statutory")
    return "The blank will is in English. The signing guide is in your chosen language. Use the form only if you understand the entire will.";
  if (place.route !== "official") return "";
  return place.key === "US-TX" && locale === "es" ? "The official Texas form is bilingual in English and Spanish."
    : "The official form is in English. Your signing instructions and interview answers are in your chosen language. Only use the form if you can read and understand all of it.";
}
export function sourceChoice(input,options) {
  if (locale==="en") return null;
  const normalize = v=>String(v).normalize("NFKC").trim().toLocaleLowerCase(locale).replace(/[.!?。！？]+$/u,"");
  const matches = options.filter(option=>normalize(display(option.label))===normalize(input));
  return matches.length && matches.every(o=>o.value===matches[0].value) ? matches[0] : null;
}

export function parseWholeAmount(input) {
  const digits=input.normalize("NFKC").trim();
  if(/^[1-9]\d{0,5}$/.test(digits))return digits;
  const mark=new Intl.NumberFormat(locale,{useGrouping:true}).formatToParts(12345).find(p=>p.type==="group")?.value.normalize("NFKC");
  if(!mark)return null;
  const parts=digits.split(mark);
  return parts.length===2 && /^[1-9]\d{0,2}$/.test(parts[0]) && /^\d{3}$/.test(parts[1]) ? parts.join("") : null;
}
