export async function handleTopic(req,res,send,{guard,service,origin,address,secure,hostingCookie=false}) {
  if (req.method !== "POST") return send(405,"POST required","text/plain",{Allow:"POST"});
  const admission=await guard.request({address,cookie:req.headers.cookie,secure,hostingCookie});
  if (admission.cookie) res.setHeader("Set-Cookie",admission.cookie);
  if (!admission.allowed)
    return send(admission.reason==="guard_unavailable" ? 503 : 429,
      JSON.stringify({mode:"local"}),"application/json",{"Retry-After":String(admission.retryAfter)});
  if (req.headers.origin && req.headers.origin!==origin) return send(403,"Same-origin only");
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return send(415,"JSON required");

  const parts=[];
  let size=0;
  for await (const part of req) {
    size+=part.length;
    if (size>512) return send(413,"Input too long");
    parts.push(part);
  }
  let payload;
  try {payload=JSON.parse(Buffer.concat(parts).toString("utf8"));}
  catch {return send(400,"Invalid JSON");}
  const result=await service.classify(payload);
  return result ? send(200,JSON.stringify(result),"application/json") : send(400,"Expected known topics");
}
