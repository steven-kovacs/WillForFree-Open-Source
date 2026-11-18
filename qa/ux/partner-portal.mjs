// Real Firebase emulators, verified Admin ID tokens, and disposable fictional accounts only.
import assert from "node:assert/strict";
import {randomBytes,randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {saveCampaigns,offerCatalog} from "../../lib/partners/registry.mjs";
import {confirmationWrites} from "../../public/partner-api.js";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {makeServer} from "../../server.mjs";
import pdfTextHelpers from "./pdf-text.cjs";

const project=process.env.GCLOUD_PROJECT || "demo-willforfree", authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9199",
  dbHost=process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8187";
if (!project.startsWith("demo-") || ![authHost,dbHost].every(host=>/^127\.0\.0\.1:\d+$/.test(host))) throw Error("Use local emulators.");
process.env.FIREBASE_AUTH_EMULATOR_HOST=authHost;process.env.FIRESTORE_EMULATOR_HOST=dbHost;
const {webkit}=createRequire(import.meta.url)(process.env.WFF_PLAYWRIGHT || "playwright");
const admin=initializeApp({projectId:project},"portal-test-"+randomUUID());
const auth=getAuth(admin),db=getFirestore(admin),prefix=randomUUID().slice(0,8),pass=randomBytes(18).toString("hex");
const A="a-"+prefix,B="b-"+prefix;
const base={maxDownloads:4,kind:"paid",start:"2020-01-01",end:"2099-12-31",message:"Fictional campaign.",url:"https://example.org/offer"};
const campaigns=[{...base,id:A,partner:A,name:"Example East",areas:["CA-ON","US-NC"],title:"Family planning session"},
  {...base,id:B,partner:B,name:"Example West",areas:["CA"],title:"National member meeting"}];
const config={projectId:project,apiKey:"local-emulator",authEmulator:authHost,firestoreEmulator:dbHost};
const server=makeServer({partners:{config,offers:offerCatalog(campaigns)}});
let browser;
await new Promise((ok,no)=>server.once("error",no).listen(0,"127.0.0.1",ok));
const origin="http://127.0.0.1:"+server.address().port, root="projects/"+project+"/databases/(default)/documents", endpoint="http://"+dbHost+"/v1/"+root;
try{
  await saveCampaigns(db,campaigns);
  const members={};
  for(const [key,org] of [[A,"Example East"],[B,"Example West"],["unassigned",null]]) {
    const user=await auth.createUser({email:key+"-"+prefix+"@example.invalid",password:pass});
    const authRes=await fetch("http://"+authHost+"/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:user.email,password:pass,returnSecureToken:true})});
    assert.equal(authRes.status,200);
    members[key]={email:user.email,uid:user.uid,token:(await authRes.json()).idToken};
    if(org) await db.collection("partnerMembers").doc(user.uid).set({partner:key,name:org,active:true});
  }
  browser=await webkit.launch();
  const ctx=await browser.newContext({viewport:{width:375,height:790},acceptDownloads:true});
  const page=await ctx.newPage(), errors=[];
  page.on("pageerror",e=>errors.push(e.message));await ctx.route("https://get.geojs.io/**",r=>r.abort());
  await page.goto(origin+"/");await page.getByRole("button",{name:/Let’s start/}).click();
  await page.locator("#country").selectOption("US");await page.locator("#region").selectOption("NC");await page.locator("#use-place").click();
  await page.locator("#accept-download-terms").check();
  await page.locator("#complete .primary-btn").click();await page.locator("#sponsor-dialog[open]").waitFor();
  assert.match(await page.locator("#partner-label").textContent(),/Advertisement · Paid sponsor/);
  assert.equal(await page.locator("#partner-credit").textContent(),"Example East");
  const confirmed=page.waitForResponse(r=>r.url()===endpoint+":commit" && r.status()===200);
  const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#save-zip").click()]);
  assert.ok(download.suggestedFilename().includes("US-NC"));await confirmed;
  const entry=pdfTextHelpers.kitText(await download.path(),"Sponsor-offer.pdf");
  assert.match(entry,/Sponsored by Example East/);
  const commit=(writes)=>fetch(endpoint+":commit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({writes})});
  const get=(path,token)=>fetch(endpoint+"/"+path,{headers:token?{Authorization:"Bearer "+token}:{}});
  const ticket={campaign:B,receipt:randomUUID()}, writes=confirmationWrites(root,ticket);
  const results=await Promise.all(Array.from({length:3},()=>commit(writes)));
  assert.equal(results.filter(res=>res.ok).length,1);
  const unrelated=confirmationWrites(root,{campaign:"unknown-"+prefix,receipt:randomUUID()});
  assert.ok(!(await commit(unrelated)).ok);
  assert.ok(!(await commit([writes[2]])).ok);
  assert.equal((await get("partnerReports/"+A)).status,403);
  assert.equal((await get("partnerReports/"+A,members[B].token)).status,403);
  assert.equal((await get("partnerTotals/"+A,members[B].token)).status,403);
  assert.equal((await get("partnerMembers/"+members[A].uid,members[B].token)).status,403);
  assert.equal((await get("partnerReports",members[A].token)).status,403);
  assert.equal((await get("partnerCursors/"+A,members[A].token)).status,403);
  assert.equal((await get("partnerReceipts/"+B+"/entries/"+ticket.receipt,members[B].token)).status,403);
  const me=await get("partnerReports/"+A,members[A].token);
  assert.equal(me.status,200);
  for(const [org,name] of [[A,"Example East"],[B,"Example West"],["unassigned",null]]) {
    await page.goto(origin+"/partner-portal/");await page.locator("#email").fill(members[org].email);
    await page.locator("#password").fill(pass);await page.locator("#enter").click();
    if(!name){await page.locator("#login-status").filter({hasText:"no partner access"}).waitFor();continue;}
    await page.locator("#dashboard").waitFor();assert.equal(await page.locator("#organization").textContent(),name);
    assert.equal(await page.locator("#total").textContent(),"1");assert.equal(await page.locator(".campaign").count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(org===A) {
      await db.collection("partnerMembers").doc(members[A].uid).delete();
      await page.locator("#refresh").click();await page.locator("#entry").waitFor();
      assert.equal(await page.locator("#campaign-list").textContent(),"");
    } else {await page.locator("#logout").click();await page.getByText("You’re signed out.").waitFor();}
  }
  for (let i=0;i<3;i++) assert.equal((await commit(confirmationWrites(root,{campaign:B,receipt:randomUUID()}))).status,200);
  assert.equal((await commit(confirmationWrites(root,{campaign:B,receipt:randomUUID()}))).status,403);
  assert.equal((await db.doc("partnerTotals/"+B).get()).get("downloads"),4);
  await db.doc("partnerWindows/"+A).update({end:new Date(0)});
  assert.equal((await commit(confirmationWrites(root,{campaign:A,receipt:randomUUID()}))).status,403);
  await db.doc("partnerMembers/"+members[B].uid).update({validAfter:Math.ceil(Date.now()/1000)+4});
  assert.equal((await get("partnerReports/"+B,members[B].token)).status,403);
  await saveCampaigns(db,[]);
  assert.equal((await db.doc("partnerWindows/"+A).get()).get("enabled"),false);
  assert.equal((await db.doc("partnerWindows/"+B).get()).get("enabled"),false);
  assert.equal((await db.doc("partnerReports/"+B).get()).get("campaigns")[0].paused,true);
  assert.equal((await db.doc("partnerTotals/"+B).get()).get("downloads"),4);
  assert.equal((await commit(confirmationWrites(root,{campaign:A,receipt:randomUUID()}))).status,403);
  const newUser = members.unassigned;
  const operator = fileURLToPath(new URL("../../scripts/partner-member.mjs",import.meta.url));
  execFileSync(process.execPath,[operator,"grant",newUser.uid,"empty-"+prefix,"First campaign pending"],{
    env:{...process.env,WFF_PARTNER_PROJECT:project},stdio:"pipe"});
  // Grants require a fresh sign-in after the one-second Auth timestamp boundary.
  await new Promise(resolve=>setTimeout(resolve,1150));
  await page.goto(origin+"/partner-portal/");await page.locator("#email").fill(newUser.email);
  await page.locator("#password").fill(pass);await page.locator("#enter").click();
  await page.locator("#empty").waitFor();
  assert.equal(await page.locator("#total").textContent(),"0");
  assert.deepEqual(errors,[]);
  console.log("Sponsor ZIP, Firestore REST acknowledgment, Auth sign-in, tenant isolation, denied lists and addresses, revocation, campaign expiry, cap and concurrent deduplication passed.");
} finally {
  if(browser)await browser.close();await new Promise(done=>server.close(done));await deleteApp(admin);
}
