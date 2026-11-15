import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import vm from "node:vm";
import {queueContact} from "../public/contact-api.js";
import worker from "../ops/contact/worker.mjs";

const relaySource = await readFile(new URL("../ops/contact/Code.gs",import.meta.url), "utf8");
const support = {kind:"support", email:"tester@example.org", organization:"", message:"A question about a download."};

const service = "https://contact.example.org";
const origin = "https://www.example.org";
const env = {CONTACT_ORIGINS:origin, TURNSTILE_SITE_KEY:"public-example-key", TURNSTILE_SECRET:"test-secret",
  FIREBASE_PROJECT:"example-wills", FIREBASE_API_KEY:"test-public-key", WRITER_EMAIL:"writer@example.invalid", WRITER_PASSWORD:"test-only"};

test("the client verifies each attempt and sends only the contact fields, a token and a stable request ID", async () => {
  const id = randomUUID(), tokens = [], requests = [];
  const fetcher = async (url, options) => {
    if (url === "/contact-service.json") return Response.json({service});
    assert.equal(url, service + "/contact");
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    requests.push(JSON.parse(options.body));
    return new Response(null, {status:204});
  };
  const verify = async (target, requestId, container) => {
    assert.equal(target, service);
    assert.equal(requestId, id);
    assert.equal(container, "dialog");
    const token = "token-" + tokens.length;
    tokens.push(token);
    return token;
  };
  for (let attempt=0; attempt<2; attempt++) await queueContact({...support, maker:"private"}, id, "dialog", fetcher, verify);
  assert.deepEqual(requests, tokens.map(token => ({...support,id,token})));
  await assert.rejects(queueContact(support,id,"dialog",fetcher,async () => { throw Error("unavailable"); }));
  assert.equal(requests.length, 2);
  await assert.rejects(queueContact(support,id,"dialog",async () => Response.json({service:"http://example.org"}),verify));
});

function post(input, caller=origin) {
  return new Request(service + "/contact", {method:"POST", headers:{Origin:caller,"Content-Type":"application/json"}, body:JSON.stringify(input)});
}

test("the isolated widget exposes only the public site key and restricts who may embed it", async () => {
  const id = randomUUID();
  const frame = host => new Request(service + "/check?" + new URLSearchParams({origin:host,id}));
  const result = await worker.fetch(frame(origin), env);
  assert.equal(result.status, 200);
  assert.ok(result.headers.get("Content-Security-Policy").includes("frame-ancestors "+origin+";"));
  assert.equal(result.headers.get("Referrer-Policy"), "no-referrer");
  const html = await result.text();
  assert.ok(html.includes(env.TURNSTILE_SITE_KEY) && html.includes(id) && !html.includes(env.TURNSTILE_SECRET));
  assert.equal((await worker.fetch(frame("https://elsewhere.example"),env)).status,403);
});

test("invalid contact details and missing, expired or mismatched Turnstile checks never reach the queue", async t => {
  const id=randomUUID(), input={...support,id,token:"test-token"};
  const accepted={success:true,hostname:new URL(service).hostname,action:"contact",cdata:id};
  let result, checks=0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url,"https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.deepEqual(Object.fromEntries(options.body),{secret:env.TURNSTILE_SECRET,response:input.token});
    checks++;
    return Response.json(result);
  });
  for (const [body,caller,status] of [[input,"https://elsewhere.example",403],[{...input,id:[id]},origin,400],
    [{...input,email:"invalid"},origin,400],[{...input,token:""},origin,403],[{...input,organization:"company"},origin,400]]) {
    assert.equal((await worker.fetch(post(body,caller),env)).status,status);
  }
  assert.equal(checks,0);
  for (const patch of [{success:false,"error-codes":["timeout-or-duplicate"]},{action:"other"},{cdata:randomUUID()},{hostname:"another.example"}]) {
    result={...accepted,...patch};
    assert.equal((await worker.fetch(post(input), env)).status,403);
  }
  assert.equal(checks,4);
});

