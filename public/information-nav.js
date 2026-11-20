import {trafficEvent} from "./traffic.js";
import { focusDownloadTerms } from "./will-guide.js";
import { navigationLanded } from "./navigation-feedback.js";
import { cloneOriginal } from "./language-menu.js";

// Same-document navigation keeps an unfinished will and its text field in memory.
// The URL and browser history contain only public page paths and the AI preference.
const pages = new Set(["/why-do-i-need-a-will/", "/why-do-i-need-a-will/after-the-will/", "/our-mission/", "/free-and-private/", "/partners/", "/partners/brief/", "/partners/ideas/", "/fine-print/", "/open-source/"]);

export function setUpInformationNavigation({main, welcome, panel, isHome, confirmReset, disableAI, setupContent, readingChanged}) {
  const mast = document.querySelector(".mast nav");
  const homeLinks = [...mast.children];
  const footer = document.querySelector(".footer-nav");
  const status = document.getElementById("info-status");
  const homeTitle = cloneOriginal(document.querySelector("title")).textContent;
  const pageHead = 'meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]';
  const homeHead = [...document.head.querySelectorAll(pageHead)];
  const cache = new Map();
  let mounted = null;
  let version = 0;
  let returning = false;
  let returnHash = "";
  let originFocus = null;

  function replacePageHead(nodes) {
    for (const node of document.head.querySelectorAll(pageHead)) node.remove();
    document.head.append(...nodes);
  }

  function backToChat(hash = "") {
    const depth = history.state?.wffPageDepth;
    if (Number.isSafeInteger(depth) && depth > 0 && !returning) {
      returning = true;
      returnHash = hash;
      history.go(-depth);
    }
  }

  function showBase(explicitReturn = false) {
    if (!mounted) return;
    mounted.remove();
    mounted = null;
    mast.replaceChildren(...homeLinks);
    for (const link of footer.querySelectorAll("[aria-current]")) link.removeAttribute("aria-current");
    document.title = homeTitle;
    replacePageHead(homeHead);
    trafficEvent("page_view");
    welcome.hidden = !isHome();
    panel.hidden = isHome();
    readingChanged(false);
    navigationLanded();
    window.scrollTo({top:0, behavior:"instant"});
    if (explicitReturn || !originFocus?.isConnected) {
      const destination = isHome() ? welcome.querySelector("h1") : panel;
      destination.tabIndex = -1;
      destination.focus({preventScroll:true});
    } else {
      originFocus.focus({preventScroll:true});
      if (originFocus.closest(".home-kit")) originFocus.scrollIntoView({block:"nearest",behavior:"instant"});
    }
    if (returnHash === "#place-chip" && isHome()) document.getElementById("place-chip").click();
    returnHash = "";
  }

  async function getPage(path) {
    if (cache.has(path)) return cache.get(path);
    const response = await fetch(path, {credentials:"same-origin"});
    if (!response.ok) throw Error("Page unavailable");
    const html = new DOMParser().parseFromString(await response.text(), "text/html");
    const content = html.querySelector("main[data-info-page]");
    const navigation = html.querySelector(".mast nav");
    if (!content || !navigation) throw Error("Page unavailable");
    const page = {content, navigation, title:html.title, head:[...html.head.querySelectorAll(pageHead)]};
    cache.set(path, page);
    return page;
  }

  function focusSection(section, hash) {
    navigationLanded();
    if (focusDownloadTerms(section, hash)) return;
    const id = CSS.escape(hash.slice(1));
    const target = id && (section.querySelector("#" + id) || section.querySelector(`a[name="${id}"]`)?.closest("section[id]"));
    if (target) {
      if (target.tagName === "DETAILS") target.open = true;
      const focus = target.querySelector("summary, h2, h3") || target;
      if (focus.tagName !== "SUMMARY") focus.tabIndex = -1;
      focus.focus({preventScroll:true});
      target.scrollIntoView({block:"start",behavior:"instant"});
      return;
    }
    const heading = section.querySelector("h1");
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    window.scrollTo({top:0, behavior:"instant"});
  }

  async function navigate(url, trigger, push) {
    const current = ++version;
    status.hidden = true;
    try {
      const page = await getPage(url.pathname);
      if (current !== version) return;
      if (!mounted && push) {
        originFocus = trigger?.closest(".mobile-navigation")?.querySelector("summary") || trigger;
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
      replacePageHead(page.head.map(node => node.cloneNode(true)));
      setupContent(section, url.pathname);
      trafficEvent("page_view");
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
      backToChat(url.hash);
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
    const explicitReturn = returning;
    returning = false;
    version++;
    status.hidden = true;
    if (pages.has(location.pathname)) void navigate(new URL(location.href),null,false);
    else showBase(explicitReturn);
  });

  return function clearInfoOnRestore() {
    version++;
    returning = false;
    status.hidden = true;
    showBase();
    if (pages.has(location.pathname)) void navigate(new URL(location.href),null,false);
  };
}
