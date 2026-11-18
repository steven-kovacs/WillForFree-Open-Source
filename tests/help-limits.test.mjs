import test from "node:test";
import assert from "node:assert/strict";
import {createHelpGuard,cookieIdentity,memoryLimitStore} from "../lib/help-limits.mjs";
import {cloudAlertWriter} from "../lib/help-runtime.mjs";
import {createTopicService} from "../lib/topic.mjs";
import {makeServer} from "../server.mjs";
import {makeHelpBackend} from "../help-backend.mjs";
import {directPeer,networkTickets} from "../lib/network-ticket.mjs";
import {createTopicRequest} from "../public/topic-request.js";
import {QUESTION_LIMIT,replyLimit,shortHelp} from "../public/chat-limits.js";

const key=Buffer.alloc(32,17);
const start=1_800_000_000_000;
const ip="192.0.2.1";
const cookieOf=r=>r.cookie.split(";")[0];

test("the direct frontend issues short-lived opaque tickets and only verified tickets reach the quota store",async()=>{
  let now=start;
  const tickets=networkTickets(key,()=>now);
  assert.equal(directPeer("198.51.100.3, "+ip),ip);
  assert.equal(directPeer(ip+", invalid"),undefined);
  assert.equal(directPeer(undefined),undefined);
  const issued=tickets.issue(ip);
  assert.notEqual(issued,tickets.issue(ip));
  assert.equal(tickets.read(issued),ip);
  assert.equal(networkTickets(Buffer.alloc(32,23),()=>now).read(issued),null);
  now+=120_000;
  assert.equal(tickets.read(issued),null);
  const addresses=[];
  const origin="https://example.invalid";
  const server=makeHelpBackend({origin,tickets,networkSource:"direct-ticket",service:createTopicService(),
    guard:{request({address}){addresses.push(address);return {allowed:true};}}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try {
    const base="http://127.0.0.1:"+server.address().port;
    const get=(source,forwarded)=>fetch(base+"/api/network-ticket",{headers:{origin:source,"x-forwarded-for":forwarded}});
    assert.equal((await get("https://other.invalid",ip)).status,403);
    const proof=await get(origin,"198.51.100.4, "+ip);
    assert.equal(proof.headers.get("set-cookie"),null);
    assert.equal(proof.headers.get("access-control-allow-origin"),origin);
    assert.match(proof.headers.get("cache-control"),/no-store/);
    const ticket=await proof.text();
    for(const [header,expected] of [[ticket,200],[issued,403],["invalid",403]]) {
      const response=await fetch(base+"/api/topic",{method:"POST",headers:{origin,"content-type":"application/json",
        "x-forwarded-for":"198.51.100.3","x-wff-client-ip":"198.51.100.4","x-wff-network-ticket":header},body:'{"topics":["price"]}'});
      assert.equal(response.status,expected);
    }
    assert.deepEqual(addresses,[ip]);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

test("browser network checks omit cookies and topic data, preserve first-party cookies, and respect an opt-out during the check",async()=>{
  const target="https://edge.example.invalid/api/network-ticket";
  const proof=networkTickets(key).issue(ip),calls=[];
  let enabled=true;
  const request=createTopicRequest(target,async(url,options)=>{
    calls.push({url,options});
    if(url===target){enabled=false;return new Response(proof);}
    return Response.json({topic:"signing"});
  });
  await assert.rejects(request(["signing","executor"],"choice",()=>false));
  assert.equal(calls.length,0,"An opt-out must also suppress the network-ticket request");
  await assert.rejects(request(["signing","executor"],"choice",()=>enabled));
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.credentials,"omit");
  assert.equal(calls[0].options.body,undefined);
  assert.equal(calls[0].options.referrerPolicy,"no-referrer");
  enabled=true;
  assert.equal((await request(["signing","executor"],"choice",()=>enabled)).status,200);
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,"/api/topic");
  assert.equal(calls[1].options.credentials,"same-origin");
  assert.equal(calls[1].options.headers["X-Wff-Network-Ticket"],proof);
  assert.deepEqual(JSON.parse(calls[1].options.body),{topics:["signing","executor"],context:"choice"});
});

test("opting out cancels an outstanding ticket before any topic can be sent",async()=>{
  const calls=[], permission=new AbortController();
  const request=createTopicRequest("https://edge.example.invalid/ticket",(url,{signal})=>{
    calls.push(url);
    return new Promise((resolve,reject)=>signal.addEventListener("abort",()=>reject(signal.reason),{once:true}));
  });
  const pending=request(["executor","privacy"],"choice",()=>!permission.signal.aborted,permission.signal);
  permission.abort();
  await assert.rejects(pending,{name:"AbortError"});
  assert.deepEqual(calls,["https://edge.example.invalid/ticket"]);
});

test("anonymous browsers share limits across instances and keep their hour allowance after a restart",async()=>{
  let now=start;const reasons=[];
  const clock=()=>now,store=memoryLimitStore({clock});
  const options={key,clock,store,report:r=>reasons.push(r)};
  const first=createHelpGuard(options);
  const req={address:ip,cookie:cookieOf(await first.request({address:ip}))};
  for(let i=1;i<3;i++)assert.ok((await first.request(req)).allowed);
  let blocked=await createHelpGuard(options).request(req);
  assert.equal(blocked.reason,"browser_minute");assert.equal(blocked.retryAfter,60);
  const other=createHelpGuard(options);
  for(const n of [3,2]){
    now+=60_001;
    for(let i=0;i<n;i++)assert.ok((await other.request(req)).allowed);
  }
  blocked=await first.request(req);
  assert.equal(blocked.reason,"browser_hour");assert.ok(blocked.retryAfter>3400);
  assert.ok((await first.request({address:ip})).allowed);
  now=start+3_600_001;
  assert.ok((await other.request(req)).allowed);
  assert.deepEqual(reasons.sort(),["browser_hour","browser_minute"]);
});

test("fresh cookies share a network fallback, IPv6 aliases share a prefix, and independent networks can continue",async()=>{
  const guard=createHelpGuard({key,clock:()=>start});
  const other="2001:db8:7:8::abc";
  for(let i=0;i<18;i++)assert.ok((await guard.request({address:other})).allowed);
  assert.equal((await guard.request({address:"2001:0db8:0007:0008:1::2"})).reason,"network_minute");
  assert.ok((await guard.request({address:"2001:db8:7:9::1"})).allowed);
  const signed=cookieIdentity(null,key,start,true);
  assert.match(signed.cookie,/HttpOnly; SameSite=Strict; Secure/);
  assert.equal(cookieIdentity(signed.cookie.split(";")[0],key,start).id,signed.id);
  assert.notEqual(cookieIdentity(signed.cookie.replace(signed.id,"A".repeat(22)),key,start).id,signed.id);
  assert.notEqual(cookieIdentity(signed.cookie,key,start+86_400_001).id,signed.id);
});

test("simultaneous calls share the global provider budget and coalesce identical work before reserving",async()=>{
  const clock=()=>start, store=memoryLimitStore({clock});
  const guardA=createHelpGuard({key,clock,store}),guardB=createHelpGuard({key,clock,store});
  let calls=0;
  const classify=createTopicService({key:"test",reserveProvider:guardA.provider,fetcher:async()=>{
    calls++;return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:'{"topic":"signing"}'}]}]})};
  }});
  const input={topics:["signing","executor"],context:"choice"};
  const wave=await Promise.all(Array.from({length:20},()=>classify.classify(input)));
  assert.ok(wave.every(r=>r.topic==="signing"));assert.equal(calls,1);
  assert.equal((await classify.classify(input)).mode,"cached");
  const reservations=await Promise.all(Array.from({length:24},(_,i)=>(i%2?guardA:guardB).provider()));
  assert.equal(reservations.filter(Boolean).length,23);
  assert.equal(await createHelpGuard({key,clock,store}).provider(),false);
});

