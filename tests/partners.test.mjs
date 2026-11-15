import {test} from "node:test";
import assert from "node:assert/strict";
import {markets,regions} from "../public/markets.js";
import {areaName,campaignsFrom,selectCampaign} from "../lib/partners/campaigns.mjs";
import {offerCatalog, operatorProject} from "../lib/partners/registry.mjs";
import {readFile} from "node:fs/promises";
const campaign = (id,areas,extra={})=>({id,partner:"acme",maxDownloads:100,name:"Example Cooperative",kind:"paid",title:"Member planning session",message:"See the member offer.",url:"https://example.org/offer",start:"2026-01-01",end:"2026-12-31",areas,...extra});
test("all selectable places match exact regions and country-wide campaigns without key collisions",()=>{
  let count=0;
  for (const country of Object.keys(markets)) for (const region of Object.keys(regions[country] || {"":true})) {
    const place={country,region}, areas=[country], national=campaign("national",areas);
    const key=region ? country+"-"+region : country;
    assert.ok(areaName(key));
    assert.equal(selectCampaign([national],place,"2026-01-01"),national);
    const local=campaign("local",[key]);
    if(region) {
      assert.equal(selectCampaign(campaignsFrom([national,local]),place,"2026-12-31"),local);
      assert.equal(selectCampaign([local],{country,region:""},"2026-06-01"),null);
    }
    assert.equal(selectCampaign([local],place,"2027-01-01"),null); count++;
  }
  assert.equal(count,97);
  assert.equal(selectCampaign([campaign("ontario",["CA-ON"])],{country:"US",region:"CA"},"2026-06-01"),null);
  assert.throws(()=>campaignsFrom([campaign("one",["CA"]),campaign("two",["CA"])]));
  for(const extra of [{maxDownloads:0},{maxDownloads:1.5},{start:"2026-02-30"},{areas:["CA-BAD"]},{url:"javascript:void(0)"},{url:"https://a:b@example.org"}])
    assert.throws(()=>campaignsFrom([campaign("one",["CA"],extra)]));
});
test("the public catalog contains only offer details and the unsponsored configuration is empty",async()=>{
  const [offer] = offerCatalog([campaign("example",["CA"])]);
  assert.ok(!Object.hasOwn(offer,"partner"));
  assert.ok(!Object.hasOwn(offer,"maxDownloads"));
  for (const file of ["../public/sponsor-offers.json","../config/partner-campaigns.json"]) {
    assert.deepEqual(JSON.parse(await readFile(new URL(file,import.meta.url),"utf8")),[]);
  }
  const runtime = JSON.parse(await readFile(new URL("../public/runtime.json",import.meta.url),"utf8"));
  assert.notEqual(runtime.partnerOffers,true);
});
test("operator setup rejects another production project, remote emulators and named databases",async()=>{
  await assert.rejects(operatorProject({WFF_PARTNER_PROJECT:"unrelated-production"}));
  await assert.rejects(operatorProject({WFF_PARTNER_PROJECT:"demo-elsewhere",FIREBASE_AUTH_EMULATOR_HOST:"remote:1",FIRESTORE_EMULATOR_HOST:"127.0.0.1:99"}));
  await assert.rejects(operatorProject({WFF_PARTNER_PROJECT:"demo-example",WFF_PARTNER_DATABASE:"elsewhere"}));
});
