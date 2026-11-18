import {currentLanguage} from "./locale.js";
const texasForms = [
  "tx-married-children", "tx-married-no-children",
  "tx-single-children", "tx-single-no-children",
];
const editions = new Map();
const maineDigest = "f136d8cb5492dfbeb50e359300bd36b026bf6a1f4bf038e99c44dc0520f7e525";
export const maineFormPath = "/forms/me-statutory.pdf?edition=" + maineDigest;
let maineForm;
let mainePreview;

// An older installation can have a different, valid PDF at this path with no spouse-amount line.
export function loadMaineForm() {
  if (!maineForm) {
    maineForm = (async () => {
      const response = await fetch(maineFormPath, {credentials:"same-origin"});
      if (!response.ok) throw Error("The publisher’s form is unavailable here.");
      const data = await response.arrayBuffer();
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
      const hex = Array.from(digest, byte => byte.toString(16).padStart(2,"0")).join("");
      if (hex !== maineDigest) throw Error("The publisher’s form is unavailable here.");
      return data;
    })().catch(error => {
      maineForm = undefined;
      throw error;
    });
  }
  return maineForm;
}

export async function mainePreviewUrl() {
  const bytes = await loadMaineForm();
  // Reuse one public blank PDF for this page's lifetime, including when the maker edits answers.
  mainePreview ??= URL.createObjectURL(new Blob([bytes], {type:"application/pdf"}));
  return mainePreview;
}

// Request the same set for everyone. Only the browser chooses a form from it.
export function loadTexasForms() {
  const suffix=currentLanguage()==="es" ? "-es" : "";
  if (!editions.has(suffix)) {
    const bundle = Promise.all(texasForms.map(async name => {
      const response = await fetch("/forms/" + name + suffix + ".pdf", {credentials:"same-origin"});
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf"))
        throw Error("A Texas court form is unavailable. Please retry.");
      return [name, await response.arrayBuffer()];
    })).then(entries => new Map(entries)).catch(error => {
      editions.delete(suffix);
      throw error;
    });
    editions.set(suffix,bundle);
  }
  return editions.get(suffix);
}

export async function hasPublisherForm(p) {
  try {
    if (p.route === "official" && p.key === "US-TX") {
      await loadTexasForms();
      return true;
    }
    if (p.route === "statutory" && p.key === "US-ME") {
      await loadMaineForm();
      return true;
    }
    if (p.route !== "official") return true;
    const response = await fetch("/forms/ca-statutory.pdf", {method:"HEAD", credentials:"same-origin"});
    return response.ok && response.headers.get("content-type")?.includes("application/pdf");
  } catch { return false; }
}