test("a quota store outage falls back without calling the provider or flooding notifications",async()=>{
  let attempts=0,sent=0;
  const guard=createHelpGuard({key,clock:()=>start,store:{change(){attempts++;throw Error("unavailable");}},report:()=>sent++});
  const result=await guard.request({address:ip});
  assert.equal(result.reason,"guard_unavailable");assert.equal(result.retryAfter,60);
  assert.equal(await guard.provider(),false);
  assert.equal(attempts,1);assert.equal(sent,1);
});

test("failed limit events can be retried during a cached hourly refusal",async()=>{
  let now=start,deliveries=0;
  const clock=()=>now;
  const guard=createHelpGuard({key,clock,store:memoryLimitStore({clock}),report:()=>{
    if(++deliveries===1)throw Error("test transport failure");
  }});
  for(let i=0;i<24;i++)assert.equal(await guard.provider(),true);
  assert.equal(await guard.provider(),false);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(await guard.provider(),false);
  assert.equal(deliveries,1);
  now+=60_001;
  assert.equal(await guard.provider(),false);
  assert.equal(deliveries,2);
});

test("the HTTP route limits all attempts to the helper, supplies an HTTP-only session and keeps the interview available",async()=>{
  const guard=createHelpGuard({key,clock:()=>start});
  const server=makeServer({guard,service:createTopicService()});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const base="http://127.0.0.1:"+server.address().port;
    const post=(data,cookie,extra={})=>fetch(base+"/api/topic",{method:"POST",headers:{"content-type":"application/json",...(cookie?{cookie}:{}),...extra},body:JSON.stringify(data)});
    const input={topics:["signing","executor"]};
    const first=await post(input);assert.equal(first.status,200);
    const cookie=first.headers.get("set-cookie").split(";")[0];
    assert.equal((await post({wrong:true},cookie)).status,400);
    assert.equal((await post({topics:["x".repeat(513)]},cookie)).status,413);
    const blocked=await post(input,cookie,{"x-forwarded-for":"198.51.100.3"});
    assert.equal(blocked.status,429);assert.equal(blocked.headers.get("retry-after"),"60");
    assert.equal((await fetch(base+"/")).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test("cloud limit events contain only an allowlisted reason, and never include cookie, network or chat data",async()=>{
  const entries=[];
  const send=cloudAlertWriter("example-will",async()=>"fixture",{fetcher:async(_,opts)=>{entries.push(JSON.parse(opts.body));return {ok:true};}});
  await send("browser_minute");
  await assert.rejects(()=>send("text typed by a visitor"));
  assert.equal(entries.length,1);
  assert.deepEqual(entries[0].entries,[{severity:"WARNING",jsonPayload:{event:"ai_help_limited",reason:"browser_minute"}}]);
});

test("the private backend uses the Hosting cookie, serves only the helper, and waits for the limit event",async()=>{
  let acknowledge,started;
  const writing=new Promise(resolve=>{started=resolve;});
  const receipt=new Promise(resolve=>{acknowledge=resolve;});
  let writes=0;
  const guard=createHelpGuard({key,clock:()=>start,report:()=>{writes++;started();return receipt;}});
  const origin="https://example.invalid";
  const server=makeHelpBackend({origin,guard,service:createTopicService()});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try {
    const base="http://127.0.0.1:"+server.address().port;
    for(const path of ["/","/partner-portal/","/runtime.json","/api/topic?text=unused"])
      assert.equal((await fetch(base+path)).status,404);
    assert.equal((await fetch(base+"/api/topic")).status,405);
    const post=(cookie,source=origin)=>fetch(base+"/api/topic",{method:"POST",
      headers:{"Content-Type":"application/json",origin:source,...(cookie?{cookie}:{})},
      body:JSON.stringify({topics:["signing"]})});
    const first=await post();
    assert.equal(first.status,200);
    const setCookie=first.headers.get("set-cookie");
    assert.match(setCookie,/^__session=.*; Path=\/api\/topic; Max-Age=86400; HttpOnly; SameSite=Strict; Secure$/);
    const cookie=setCookie.split(";")[0];
    assert.equal((await post(cookie,"https://other.invalid")).status,403);
    assert.equal((await post(cookie)).status,200);
    const pending=[post(cookie),post(cookie)];
    await writing;
    let completed=false;
    const joining=guard.request({address:ip,cookie,secure:true,hostingCookie:true}).then(()=>{completed=true;});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(completed,false);
    assert.equal(writes,1);
    acknowledge();
    await joining;
    for(const response of await Promise.all(pending)) {
      assert.equal(response.status,429);
      assert.equal(response.headers.get("retry-after"),"60");
      assert.match(response.headers.get("cache-control"),/no-store/);
    }
  } finally {acknowledge();await new Promise(resolve=>server.close(resolve));}
});

test("only the configured trusted edge supplies a network identity",async()=>{
  for(const networkSource of ["shared","trusted-edge"]) {
    const addresses=[];
    const guard={request({address}){addresses.push(address);return {allowed:true};}};
    const server=makeHelpBackend({origin:"https://example.invalid",networkSource,guard,service:createTopicService()});
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    try {
      for(const value of [ip,ip+", 198.51.100.5",null]) {
        await fetch("http://127.0.0.1:"+server.address().port+"/api/topic",{method:"POST",
          headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.2",...(value?{"x-wff-client-ip":value}:{})},
          body:'{"topics":["signing"]}'});
      }
      assert.deepEqual(addresses,[networkSource==="trusted-edge"?ip:undefined,undefined,undefined]);
    } finally {await new Promise(resolve=>server.close(resolve));}
  }
});

test("the credential lookup shares the alert write deadline",async()=>{
  let fetches=0;
  const noCredential=new Promise(()=>{});
  const send=cloudAlertWriter("example-will",()=>noCredential,{timeout:25,fetcher:()=>{fetches++;}});
  // AbortSignal's timer is unref'd. Keep this isolated test alive until its assertion settles.
  const keepAlive=setTimeout(()=>{},1000);
  try {await assert.rejects(send("browser_minute"),{name:"TimeoutError"});}
  finally {clearTimeout(keepAlive);}
  assert.equal(fetches,0);
});

test("short questions and replies leave headroom for local notes and lists of names",()=>{
  assert.equal(QUESTION_LIMIT,240);assert.equal(replyLimit({kind:"name"}),240);
  assert.equal(replyLimit({kind:"notes"}),600);assert.equal(replyLimit({kind:"names"}),650);
  assert.equal(shortHelp("Two words."),"Two words.");
  assert.equal(shortHelp("A complete sentence. "+"word ".repeat(80)),"A complete sentence.");
  assert.ok(shortHelp("word ".repeat(80)).split(/\s+/).length<=60);
});
