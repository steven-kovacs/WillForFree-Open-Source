import test from "node:test";
import assert from "node:assert/strict";
import {markets, regions, profile} from "../public/markets.js";
import {guideResources} from "../public/guide-sources.js";
import {afterCareExample, afterWillReading} from "../public/after-will-sources.js";

test("after-will sources cover all 97 homes and never assign a different place to match a language", () => {
  let count = 0;
  for (const country of Object.keys(markets)) for (const region of Object.keys(regions[country] || {"":true})) {
    const place = {country, region};
    const key = region ? country + "-" + region : country;
    const rows = afterWillReading(place);
    assert.ok(rows.some(source => source.area === key), key);
    for (const source of rows) {
      assert.ok(source.area === key || source.area === country, key);
      assert.equal(new URL(source.url).protocol, "https:");
      assert.ok(source.publisher && source.label);
    }
    const signatures = entries => entries.map(({area, topic, label}) => [area, topic, label]);
    for (const lang of ["fr", "zh-Hans"]) assert.deepEqual(signatures(afterWillReading(place, lang)), signatures(rows));
    count++;
  }
  assert.equal(count, 97);
  for (const place of [null, {country:"US",region:""}, {country:"GB",region:"XX"}]) {
    assert.deepEqual(afterWillReading(place), []);
    assert.equal(afterCareExample(place), "");
  }
});

test("after-will reading distinguishes an authority, a treatment directive and a local contact", () => {
  const source = (place, topic, lang) => afterWillReading(place, lang).find(row => row.topic === topic);
  const qc = {country:"CA",region:"QC"};
  assert.match(source(qc, "care", "fr").url, /directives-medicales-anticipees/);
  assert.match(source(qc, "money", "fr").url, /mandat-de-protection/);
  assert.match(source(qc, "beneficiaries", "en").url, /lautorite.qc.ca/);
  assert.match(source({country:"CA",region:"ON"}, "care").url, /ontario.ca/);
  assert.equal(source({country:"CA",region:"NU"}, "care").label, "Find a community health centre");
  assert.match(source({country:"AU",region:"NSW"}, "care").url, /service.nsw.gov.au/);
  assert.match(source({country:"GB",region:"SCT"}, "money").url, /scotland/);
  assert.ok(!afterCareExample({country:"GB",region:"SCT"}));
  assert.match(source({country:"US",region:"CA"}, "trusts").url, /oag.ca.gov/);
  assert.match(source({country:"PT",region:""}, "care", "en").url, /sns24.gov.pt/);
});

test("every supported home has a local estate source and a national business source", () => {
  const sources = new Set();
  for (const country of Object.keys(markets)) {
    for (const region of Object.keys(regions[country] || {"": true})) {
      const p = profile({country, region});
      const {family, business} = guideResources(p, "en");
      assert.equal(new URL(family).protocol, "https:", p.key);
      assert.equal(new URL(business).protocol, "https:", p.key);
      if (p.key !== "GB-WLS") assert.ok(!sources.has(family), p.key);
      sources.add(family);
      if (country !== "CA") assert.doesNotMatch(business, /canada\.ca/);
    }
  }
  assert.equal(sources.size, 96); // England and Wales share the same guide.
});

test("local examples follow the province and language choices preserve jurisdiction", () => {
  for (const [region, domain] of [["NS", "novascotia.ca"], ["NB", "laws.gnb.ca"], ["PE", "www.princeedwardisland.ca"]]) {
    const {example, family} = guideResources(profile({country:"CA", region}), "fr");
    assert.equal(new URL(example.href).hostname, domain);
    assert.doesNotMatch(family, /ontario|gov\.uk|europa/);
  }
  assert.match(guideResources(profile({country:"CA",region:"NB"}), "fr").family, /\/fr\/successions\//);
  const german = profile({country:"DE",region:""});
  assert.match(guideResources(german,"fr").family, /\/de_fr$/);
  assert.match(guideResources(german,"zh-Hans").family, /\/de_en$/);
  assert.equal(guideResources(german,"en").example, undefined);
});

function tabStorage(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {configurable:true, value:{
    setItem: (key, value) => values.set(key, value),
    getItem: key => values.get(key),
  }});
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else delete globalThis.sessionStorage;
  });
  return values;
}

test("the home override wins over a pending automatic lookup and the old guide preference", async t => {
  const values = tabStorage(t);
  values.set("wff-guide-location", "CA-PE");
  const home = await import("../public/home-location.js?manual");
  assert.equal(home.readHomeLocation(), null);
  let finish;
  const fetcher = t.mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  const pending = home.resolveHomeLocation();
  assert.equal(home.resolveHomeLocation(), pending);
  const selected = {country:"CA", region:"NS"};
  home.setHomeLocation({...selected, name:"Discard this"});
  finish({ok:true, json:async () => ({country_code:"CA",region:"Prince Edward Island"})});
  assert.deepEqual(await pending, selected);
  assert.equal(values.get("wff-home-location"), "selected:CA-NS");
  const nextPage = await import("../public/home-location.js?another-page");
  assert.deepEqual(await nextPage.resolveHomeLocation(), selected);
  assert.deepEqual(nextPage.readHomeLocation({confirmedOnly: true}), selected);
  assert.equal(fetcher.mock.callCount(), 1);
  assert.throws(() => home.setHomeLocation({country:"CA",region:"XX"}), /Unknown jurisdiction/);
});

test("automatic guidance is shared only for a complete supported jurisdiction", async t => {
  const values = tabStorage(t);
  let region = "unknown region";
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true, json: async () => ({country_code:"CA", region}),
  }));
  const unknown = await import("../public/home-location.js?incomplete");
  assert.deepEqual(await unknown.resolveHomeLocation(), {country:"CA",region:""});
  assert.equal(values.size, 0);
  values.set("wff-home-location", "CA-ON-extra");
  const home = await import("../public/home-location.js?auto");
  assert.equal(home.readHomeLocation(), null);
  region = "Prince Edward Island";
  assert.deepEqual(await home.resolveHomeLocation(), {country:"CA",region:"PE"});
  assert.equal(values.get("wff-home-location"), "CA-PE");
  assert.equal(home.readHomeLocation({confirmedOnly: true}), null);
  home.setHomeLocation(home.readHomeLocation());
  assert.deepEqual(home.readHomeLocation({confirmedOnly: true}), {country:"CA",region:"PE"});
});

test("manual changes remain usable in the current document when storage rejects writes", async t => {
  tabStorage(t);
  t.mock.method(sessionStorage, "setItem", () => { throw Error("Storage unavailable"); });
  const home = await import("../public/home-location.js?no-storage");
  home.setHomeLocation({country:"DE",region:""});
  assert.deepEqual(await home.resolveHomeLocation(), {country:"DE",region:""});
  assert.deepEqual(home.readHomeLocation({confirmedOnly: true}), {country:"DE",region:""});
});
