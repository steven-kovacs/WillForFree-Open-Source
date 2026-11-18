import {publicKitHost} from "./release-target.js";
import {campaignFields, choiceDetails, eventFields, frameOrigin, publicPath, safeReferrer, siteOrigin} from "./traffic-policy.js";

const key = "wff.analytics.v1";
const navKey = "wff.analytics.next";
const lifespan = 180 * 86400000;
let report = () => {};
export function trafficEvent(name) { report(name); }

function setUp(footer) {
  let frame, ready = false, pending = [], previousPath = null, choice;
  let deadline, cleanup = null, freshConsent = false;
  let entryReferrer = safeReferrer(document.referrer);
  // Keep the site's no-referrer policy. Carry only an intentional public link
  // between two full documents in the same consenting tab.
  try {
    const previous = JSON.parse(sessionStorage.getItem(navKey));
    sessionStorage.removeItem(navKey);
    if (previous?.to === publicPath(location.pathname) && publicPath(previous.from) === previous.from &&
        Date.now() - previous.at < 30000 && performance.getEntriesByType("navigation")[0]?.type === "navigate") {
      entryReferrer = siteOrigin + previous.from;
    }
  } catch { /* A visit can still be measured without a referrer. */ }
  const campaign = campaignFields(location.search);
  const gpc = () => navigator.globalPrivacyControl === true;
  const read = () => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };
  const active = () => !gpc() && choice?.expires > Date.now() && !!choice.client;
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "traffic-settings";
  settings.textContent = "Analytics settings";
  footer.querySelector(".footer-nav").append(settings);
  const panel = document.createElement("section");
  panel.id = "analytics-choice";
  settings.setAttribute("aria-controls", panel.id);
  panel.className = "traffic-choice";
  panel.setAttribute("aria-label", "Analytics settings");
  const copy = document.createElement("p");
  copy.textContent = "With your permission, we count visits and will kit downloads to help improve WillForFree. Your answers and messages stay out of Google Analytics.";
  const controls = document.createElement("div");
  controls.className = "traffic-actions";
  const details = document.createElement("div");
  details.id = "analytics-details";
  details.className = "traffic-details";
  for (const text of [choiceDetails, "Google receives your IP address and basic information about your device. It may save cookies in your browser. You can change your choice anytime in Analytics settings at the bottom of the page."]) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    details.append(paragraph);
  }
  const toggleDetails = document.createElement("button");
  toggleDetails.type = "button";
  toggleDetails.className = "traffic-details-button";
  toggleDetails.textContent = "Details";
  toggleDetails.setAttribute("aria-controls", details.id);
  function showDetails(open) {
    details.hidden = !open;
    toggleDetails.setAttribute("aria-expanded", String(open));
  }
  toggleDetails.addEventListener("click", () => showDetails(details.hidden));
  let fromSettings = false;
  function option(text, allow) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outline-btn";
    button.textContent = text;
    button.addEventListener("click", () => {
      const returnFocus = fromSettings;
      const client = allow && !gpc() ? (active() ? choice.client :
        crypto.getRandomValues(new Uint32Array(1))[0] + "." + Math.floor(Date.now()/1000)) : null;
      freshConsent = Boolean(client) && !active();
      const next = {client, expires:Date.now() + lifespan};
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep this page's choice. */ }
      apply(next);
      if (returnFocus) settings.focus({preventScroll:true});
    });
    controls.append(button);
    return button;
  }
  const accept = option("Allow", true), reject = option("No thanks", false);
  controls.append(toggleDetails);
  panel.append(copy, controls, details);
  footer.after(panel);
  settings.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    fromSettings = !panel.hidden;
    showDetails(false);
    settings.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) (active() ? reject : accept).focus({preventScroll:true});
  });

  window.addEventListener("click", event => {
    if (!active() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.origin !== siteOrigin || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const from = publicPath(location.pathname), to = publicPath(link.pathname);
    if (!from || !to || from === to) return;
    try { sessionStorage.setItem(navKey, JSON.stringify({from, to, at:Date.now()})); } catch { /* Optional attribution. */ }
  });
  const pageFocused = () => !document.hidden && document.hasFocus();
  function syncFocus() {
    if (choice && choice.expires <= Date.now()) apply(null);
    if (ready && active()) frame.contentWindow.postMessage({type:"focus", focused:pageFocused()}, frameOrigin);
  }
  window.addEventListener("focus", syncFocus);
  window.addEventListener("blur", syncFocus);
  document.addEventListener("visibilitychange", syncFocus);
  let pageReferrer = entryReferrer;
  report = name => {
    const path = publicPath(location.pathname);
    if (!active() || !frame || !eventFields(name, path, "", campaign)) return;
    if (name === "page_view" && path === previousPath) return;
    if (name === "page_view") pageReferrer = previousPath ? siteOrigin + previousPath : entryReferrer;
    const message = {name, path, referrer:pageReferrer, client:choice.client, campaign, focused:pageFocused(), freshConsent};
    freshConsent = false;
    if (name === "page_view") previousPath = path;
    if (ready) frame.contentWindow.postMessage(message, frameOrigin);
    else if (pending.length < 40) pending.push(message);
  };
  window.addEventListener("message", event => {
    if (event.origin !== frameOrigin || event.source !== frame?.contentWindow || event.data !== "wff:traffic-ready" || !active()) return;
    ready = true;
    for (const message of pending) frame.contentWindow.postMessage(message, frameOrigin);
    pending = [];
  });
  function stopFrame(clearCookies = true) {
    if (!frame) return;
    const retired = frame, channel = new MessageChannel();
    frame = null; ready = false; pending = []; previousPath = null;
    cleanup = new Promise(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        channel.port1.close(); retired.remove(); resolve();
      };
      const timeout = setTimeout(finish, 350);
      channel.port1.onmessage = finish;
      retired.contentWindow.postMessage(clearCookies ? "wff:traffic-stop" : "wff:traffic-replace", frameOrigin, [channel.port2]);
    }).then(() => { cleanup = null; if (active()) apply(choice); });
  }
  function apply(value) {
    // Check current storage before removing an expired identifier. Another tab
    // may already have made a newer choice while this document was suspended.
    if (!value || value.expires <= Date.now()) {
      const stored = read();
      if (stored?.expires > Date.now()) value = stored;
      else if (stored) {
        try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
      }
    }
    if (value?.client && gpc()) {
      value = {client:null, expires:Date.now() + lifespan};
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Respect the signal in memory. */ }
    }
    const previousClient = choice?.client;
    choice = value?.expires > Date.now() ? value : null;
    clearTimeout(deadline);
    if (choice) {
      // A browser timer is limited to a signed 32-bit delay.
      deadline = setTimeout(() => apply(choice), Math.min(choice.expires - Date.now(), 2147483647));
    }
    panel.hidden = Boolean(choice) || gpc();
    fromSettings = false;
    showDetails(false);
    settings.setAttribute("aria-expanded", String(!panel.hidden));
    accept.setAttribute("aria-pressed", String(active()));
    reject.setAttribute("aria-pressed", String(Boolean(choice) && !active()));
    settings.hidden = gpc();
    if (!active()) {
      try { sessionStorage.removeItem(navKey); } catch { /* Optional attribution. */ }
      stopFrame();
      return;
    }
    // A suspended tab can miss the intervening refusal before reading a new grant.
    if (frame && previousClient !== choice.client) stopFrame(false);
    if (!frame && !cleanup) {
      frame = document.createElement("iframe");
      frame.hidden = true;
      frame.title = "Google Analytics";
      frame.referrerPolicy = "no-referrer";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
      frame.src = frameOrigin + "/traffic-frame.html";
      document.body.append(frame);
      report("page_view");
    }
  }
  window.addEventListener("storage", event => { if (!event.key || event.key === key) apply(read()); });
  window.addEventListener("pageshow", event => { if (event.persisted) apply(read()); });
  apply(read());
}
if (typeof window !== "undefined" && window.top === window && location.origin === siteOrigin &&
    location.hostname === publicKitHost && publicPath(location.pathname)) {
  const footer = document.querySelector("footer.foot");
  if (footer) setUp(footer);
}
