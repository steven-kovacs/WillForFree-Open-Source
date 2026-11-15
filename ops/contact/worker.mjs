// Only this contact service can create mail in the private relay's Firestore queue.
const verificationURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const requestIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const action = "contact";

function reply(status, origin, body = null, extra = {}) {
  return new Response(body, {status, headers:{
    "Cache-Control":"no-store", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff",
    "Access-Control-Allow-Origin":origin, "Vary":"Origin", ...extra
  }});
}

function contactFields(input) {
  const {kind,email,organization,message} = input;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@<>,;:"\\\p{Cc}]+@[a-z0-9.-]+\.[a-z]{2,63}$/iu.test(email) ||
      typeof message !== "string" || !message.trim() || message.length > 1800 ||
      typeof organization !== "string" || organization.length > 120 || /[\r\n]/.test(organization)) return null;
  if (!(kind === "support" && organization === "" || kind === "sponsor" && organization.trim())) return null;
  return Object.fromEntries(Object.entries({kind,email,organization,message}).map(([key,value])=>[key,{stringValue:value}]));
}

async function enqueue(env, id, fields, fetcher) {
  const auth = await fetcher("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + encodeURIComponent(env.FIREBASE_API_KEY), {
    method:"POST", headers:{"Content-Type":"application/json"}, signal:AbortSignal.timeout(6000),
    body:JSON.stringify({email:env.WRITER_EMAIL,password:env.WRITER_PASSWORD,returnSecureToken:true})
  });
  if (!auth.ok) return false;
  const {idToken,localId} = await auth.json();
  if (!idToken || localId !== "willforfree-contact-writer") return false;
  const database = "projects/" + env.FIREBASE_PROJECT + "/databases/(default)/documents";
  const write = {update:{name:database + "/contactInbox/" + id, fields}, currentDocument:{exists:false},
    updateTransforms:[{fieldPath:"createdAt",setToServerValue:"REQUEST_TIME"}]};
  const result = await fetcher("https://firestore.googleapis.com/v1/" + database + ":commit", {
    method:"POST", headers:{"Authorization":"Bearer " + idToken,"Content-Type":"application/json"},
    signal:AbortSignal.timeout(6000), body:JSON.stringify({writes:[write]})
  });
  return result.ok || (result.status === 409 && (await result.json()).error?.status === "ALREADY_EXISTS");
}

// Run the third-party widget on its own origin. Its frame receives only a random request ID.
const frameScript = `const {parentOrigin,id,sitekey} = document.body.dataset;
const finish = token => parent.postMessage({type:"wff-contact-check",id,token},parentOrigin);
window.wffContactReady = () => {
  try {
    window.turnstile.render("#check",{sitekey,action:"contact",cData:id,retry:"never",
      "response-field":false,callback:finish,"error-callback":()=>{finish("");return true;},
      "expired-callback":()=>finish(""),"timeout-callback":()=>finish("")});
  } catch { finish(""); }
};
const script = document.createElement("script");
script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=wffContactReady";
script.onerror = () => finish("");
document.head.append(script);`;

async function handleContact(request, env) {
  const url = new URL(request.url);
  const origins = (env.CONTACT_ORIGINS || "").split(",").filter(Boolean);
  const origin = request.headers.get("Origin");
  if (request.method === "GET" && url.pathname === "/widget.js") {
    return reply(200,"null",frameScript,{"Content-Type":"text/javascript; charset=utf-8"});
  }
  if (request.method === "GET" && url.pathname === "/check") {
    const parentOrigin = url.searchParams.get("origin"), id = url.searchParams.get("id");
    if (!origins.includes(parentOrigin) || !requestIdPattern.test(id) || !/^[a-zA-Z0-9_-]+$/.test(env.TURNSTILE_SITE_KEY || "")) return reply(403,"null");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Contact verification</title></head><body data-parent-origin="${parentOrigin}" data-id="${id}" data-sitekey="${env.TURNSTILE_SITE_KEY}"><div id="check"></div><script src="/widget.js"></script></body></html>`;
    return reply(200,parentOrigin,html,{"Content-Type":"text/html; charset=utf-8",
      "Content-Security-Policy":`default-src 'none'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'unsafe-inline'; frame-ancestors ${parentOrigin}; base-uri 'none'; form-action 'none'`});
  }
  if (url.pathname !== "/contact") return reply(404,"null");
  if (!origins.includes(origin)) return reply(403,"null");
  if (request.method === "OPTIONS") return reply(204, origin, null, {"Access-Control-Allow-Methods":"POST","Access-Control-Allow-Headers":"Content-Type"});
  if (request.method !== "POST") return reply(405,origin,null,{Allow:"POST, OPTIONS"});
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("Content-Type") || "")) return reply(415,origin);
  // Browsers set Content-Length for this JSON request. Bound the stream for every caller.
  const reader = request.body?.getReader();
  if (!reader) return reply(400,origin);
  const decoder = new TextDecoder();
  let raw = "", size = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return reply(413,origin); }
      raw += decoder.decode(value,{stream:true});
    }
    raw += decoder.decode();
  } catch { return reply(400,origin); }
  let input;
  try { input = JSON.parse(raw); } catch { return reply(400,origin); }
  if (typeof input?.id !== "string" || !requestIdPattern.test(input.id)) return reply(400,origin);
  const fields = contactFields(input);
  if (!fields) return reply(400,origin);
  if (typeof input.token !== "string" || !input.token || input.token.length > 2048) return reply(403,origin);
  if (!env.TURNSTILE_SECRET) return reply(503,origin);
  try {
    const check = await fetch(verificationURL,{method:"POST",signal:AbortSignal.timeout(8000),
      body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:input.token})});
    if (!check.ok) return reply(503,origin);
    const verified = await check.json();
    if (verified.success !== true || verified.hostname !== url.hostname || verified.action !== action || verified.cdata !== input.id) return reply(403,origin);
    if (!env.WRITER_PASSWORD) return reply(503,origin);
    return reply(await enqueue(env,input.id,fields,fetch) ? 204 : 503,origin);
  } catch { return reply(503,origin); }
}

export default {fetch:handleContact};
