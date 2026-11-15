import { networkTicketURL } from "./release-target.js";

// Only the general-topic helper calls this function. The browser keeps the
// opaque, two-minute proof in memory and sends its cookie only to its own site.
export function createTopicRequest(ticketURL = networkTicketURL, fetcher = fetch) {
  let ticket = "", refreshAt = 0;
  return async (topics, context, enabled) => {
    const signal = AbortSignal.timeout(8000);
    const headers = {"Content-Type":"application/json"};
    if (ticketURL) {
      if (!ticket || Date.now() >= refreshAt) {
        const started = Date.now();
        const response = await fetcher(ticketURL, {credentials:"omit", redirect:"error", cache:"no-store", referrerPolicy:"no-referrer", signal});
        if (!response.ok) throw Error("The network allowance is unavailable.");
        const value = await response.text();
        if (!/^[A-Za-z0-9_-]{60,160}$/.test(value)) throw Error("Invalid network ticket.");
        ticket = value;
        refreshAt = started + 90_000;
      }
      headers["X-Wff-Network-Ticket"] = ticket;
    }
    if (!enabled()) throw Error("Remote topic help is off.");
    const response = await fetcher("/api/topic", {method:"POST", credentials:"same-origin", redirect:"error",
      headers, body:JSON.stringify({topics,context}), signal});
    if (response.status === 403) { ticket = ""; refreshAt = 0; }
    return response;
  };
}
