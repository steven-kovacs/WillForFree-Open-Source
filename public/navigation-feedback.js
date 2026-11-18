const root = document.documentElement;

// A control can appear under a stationary pointer after the page or chat changes.
export function navigationLanded() {
  root.setAttribute("data-navigation-landing", "");
}

document.addEventListener("pointerdown", () => root.setAttribute("data-pointer-input", ""), true);
document.addEventListener("pointermove", event => {
  if (event.pointerType !== "touch" && root.hasAttribute("data-navigation-landing")) {
    root.removeAttribute("data-navigation-landing");
  }
}, {capture:true, passive:true});
document.addEventListener("keydown", () => {
  root.removeAttribute("data-pointer-input");
  root.removeAttribute("data-navigation-landing");
}, true);
document.addEventListener("toggle", event => {
  if (event.target.tagName === "DIALOG") navigationLanded();
}, true);
window.addEventListener("pageshow", navigationLanded);
window.addEventListener("hashchange", navigationLanded);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) navigationLanded();
});
