import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {clearWording, currentLanguage, detectLanguage, display, duringKit, languages, parseWholeAmount, setLanguage, sourceChoice, sourcePattern} from "../public/locale.js";
import {sections} from "../public/document.js";
import {cash,combinedGiftHint,giftEntryLimit} from "../public/extras.js";
import {interviewCards} from "../public/interview-copy.js";
import {markets, profile, regions} from "../public/markets.js";
import {downloadAgreement, downloadLiability, downloadNotice, readDownloadTermsLink} from "../public/download-notice.js";
import {planningEntries, preserveAsNotes, questions, readAnswer, usesEarlierChoicesNotice, validateState} from "../public/will.js";
import {hasSensitive} from "../public/flow.js";
import {manageTurn} from "../public/conversation.js";
import {fixture} from "./fixtures.mjs";

const catalogs=new Map();
for(const code of Object.keys(languages).filter(code=>code!=="en")){
  const data=await readFile(new URL("../public/locales/"+code+".json",import.meta.url),"utf8");
  catalogs.set(code,JSON.parse(data));
}
const tokens=text=>(text.match(/\{\d+[+\-/]?\}/g) || []).sort();
const filenames=text=>(text.match(/(?:\d{2}-[A-Za-z-]+|Sponsor-offer)\.pdf/g) || []).sort();
test("download terms use the kit's jurisdiction and language and preserve regional exceptions", () => {
  const general = downloadAgreement(profile({country: "CA", region: "ON"}));
  const protectedText = downloadAgreement(profile({country: "CA", region: "QC"}));
  assert.notEqual(general, protectedText);
  const standardLiability = downloadLiability(profile({country: "CA", region: "ON"}));
  assert.match(standardLiability, /Where the law permits/);
  assert.equal(downloadLiability(null), "");
  for (const country of Object.keys(markets)) {
    for (const region of Object.keys(regions[country] || {"": ""})) {
      const place = {country, region}, kit = profile(place);
      for (const language of Object.keys(languages)) {
        assert.deepEqual(readDownloadTermsLink("#responsibility/" + kit.key + "/" + language), {place, language});
      }
      assert.equal(downloadAgreement(kit), ["CA-QC", "US-NC"].includes(kit.key) ? protectedText : general);
      const liability = downloadLiability(kit);
      if (kit.key === "CA-QC") assert.match(liability, /^For Québec kits, .*acts.*representatives as required by law\.$/);
      else if (kit.key === "US-NC") assert.match(liability, /^For North Carolina kits, .*warranty or liability.*remedy/);
      else assert.equal(liability, standardLiability);
      for (const [code, catalog] of catalogs) {
        assert.ok(catalog[downloadAgreement(kit)] && catalog[downloadNotice(kit)] && catalog[liability], code + " " + kit.key);
        assert.notEqual(catalog[general], catalog[protectedText], code);
      }
    }
  }
  for (const hash of ["#responsibility", "#responsibility/CA-QQ/fr", "#responsibility/US/en", "#responsibility/NL/fr/extra", "#responsibility/SK/xx"]) {
    assert.equal(readDownloadTermsLink(hash), null);
  }
});
test("only approved languages are selected, in browser preference order",()=>{
  assert.equal(Object.keys(languages).length,19);
  for(const [tags,expected] of [[["fr-CA"],"fr"],[["es-US"],"es"],[["no-NO"],"nb"],[["zh-SG"],"zh-Hans"],[["zh-Hant","de-CH"],"de"],[["invalid_","ja"],"en"]])
    assert.equal(detectLanguage(tags),expected);
});
test("all static catalogs preserve named slots, links and source coverage",()=>{
  const english=Object.keys(catalogs.get("fr")).sort();
  for(const [code,catalog] of catalogs){
    assert.deepEqual(Object.keys(catalog).sort(),english,code);
    for(const [source,target] of Object.entries(catalog)){
      assert.ok(target.trim(),code+" "+source);
      assert.doesNotMatch(target,/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD]/u,code+" "+source);
      assert.deepEqual(tokens(target),tokens(source),code+" "+source);
      assert.deepEqual(filenames(target),filenames(source),code+" "+source);
      if(source.includes("“No or unsure”"))assert.ok(target.includes(catalog["No or unsure"]),code+" "+source);
      const stack=[];
      for(const [,index,type] of target.matchAll(/\{(\d+)([+\-/])\}/g)){
        if(type==="+")stack.push(index);
        if(type==="-")assert.equal(stack.pop(),index,code+" "+source);
      }
      assert.equal(stack.length,0);
    }
  }
});
test("finishing the gift menu and asking for different terms are distinguishable choices in every language",async()=>{
  const savedFetch=globalThis.fetch;
  globalThis.fetch=async url=>({ok:true,json:async()=>catalogs.get(url.split("/").pop().split(".")[0])});
  try{
    for(const code of Object.keys(languages)){
      await setLanguage(code,{remember:false});
      for(const place of [{country:"CA",region:"ON"},{country:"CA",region:"QC"},{country:"US",region:"CA"}]){
        const p=profile(place), {answers}=fixture(place);
        const q=questions(p,answers).find(question=>question.id==="extra");
        const card=interviewCards(q,p,answers)[0];
        const finish=card.options.find(o=>o.value==="Nothing else");
        const advice=card.options.find(o=>o.value==="Something for local advice");
        const label=o=>display(o.label);
        assert.notEqual(label(finish),label(advice),code+" "+p.key);
        assert.equal(manageTurn(label(finish),q,card,p).value,"Nothing else",code+" finish");
        assert.equal(manageTurn(label(advice),q,card,p).value,"Something for local advice",code+" advice");
      }
    }
  }finally{await setLanguage("en",{remember:false});globalThis.fetch=savedFetch;clearWording();}
});
test("localized wills preserve raw names, document scope, amounts and family roles",async()=>{
  const fetcher=globalThis.fetch;
  globalThis.fetch=async path=>({ok:true,json:async()=>catalogs.get(path.split("/").pop().split(".")[0])});
  const place={country:"GB",region:"ENG"},p=profile(place);
  const {answers}=fixture(place,{household:"Partner, then children",trustee:"Paweł Żółć",coTrustee:"王小明",maker:"Rose Morgan"});
  try{
    for(const [code,catalog] of catalogs){
      await setLanguage(code,{remember:false});
      const paragraphs=sections(p,answers);
      for(const [,body] of paragraphs)assert.ok(Object.hasOwn(catalog,sourcePattern(body)),code+" "+sourcePattern(body));
      const wording=paragraphs.map(([,body])=>display(body)).join(" ");
      for(const name of ["Rose Morgan","Paweł Żółć","王小明"])assert.ok(wording.includes(name),code+" "+name);
      assert.equal(readAnswer({id:"maker",kind:"name"},"王小明").value,"王小明");
      if(code==="de"){
        assert.match(wording,/nach Stämmen/u);
        assert.match(wording,/mit meinem Tod/u);
        assert.match(wording,/Treuhänder/u);
        assert.doesNotMatch(wording,/Anwachsung|Miterben/u);
      }
      if(code==="es")assert.doesNotMatch(wording,/\breliquat\b|\bsu padre por representación\b/i);
      if(code==="fr"){
        assert.equal(parseWholeAmount("1 500"),"1500");assert.equal(parseWholeAmount("1,500"),null);
        assert.ok(hasSensitive("mon mot de passe est lavande"));assert.ok(!hasSensitive("un gestionnaire de mots de passe"));
      }
      if(code==="es")assert.ok(readAnswer({id:"maker",kind:"name"},"Ana Pérez si se gradúa").error);
      if(code==="zh-Hans")assert.ok(hasSensitive("我的密码是绿色"));
    }
    await duringKit(async()=>{
      await assert.rejects(setLanguage("fr",{remember:false}));assert.equal(currentLanguage(),"zh-Hans");
    });
  }finally{await setLanguage("en",{remember:false});globalThis.fetch=fetcher;}
});

