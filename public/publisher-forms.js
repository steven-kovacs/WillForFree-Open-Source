import {currentLanguage} from "./locale.js";
const texasForms = [
  "tx-married-children", "tx-married-no-children",
  "tx-single-children", "tx-single-no-children",
];
const editions = new Map();

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
    const path = p.route === "official" ? "/forms/ca-statutory.pdf" :
      p.route === "statutory" ? "/forms/me-statutory.pdf" : null;
    if (!path) return true;
    const response = await fetch(path, {method:"HEAD", credentials:"same-origin"});
    return response.ok && response.headers.get("content-type")?.includes("application/pdf");
  } catch { return false; }
}
