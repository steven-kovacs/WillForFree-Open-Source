import test from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import {pages, publicPath, safeReferrer, campaignFields, eventFields, siteOrigin} from "../public/traffic-policy.js";

const root = new URL("../public/", import.meta.url);
const read = path => readFile(new URL(path,root), "utf8");
test("sitemap contains every indexable HTML page once, matching its single canonical", async () => {
  const sitemap = await read("sitemap.xml");
  const indexable = [];
  for (const file of await readdir(root,{recursive:true})) {
    if (!file.endsWith(".html")) continue;
    const html = await read(file);
    if (/<meta name="robots" content="noindex/.test(html)) continue;
    const path = "/" + file.replace(/index\.html$/, "");
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m=>m[1]), [siteOrigin + path]);
    indexable.push(path);
  }
  assert.deepEqual([...pages.keys()].sort(), indexable.sort());
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).sort(), indexable.map(p=>siteOrigin+p).sort());
  assert.match(await read("robots.txt"), /Sitemap: https:\/\/willforfree\.com\/sitemap\.xml/);
});
test("Google traffic events only describe public pages, published campaign labels and named actions", () => {
  assert.equal(publicPath("/our-mission/index.html"), "/our-mission/");
  assert.equal(publicPath("/partner-portal/"), null);
  assert.equal(safeReferrer("https://sub.linkedin.com/private?secret=123"), "https://linkedin.com/");
  assert.equal(safeReferrer("https://private.example.com/person"), "https://other-referral.invalid/");
  assert.equal(safeReferrer(siteOrigin+"/fine-print/?person=private#secret"), siteOrigin+"/fine-print/");
  const campaign = campaignFields("?utm_source=partner&utm_medium=email&utm_campaign=broker-outreach&utm_content=private");
  assert.deepEqual(campaign, {campaign_source:"partner", campaign_medium:"email", campaign_name:"broker-outreach"});
  assert.deepEqual(campaignFields("?utm_campaign=private&utm_source=private"), {});
  assert.equal(eventFields("form_submit","/","",{}), null);
  assert.equal(eventFields("page_view","/partner-portal/","",{}), null);
  const fields = eventFields("kit_download_start","/","",{campaign_name:"private",answer:"private"});
  assert.deepEqual(fields, {page_location:siteOrigin+"/", page_title:"WillForFree", page_referrer:""});
});