test("verified support and sponsor requests create only validated records using the contact writer", async t => {
  const id=randomUUID(), token="test-token";
  const messages=[support,{...support,kind:"sponsor",organization:"Example Org"}];
  let input, stages, alreadyExists=false;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const target=new URL(url);
    stages.push(target.hostname);
    if (target.hostname === "challenges.cloudflare.com") return Response.json({success:true,hostname:new URL(service).hostname,action:"contact",cdata:id});
    if (target.hostname === "identitytoolkit.googleapis.com") {
      assert.deepEqual(JSON.parse(options.body),{email:env.WRITER_EMAIL,password:env.WRITER_PASSWORD,returnSecureToken:true});
      return Response.json({idToken:"test-writer-token",localId:"willforfree-contact-writer"});
    }
    assert.equal(options.headers.Authorization,"Bearer test-writer-token");
    const [write]=JSON.parse(options.body).writes;
    assert.deepEqual(write.currentDocument,{exists:false});
    assert.equal(write.update.name,"projects/example-wills/databases/(default)/documents/contactInbox/"+id);
    assert.deepEqual(write.update.fields,Object.fromEntries(Object.entries(input).map(([key,value]) => [key,{stringValue:value}])));
    assert.deepEqual(write.updateTransforms,[{fieldPath:"createdAt",setToServerValue:"REQUEST_TIME"}]);
    return alreadyExists ? Response.json({error:{status:"ALREADY_EXISTS"}},{status:409}) : Response.json({});
  });
  for (input of messages) {
    stages=[];
    const res=await worker.fetch(post({...input,id,token,maker:"private"}),env);
    assert.equal(res.status,204);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"),origin);
    assert.deepEqual(stages,["challenges.cloudflare.com","identitytoolkit.googleapis.com","firestore.googleapis.com"]);
    alreadyExists=true;
  }
});

test("the private relay addresses the team, sets Reply-To, and retries cleanup without resending mail",()=>{
  const project=/const project = '([^']+)'/.exec(relaySource)[1];
  const collection="projects/"+project+"/databases/(default)/documents/contactInbox/";
  const names=[randomUUID(),randomUUID()];
  const docs=new Map([support,{...support,kind:"sponsor",organization:"Example Org"}].map((v,i)=>{
    const name=collection+names[i];
    return [name,{name,updateTime:"2026-11-14T12:00:00Z",fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,{stringValue:x}]))}];
  }));
  const props=new Map(), mail=[];let cleanupFault=true, quota=0;
  const context=vm.createContext({
    ScriptApp:{getOAuthToken:()=>"test"},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:id=>props.get(id),setProperty:(id,v)=>props.set(id,v),deleteProperty:id=>props.delete(id)})},
    MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:msg=>mail.push(msg)},
    UrlFetchApp:{fetch:(url,options)=>{
      assert.equal(new URL(url).origin,"https://firestore.googleapis.com");
      if(options.method!=="delete")return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({documents:[...docs.values()]})};
      if(cleanupFault){cleanupFault=false;return {getResponseCode:()=>503};}
      assert.equal(new URL(url).searchParams.get("currentDocument.updateTime"),"2026-11-14T12:00:00Z");
      docs.delete(new URL(url).pathname.slice(4));return {getResponseCode:()=>200};
    }}
  });
  vm.runInContext(relaySource,context);
  context.deliverContacts();assert.equal(mail.length,0);assert.equal(docs.size,2);
  quota=10;assert.throws(()=>context.deliverContacts(),/cleanup/);
  context.deliverContacts();assert.equal(docs.size,0);assert.equal(props.size,0);
  assert.deepEqual(mail.map(m=>m.subject),["WillForFree support message","WillForFree sponsor inquiry"]);
  assert.equal(mail[0].to,mail[1].to);assert.notEqual(mail[0].to,support.email);
  assert.equal(mail[0].replyTo,support.email);assert.match(mail[1].body,/Organization: Example Org/);
});
