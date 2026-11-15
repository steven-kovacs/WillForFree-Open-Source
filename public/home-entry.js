// Redirect the dedicated portal host before the public page is painted.
if (location.hostname === "partners.willforfree.com") {
  location.replace("/partner-portal/");
} else {
  const root = document.documentElement;
  root.classList.add("preparing-home");
  // Keep informational links usable when the chat bundle or runtime is unavailable.
  const delayed = setTimeout(() => {
    root.classList.replace("preparing-home", "home-loading");
  }, 1600);
  function sizeTranslatedHeadline(title) {
    if (!title.querySelector("br")) return;
    // A visitor can switch languages while the chat or a reading page hides the title.
    const whenVisible = new ResizeObserver(() => {
      if (title.getClientRects().length) requestAnimationFrame(measure);
    });
    function measure() {
      if (root.lang !== "en" && !title.getClientRects().length) {
        whenVisible.observe(title.parentElement);
        return;
      }
      whenVisible.disconnect();
      if (root.lang === "en") return;
      // Measure the longer line at 100px, leaving 1% of its container for rounding.
      title.classList.add("measure-headline");
      const longestLineInEm = title.getBoundingClientRect().width / 100;
      title.classList.remove("measure-headline");
      if (longestLineInEm > 0) title.style.setProperty("--headline-fit", (99 / longestLineInEm) + "cqi");
    }
    document.addEventListener("wff:language", measure);
    document.fonts.addEventListener("loadingdone", measure);
    measure();
  }
  document.addEventListener("wff:home-ready", async () => {
    const fonts = [400, 500, 700, 900].map(weight => document.fonts.load(weight + ' 1em "Reddit Sans"', "Will"));
    const pictures = [...document.querySelectorAll(".mast img, #welcome img")].map(img => img.decode());
    let limit;
    const timeout = new Promise(resolve => {
      limit = setTimeout(() => resolve(false), 2600);
    });
    const artwork = Promise.allSettled([...fonts, ...pictures]).then(results => results.every(r => r.status === "fulfilled"));
    const complete = await Promise.race([artwork, timeout]);
    clearTimeout(limit);
    clearTimeout(delayed);
    if (!complete) root.classList.add("home-lightweight");
    root.classList.remove("preparing-home", "home-loading");
    sizeTranslatedHeadline(document.getElementById("hero-title"));
  }, {once:true});
}