test("retained planning notes translate selected answers and topic labels while preserving the visitor’s own words",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async path=>({ok:true,json:async()=>catalogs.get(path.split("/").pop().split(".")[0])});
  const place={country:"CA",region:"ON"};
  const state=fixture(place,{extra:"Add personal notes",noteTopic1:"Pet care",noteText1:"Nothing else",noteTopic2:"Continue to review"});
  const saved=preserveAsNotes(profile(place),state);
  saved.record.push(["Earlier edition note","Pet care"]);
  try{
    for(const [code,catalog] of catalogs){
      await setLanguage(code,{remember:false});
      clearWording();
      const rows=new Map(planningEntries(place,validateState(saved,true).record).map(([k,v,preset])=>[display(k),preset?display(v):v]));
      assert.equal(rows.get(catalog["Personal notes"]),catalog["Pet care"],code);
      assert.equal(rows.get(catalog["Note: {0}"].replace("{0}",catalog["Pet care"])),"Nothing else",code);
      assert.equal(rows.get("Earlier edition note"),"Pet care",code);
      assert.ok(usesEarlierChoicesNotice(saved),code);
      assert.ok(!usesEarlierChoicesNotice({answers:{wishes:"Pet care"}}),code);
    }
  }finally{await setLanguage("en",{remember:false});globalThis.fetch=originalFetch;clearWording();}
});

