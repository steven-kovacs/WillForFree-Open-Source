// Same-document navigation keeps an unfinished will and its text field in memory.
// The URL and browser history contain only public page paths and the AI preference.
const pages = new Set(["/why-do-i-need-a-will/", "/free-and-private/", "/partners/", "/partners/brief/", "/partners/ideas/", "/fine-print/", "/open-source/"]);

export function setUpInformationNavigation({main, welcome, panel, isHome, confirmReset, disableAI, setupContent, readingChanged}) {
  const mast = document.querySelector(".mast nav");
  const homeLinks = [...mast.children];
  const footer = document.querySelector(".footer-nav");
  const status = document.getElementById("info-status");
  const homeTitle = "WillForFree — A little chat about your will";
  const cache = new Map();
  let mounted = null;
  let version = 0;
  let returning = false;
  let originFocus = null;
  let originScroll = 0;

  function backToChat() {
    const depth = history.state?.wffPageDepth;
    if (Number.isSafeInteger(depth) && depth > 0 && !returning) {
      returning = true;
      history.go(-depth);
    }
  }

  function showBase() {
    if (!mounted) return;
    mounted.remove();
    mounted = null;
    readingChanged(false);
    mast.replaceChildren(...homeLinks);
    for (const link of footer.querySelectorAll("[aria-current]")) link.removeAttribute("aria-current");
    document.title = homeTitle;
    welcome.hidden = !isHome();
    panel.hidden = isHome();
    window.scrollTo({top:originScroll, behavior:"instant"});
    if (originFocus?.isConnected) originFocus.focus({preventScroll:true});
  }

  async function getPage(path) {
    if (cache.has(path)) return cache.get(path);
    const response = await fetch(path, {credentials:"same-origin"});
    if (!response.ok) throw Error("Page unavailable");
    const html = new DOMParser().parseFromString(await response.text(), "text/html");
    const content = html.querySelector("main[data-info-page]");
    const navigation = html.querySelector(".mast nav");
    if (!content || !navigation) throw Error("Page unavailable");
    const page = {content, navigation, title:html.title};
    cache.set(path, page);
    return page;
  }

  function focusSection(section, hash) {
    const id = hash.slice(1);
    const target = id && section.querySelector("#" + CSS.escape(id));
    if (target) {
      if (target.tagName === "DETAILS") target.open = true;
      const focus = target.querySelector("summary, h2") || target;
      if (focus.tagName !== "SUMMARY") focus.tabIndex = -1;
      focus.focus({preventScroll:true});
      target.scrollIntoView({block:"start",behavior:"instant"});
      return;
    }
    window.scrollTo({top:0, behavior:"instant"});
    const heading = section.querySelector("h1");
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
  }

  async function navigate(url, trigger, push) {
    const current = ++version;
    status.hidden = true;
    try {
      const page = await getPage(url.pathname);
      if (current !== version) return;
      if (!mounted && push) {
        originFocus = trigger?.closest(".mobile-navigation")?.querySelector("summary") || trigger;
        originScroll = window.scrollY;
      }
      if (push) {
        const depth = Number(history.state?.wffPageDepth || 0) + 1;
        history.pushState({wffPageDepth:depth}, "", url.pathname + url.hash);
      }
      mounted?.remove();
      const section = document.createElement("section");
      section.className = page.content.className;
      section.dataset.infoView = "";
      const copy = page.content.cloneNode(true);
      section.append(...copy.childNodes);
      main.append(section);
      mounted = section;
      readingChanged(true);
      welcome.hidden = true;
      panel.hidden = true;
      mast.replaceChildren(...page.navigation.cloneNode(true).children);
      for (const link of footer.querySelectorAll("a")) {
        if (link.pathname === url.pathname) link.setAttribute("aria-current","page");
        else link.removeAttribute("aria-current");
      }
      for (const link of section.querySelectorAll('a[href^="https:"]')) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      document.title = page.title;
      setupContent(section, url.pathname);
      focusSection(section,url.hash);
    } catch {
      if (current !== version) return;
      status.textContent = "This page couldn’t be opened. Your chat is still here. Try the link again.";
      status.hidden = false;
    }
  }

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;

    if (mounted && url.pathname === "/") {
      event.preventDefault();
      if (link.hasAttribute("data-no-ai")) disableAI();
      backToChat();
    } else if (pages.has(url.pathname)) {
      event.preventDefault();
      if (mounted && location.pathname === url.pathname && location.hash === url.hash) {
        focusSection(mounted,url.hash);
        return;
      }
      void navigate(url,link,true);
    } else if (!mounted && !isHome() && link.classList.contains("brand")) {
      event.preventDefault();
      confirmReset();
    }
  });
  window.addEventListener("popstate", () => {
    returning = false;
    version++;
    status.hidden = true;
    if (pages.has(location.pathname)) void navigate(new URL(location.href),null,false);
    else showBase();
  });

  return function clearInfoOnRestore() {
    version++;
    returning = false;
    status.hidden = true;
    showBase();
    if (pages.has(location.pathname)) void navigate(new URL(location.href),null,false);
  };
}
