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
  function sizeHeadline(title) {
    if (!title.querySelector("br")) return;
    const desktop = matchMedia("(min-width: 901px)");
    const footer = document.querySelector(".foot");
    let textChanged = true;
    function measure() {
      if (!desktop.matches && !textChanged && !title.style.fontSize) return;
      if (!title.getClientRects().length) return; // Retry when the visitor returns from chat or a guide.
      // Start at the design size so a taller window or a shorter translation can grow back.
      title.style.removeProperty("font-size");
      if (textChanged && root.lang !== "en") {
        // Measure the longer line at 100px, leaving 1% of its container for rounding.
        title.classList.add("measure-headline");
        const longestLineInEm = title.getBoundingClientRect().width / 100;
        title.classList.remove("measure-headline");
        if (longestLineInEm > 0) title.style.setProperty("--headline-fit", (99 / longestLineInEm) + "cqi");
      }
      textChanged = false;
      if (!desktop.matches) return;
      const overflow = footer.getBoundingClientRect().bottom + scrollY - root.clientHeight;
      if (overflow > 0) {
        const natural = parseFloat(getComputedStyle(title).fontSize);
        const height = title.getBoundingClientRect().height;
        const fit = natural * (height - Math.ceil(overflow)) / height;
        // Take just the overflowing height out of the two lines. Allow normal scrolling
        // if the window is too short to keep the headline readable.
        title.style.fontSize = `min(${natural}px, max(2rem, ${fit}px))`;
      }
    }
    // ResizeObserver runs before paint. Deferring its work to another frame
    // would show the old size for a frame when the surrounding copy wraps.
    const surrounding = new ResizeObserver(measure);
    for (const node of document.querySelectorAll(".mast, #info-status, #place-chip, .hero-lead, .welcome .promises, .hero-chat, .foot")) {
      surrounding.observe(node);
    }
    // A guide can change the language or window size while the home is hidden.
    // Refit in the same turn that restores it, before its first visible frame.
    new MutationObserver(measure).observe(title.closest("#welcome"), {attributes:true, attributeFilter:["hidden"]});
    window.addEventListener("resize", measure);
    window.addEventListener("pageshow", measure);
    const remeasureText = () => { textChanged = true; measure(); };
    document.addEventListener("wff:language", remeasureText);
    document.fonts.addEventListener("loadingdone", remeasureText);
    measure();
  }
  document.addEventListener("wff:home-ready", async () => {
    const copy = [...document.querySelectorAll(".mast nav > a, #welcome, .foot")].map(node => node.textContent).join(" ");
    const fonts = [400, 500, 700, 900].map(weight => document.fonts.load(weight + ' 1em "Reddit Sans"', copy));
    const pictures = [...document.querySelectorAll(".mast img")].map(img => img.decode());
    for (const frame of document.querySelectorAll("#welcome .scrap")) {
      const portrait = getComputedStyle(frame, "::before").backgroundImage.match(/^url\("([^"]+)"\)$/)?.[1];
      if (!portrait) continue;
      const image = new Image();
      image.src = portrait;
      pictures.push(image.decode());
    }
    let limit;
    const timeout = new Promise(resolve => {
      limit = setTimeout(() => resolve(false), 2600);
    });
    const artwork = Promise.allSettled([...fonts, ...pictures]).then(results => results.every(r => r.status === "fulfilled"));
    const complete = await Promise.race([artwork, timeout]);
    clearTimeout(limit);
    clearTimeout(delayed);
    if (!complete) root.classList.add("home-lightweight");
    // The slow-load view uses display:none on the hero. Put it back into layout
    // under visibility:hidden so the very first paint uses its fitted size.
    root.classList.replace("home-loading", "preparing-home");
    try { sizeHeadline(document.getElementById("hero-title")); }
    finally { root.classList.remove("preparing-home"); }
  }, {once:true});
}