test("repeat cash confirmations display the local amount and retain the same saved choice in every language", async () => {
  const fetcher = globalThis.fetch;
  globalThis.fetch = async path => ({ok:true,json:async()=>catalogs.get(path.split("/").pop().split(".")[0])});
  const place = {country:"CA",region:"ON"}, p = profile(place);
  const state = fixture(place,{extra:cash,extraAmount:"12300",extraRecipient:"Ben Reed",extraAfter:cash,extraAmount2:"450",extraRecipient2:"Ben Reed"});
  const confirmed = "Yes, CAD 12,750 in total";
  try {
    for (const code of Object.keys(languages)) {
      await setLanguage(code,{remember:false});
      assert.equal(state.answers.extraTotal2,confirmed,code);
      assert.deepEqual(validateState(state,true),state,code);
      const q = questions(p,state.answers).find(q=>q.id==="extraTotal2");
      const card = interviewCards(q,p,state.answers)[0];
      assert.deepEqual(card.lines,[combinedGiftHint]);
      if (code !== "en") {
        assert.notEqual(display(combinedGiftHint),combinedGiftHint,code);
        assert.notEqual(display(giftEntryLimit),giftEntryLimit,code);
      }
      const gifts=sections(p,state.answers).filter(([title])=>title.startsWith("Separate gift "));
      assert.equal(gifts.length,1,code);
      const signedGift=display(gifts[0][1]);
      assert.ok(signedGift.includes("12750") && signedGift.includes("Ben Reed"),code);
      const label = display(card.options[0].label);
      const amount = new Intl.NumberFormat(code).format(12750);
      assert.ok(display(card.title).includes(amount),code);
      assert.ok(display(card.title).includes("Ben Reed"),code);
      assert.ok(label.includes(amount),code);
      assert.equal(card.options[0].value,confirmed,code);
      if (code!=="en") assert.equal(sourceChoice(label,card.options)?.value,confirmed,code);
    }
  } finally { await setLanguage("en",{remember:false}); globalThis.fetch=fetcher; }
});

test("localized gift fields reject unnamed relatives and rented possessions", async () => {
  const examples = {
    cs: ["naše sestra", "pronajaté housle"], da: ["vores søster", "en lejet violin"],
    de: ["unsere Schwester", "meine gemietete Geige"], es: ["nuestra hermana", "mi violín alquilado"],
    et: ["meie õde", "renditud viiul"], fi: ["meidän siskomme", "vuokrattu viuluni"],
    fr: ["notre sœur", "mon violon loué"], hr: ["naša sestra", "unajmljena violina"],
    is: ["systir okkar", "leigð fiðla"], it: ["nostra sorella", "il mio violino a noleggio"],
    mt: ["oħtna", "vjolin mikri"], nb: ["søsteren vår", "en leid fiolin"],
    nl: ["onze zus", "mijn gehuurde viool"], pl: ["nasza siostra", "wypożyczone skrzypce"],
    pt: ["a nossa irmã", "o meu violino alugado"], sk: ["naša sestra", "prenajaté husle"],
    sv: ["vår syster", "min hyrda fiol"], "zh-Hans": ["我们的姐姐", "我租来的小提琴"]
  };
  const fetcher = globalThis.fetch;
  globalThis.fetch = async path => ({ok: true, json: async () => catalogs.get(path.split("/").pop().split(".")[0])});
  const recipient = {id: "extraRecipient", kind: "name", giftField: "extraRecipient"};
  const recipients = {id: "txAlternates", kind: "names"};
  const keepsake = {id: "extraItem", kind: "item", giftField: "extraItem"};
  try {
    for (const [code, [relative, rentedItem]] of Object.entries(examples)) {
      await setLanguage(code, {remember: false});
      assert.ok(readAnswer(recipient, relative).error, code);
      assert.ok(readAnswer(recipients, "Élodie Stone, " + relative).error, code);
      assert.ok(readAnswer(keepsake, rentedItem).error, code);
      assert.equal(readAnswer(recipient, "Élodie Stone").value, "Élodie Stone", code);
      assert.equal(readAnswer(keepsake, "Viola Amati 1732").value, "Viola Amati 1732", code);
    }
  } finally {
    await setLanguage("en", {remember: false});
    globalThis.fetch = fetcher;
  }
});

test("PDF font subsets preserve the visible outlines of Chinese and mixed-script legal names", async () => {
  const {default:fontkit} = await import("@pdf-lib/fontkit");
  const font = fontkit.create(await readFile(new URL("../public/fonts/noto-sans-sc-450.ttf", import.meta.url)));
  const subset = font.createSubset();
  const samples = [..."遗嘱王小明PawełŻółć"];
  const glyphs = samples.map(character => font.glyphForCodePoint(character.codePointAt(0)));
  const subsetIds = glyphs.map(glyph => subset.includeGlyph(glyph));
  const data = await new Promise((resolve, reject) => {
    const chunks = [];
    subset.encodeStream().on("data", chunk => chunks.push(chunk))
      .on("error", reject).on("end", () => resolve(Buffer.concat(chunks)));
  });
  const embedded = fontkit.create(data);
  for (const [i, glyph] of glyphs.entries()) {
    const outline = glyph.path.toSVG();
    assert.ok(outline.length > 0, samples[i]);
    assert.equal(embedded.getGlyph(subsetIds[i]).path.toSVG(), outline, samples[i]);
  }
});
