function checkBrowser(service, id, container) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.className = "contact-check";
    frame.title = "Cloudflare Turnstile";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden","true");
    frame.referrerPolicy = "no-referrer";
    const url = new URL("/check", service);
    url.searchParams.set("origin", location.origin);
    url.searchParams.set("id", id);
    function finish(token) {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      frame.remove();
      if (typeof token === "string" && token.length > 0 && token.length <= 2048) resolve(token);
      else reject(Error("unavailable"));
    }
    function receive(event) {
      if (event.origin === service && event.source === frame.contentWindow &&
          event.data?.type === "wff-contact-check" && event.data.id === id) finish(event.data.token);
    }
    const timer = setTimeout(() => finish(), 20000);
    window.addEventListener("message", receive);
    frame.onerror = () => finish();
    frame.src = url.href;
    container.append(frame);
  });
}

export async function queueContact(input, id, container, fetcher = fetch, verify = checkBrowser) {
  const settings = await fetcher("/contact-service.json", {credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(5000)});
  if (!settings.ok) throw Error("unavailable");
  const {service} = await settings.json();
  if (typeof service !== "string" || new URL(service).protocol !== "https:" || new URL(service).origin !== service) throw Error("unavailable");
  const token = await verify(service, id, container);
  const {kind,email,organization,message} = input;
  const response = await fetcher(service + "/contact", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,token,kind,email,organization,message}),
    credentials:"omit", redirect:"error", referrerPolicy:"no-referrer", signal:AbortSignal.timeout(24000)
  });
  if (response.status !== 204) throw Error(response.status === 400 ? "invalid" : "unavailable");
}
