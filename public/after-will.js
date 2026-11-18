import { currentLanguage, sentence, wording } from "./locale.js";
import { afterCareExample, afterWillReading } from "./after-will-sources.js";

export function renderAfterWill(root, place) {
  const locationTitle = root.querySelector("[data-after-place]");
  const note = root.querySelector("[data-after-place-note]");
  const picker = root.querySelector("[data-after-picker]");
  locationTitle.textContent = place
    ? sentence("Reading for {0}", wording(place.label))
    : "Find guidance for your area";
  note.textContent = place
    ? "The links on the cards follow your home location. Check the local requirements before you use a form."
    : "Choose your location on the home page to see relevant reading. The names of documents and what they can do vary by location.";
  picker.textContent = place ? "Change location" : "Choose your location";

  const example = root.querySelector("[data-after-care-example]");
  example.textContent = afterCareExample(place);
  example.hidden = !example.textContent;
  root.querySelector("[data-after-us-trust]").hidden = place?.country !== "US";

  const reading = afterWillReading(place, currentLanguage());
  for (const list of root.querySelectorAll("[data-after-sources]")) {
    const rows = reading.filter(source => source.topic === list.dataset.afterSources);
    list.replaceChildren(...rows.map(({label, publisher, url}) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "with-arrow";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = sentence("{0} · {1}", wording(label), publisher);
      link.setAttribute("aria-label", sentence("Source for {0}: {1}", wording(label), publisher));
      li.append(link);
      return li;
    }));
    list.hidden = !rows.length;
  }
}
