import { selectCampaign } from "./sponsor-campaigns.js";

const loopback = host => ["localhost", "127.0.0.1", "[::1]"].includes(host);
const emulator = host => /^127\.0\.0\.1:[1-9]\d{0,4}$/.test(host || "");
const idPattern = /^[a-z][a-z0-9-]{0,59}$/;
let configPromise;
async function jsonFile(path, timeout) {
  const response = await fetch(path, {credentials:"omit", cache:"no-store", redirect:"error", signal:AbortSignal.timeout(timeout)});
  if (!response.ok) throw Error("Service unavailable.");
  return response.json();
}
export function partnerConfig() {
  configPromise ??= jsonFile("/partner-service.json", 3000).then(config => {
    if (!config.apiKey || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId)) throw Error("Reporting is offline.");
    if (loopback(location.hostname)) {
      if (!config.projectId.startsWith("demo-") || !emulator(config.authEmulator) || !emulator(config.firestoreEmulator))
        throw Error("Local reporting needs both emulators.");
    } else if (config.projectId.startsWith("demo-") || config.authEmulator || config.firestoreEmulator) {
      throw Error("Invalid reporting configuration.");
    }
    return config;
  }).catch(error => { configPromise = undefined; throw error; });
  return configPromise;
}
function documents(config) {
  const service = config.firestoreEmulator ? "http://" + config.firestoreEmulator : "https://firestore.googleapis.com";
  const root = "projects/" + config.projectId + "/databases/(default)/documents";
  return {origin: service + "/v1/" + root, root};
}
function failure(status) {
  const message = status === 401 ? "Your session has ended. Please sign in again."
    : status === 403 || status === 404 ? "This account has no partner access. Contact the person who invited you."
    : "Reporting is temporarily unavailable. Please try again.";
  return Object.assign(Error(message), {status:status === 404 ? 403 : status});
}
async function readDocument(config, token, path) {
  const response = await fetch(documents(config).origin + "/" + path, {
    headers:{Authorization:"Bearer " + token}, credentials:"omit", cache:"no-store", redirect:"error",
    referrerPolicy:"no-referrer", signal:AbortSignal.timeout(9000)
  });
  if (!response.ok) throw failure(response.status);
  return (await response.json()).fields;
}
export async function readReport(config, {uid, token}) {
  if (!uid || !token || uid.includes("/")) throw failure(401);
  const member = await readDocument(config, token, "partnerMembers/" + encodeURIComponent(uid));
  const org = member.partner?.stringValue;
  if (member.active?.booleanValue !== true || !idPattern.test(org || "")) throw failure(403);
  const report = await readDocument(config, token, "partnerReports/" + org);
  const today = new Date().toISOString().slice(0,10);
  const rows = report.campaigns?.arrayValue?.values || [];
  const campaigns = await Promise.all(rows.map(async row => {
    const c = row.mapValue.fields, id = c.id.stringValue;
    if (!idPattern.test(id)) throw failure(503);
    const total = await readDocument(config, token, "partnerTotals/" + id);
    const start = c.start.stringValue, end = c.end.stringValue;
    return {title:c.title.stringValue, start, end, areas:c.areas.arrayValue.values.map(area => area.stringValue),
      status:end < today ? "Ended" : c.paused?.booleanValue ? "Paused" : start > today ? "Upcoming" : "Active", downloads:Number(total.downloads.integerValue)};
  }));
  return {name:member.name?.stringValue || "Your organization", campaigns, asOf:new Date().toISOString()};
}
export async function lookupOffer(place) {
  try {
    const catalog = await jsonFile("/sponsor-offers.json", 2200);
    const now = Date.now();
    const offer = selectCampaign(catalog, place, new Date(now).toISOString().slice(0,10));
    if (!offer || !idPattern.test(offer.id)) return null;
    const url = new URL(offer.url);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return {offer, ticket:{campaign:offer.id, receipt:crypto.randomUUID()},
      until:Math.min(now + 900000, Date.parse(offer.end) + 86400000)};
  } catch { return null; }
}
export function confirmationWrites(root, {campaign, receipt}) {
  const document = collection => root + "/" + collection + "/" + campaign;
  return [
    {update:{name:document("partnerReceipts") + "/entries/" + receipt, fields:{accepted:{booleanValue:true}}}, currentDocument:{exists:false}},
    {update:{name:document("partnerCursors"), fields:{receipt:{stringValue:receipt}}}, currentDocument:{exists:true}},
    {transform:{document:document("partnerTotals"),fieldTransforms:[{fieldPath:"downloads",increment:{integerValue:"1"}}]},currentDocument:{exists:true}}
  ];
}
export async function countDownload(ticket) {
  // The browser has already started the ZIP. A retry uses the same one-time receipt.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const config = await partnerConfig(), {origin, root} = documents(config);
      const result = await fetch(origin + ":commit", {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"omit", referrerPolicy:"no-referrer",
        redirect:"error", keepalive:true, signal:AbortSignal.timeout(5000), body:JSON.stringify({writes:confirmationWrites(root,ticket)})
      });
      if (result.ok || (result.status < 500 && ![408,429].includes(result.status))) return;
    } catch { /* Delivery is independent of reporting availability. */ }
  }
}
