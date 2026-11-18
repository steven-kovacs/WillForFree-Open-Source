import {eventFields, frameOrigin, measurementId, siteOrigin} from "./traffic-policy.js";

// Google's library runs on a different origin and cannot read the interview or contact form.
if (location.origin === frameOrigin && parent !== window) {
  let current, focused = false, since = null, timer, visitedThreshold = false, stopped = false;
  const gtag = function () { window.dataLayer.push(arguments); };
  window.dataLayer = [];
  function clearCookies() {
    // Only the two host-only, path-scoped Analytics cookies belong to this frame.
    for (const name of ["wff_ga", "wff_ga_" + measurementId.slice(2)]) {
      document.cookie = name + "=; Max-Age=0; Path=/traffic-frame.html; SameSite=Strict; Secure";
    }
  }
  function elapsed() {
    if (since === null) return 0;
    const now = performance.now();
    const duration = Math.min(1800000, Math.round(now - since));
    since = now;
    return duration;
  }
  function flush() {
    const ms = elapsed();
    if (!stopped && current && ms >= 1000) {
      gtag("event", "page_engagement", {...current, engagement_time_msec:ms, send_to:measurementId});
    }
  }
  // A hidden frame never receives keyboard focus. Measure the public page's focus
  // and the tab's visibility, including a single reading milestone per page.
  function syncFocus() {
    if (stopped || !current || !focused || document.hidden) {
      flush();
      clearTimeout(timer);
      since = null;
    } else if (since === null) {
      since = performance.now();
      if (!visitedThreshold) timer = setTimeout(() => {
        if (focused && !document.hidden && !stopped) { visitedThreshold = true; flush(); }
      }, 11000);
    }
  }
  document.addEventListener("visibilitychange", syncFocus);
  window.addEventListener("pagehide", () => { focused = false; syncFocus(); });
  window.addEventListener("message", event => {
    if (event.origin !== siteOrigin || event.source !== parent) return;
    const message = event.data;
    if (message === "wff:traffic-stop" || message === "wff:traffic-replace") {
      stopped = true;
      window["ga-disable-" + measurementId] = true;
      clearTimeout(timer);
      if (message === "wff:traffic-stop") clearCookies();
      event.ports[0]?.postMessage("stopped");
      return;
    }
    if (stopped || navigator.globalPrivacyControl === true || !message) return;
    if (message.type === "focus" && typeof message.focused === "boolean") {
      focused = message.focused;
      syncFocus();
      return;
    }
    if (!/^\d{1,10}\.\d{10}$/.test(message.client || "")) return;
    const fields = eventFields(message.name, message.path, message.referrer, message.campaign);
    if (!fields) return;
    if (!current) {
      if (message.freshConsent) clearCookies();
      gtag("consent", "default", {analytics_storage:"granted", ad_storage:"denied", ad_user_data:"denied", ad_personalization:"denied"});
      // Set defaults before Google initializes its destination, including the automatic events.
      gtag("set", {...fields, send_page_view:false, client_id:message.client,
        allow_google_signals:false, allow_ad_personalization_signals:false,
        cookie_prefix:"wff", cookie_path:"/traffic-frame.html", cookie_domain:"none",
        cookie_flags:"SameSite=Strict;Secure", cookie_expires:15552000, cookie_update:false});
      gtag("js", new Date());
      gtag("config", measurementId, {send_page_view:false});
      const tag = document.createElement("script");
      tag.async = true;
      tag.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
      document.head.append(tag);
    } else {
      if (message.name === "page_view") {
        flush(); clearTimeout(timer); since = null; visitedThreshold = false;
      }
      gtag("set", fields);
    }
    current = fields;
    focused = message.focused === true;
    syncFocus();
    const ms = elapsed();
    gtag("event", message.name, {...fields, ...(ms ? {engagement_time_msec:ms} : {}), send_to:measurementId});
  });
  parent.postMessage("wff:traffic-ready", siteOrigin);
}
