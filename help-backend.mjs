import http from "node:http";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { runtimeHelpGuard } from "./lib/help-runtime.mjs";
import { handleTopic } from "./lib/topic-http.mjs";
import { createTopicService } from "./lib/topic.mjs";
import { directPeer, networkTickets } from "./lib/network-ticket.mjs";

// Cloud Run terminates TLS. Its socket peer and arbitrary forwarding chains are not visitor identities.
export function makeHelpBackend({guard,service,origin,networkSource="shared",tickets}) {
  const site=new URL(origin);
  if (site.protocol!=="https:" || site.origin!==origin) throw Error("Set one HTTPS consumer origin.");
  if (!["shared","trusted-edge","direct-ticket"].includes(networkSource)) throw Error("Unknown help network source.");
  if (networkSource==="direct-ticket" && !tickets) throw Error("Configure direct network tickets.");
  return http.createServer(async (req,res)=>{
    const send=(status,body,type="text/plain; charset=utf-8",headers={})=>{
      res.writeHead(status,{"Content-Type":type,"Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff",...headers});
      res.end(req.method==="HEAD" ? undefined : body);
    };
    if (networkSource==="direct-ticket" && req.url==="/api/network-ticket") {
      if (req.method!=="GET") return send(405,"GET required","text/plain",{Allow:"GET"});
      if (req.headers.origin!==origin) return send(403,"Consumer origin required");
      const peer=directPeer(req.headers["x-forwarded-for"]);
      if (!peer) return send(503,"Connection unavailable");
      return send(200,tickets.issue(peer),"text/plain",{"Access-Control-Allow-Origin":origin,Vary:"Origin"});
    }
    if (req.url!=="/api/topic") return send(404,"Not found");
    let address;
    if (networkSource==="trusted-edge") address=req.headers["x-wff-client-ip"];
    if (networkSource==="direct-ticket" && req.method==="POST") {
      address=tickets.read(req.headers["x-wff-network-ticket"]);
      if (!address || req.headers.origin!==origin) return send(403,"A fresh network ticket and consumer origin are required");
    }
    try {
      await handleTopic(req,res,send,{guard,service,origin,secure:true,hostingCookie:true,
        address:typeof address==="string" && isIP(address) ? address : undefined});
    } catch {
      send(503,JSON.stringify({mode:"local"}),"application/json",{"Retry-After":"60"});
    }
  });
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {NODE_ENV,OPENAI_API_KEY,WFF_HELP_PROJECT,WFF_HELP_ORIGIN,WFF_HELP_NETWORK_SOURCE,PORT="8080"}=process.env;
  if (NODE_ENV!=="production" || !OPENAI_API_KEY?.trim() || !WFF_HELP_PROJECT)
    throw Error("Configure the private backend's provider credentials and shared quota store.");
  const port=Number(PORT);
  if (!Number.isInteger(port) || port<1 || port>65535) throw Error("Invalid backend port.");
  const guard=runtimeHelpGuard();
  const service=createTopicService({key:OPENAI_API_KEY,reserveProvider:guard.provider});
  const tickets=WFF_HELP_NETWORK_SOURCE==="direct-ticket" ? networkTickets(process.env.WFF_HELP_SIGNING_SECRET) : undefined;
  makeHelpBackend({guard,service,origin:WFF_HELP_ORIGIN,networkSource:WFF_HELP_NETWORK_SOURCE,tickets}).listen(port,"0.0.0.0");
}
