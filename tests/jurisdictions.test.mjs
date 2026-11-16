import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./fixtures.mjs";
import {profile,markets,regions} from "../public/markets.js";
import {questions,readAnswer,validateState,preserveAsNotes} from "../public/will.js";
import {after,sections,signing} from "../public/document.js";
import {interviewCards} from "../public/interview-copy.js";
import {helpFor} from "../public/interview-help.js";
import {canadianGiftClause, courtOutrightChoice} from "../public/survival.js";
import {setLanguage} from "../public/locale.js";
import {supportsGifts,giftCurrency} from "../public/extras.js";
import {documentUse} from "../public/release.js";
import {readFile} from "node:fs/promises";
const home=(country,region="")=>({country,region});
test("a living heir's renunciation needs a fresh choice and an express disposition in the affected editions", () => {
  for (const country of ["CZ","DE","EE","PT"]) {
    const state = fixture(home(country));
    const p = profile(state.place);
    const q = questions(p, state.answers).find(q => q.id === "heirRenunciation");
    assert.match(interviewCards(q, p)[0].title, /outlives you but refuses/);
    assert.equal(readAnswer(q, "No or unsure").stop, true);
    assert.deepEqual(validateState(state, true), state);
    assert.match(sections(p, state.answers).flat().join(" "), /renounces the inheritance, that share passes under intestacy law/);
    delete state.answers.heirRenunciation;
    assert.deepEqual(validateState(state, false, true).answers, state.answers);
    assert.throws(() => validateState(state, true), /complete the remaining questions/);
    assert.doesNotMatch(sections(p, state.answers).flat().join(" "), /renounces the inheritance/);
  }
  const sole = fixture(home("SK"));
  assert.equal(sole.answers.heirRenunciation, undefined);
});
test("unpaid Austrian care is screened even when the carer is not a named beneficiary", () => {
  const state = fixture(home("AT"));
  const p = profile(state.place);
  const q = questions(p, state.answers).find(q => q.id === "austrianCare");
  assert.match(interviewCards(q, p)[0].title, /care someone close to you provided/);
  assert.equal(readAnswer(q, "No or unsure").stop, true);
  delete state.answers.austrianCare;
  assert.deepEqual(validateState(state, false, true).answers, state.answers);
  assert.throws(() => validateState(state, true), /complete the remaining questions/);
});
test("fixed will forms cannot be tailored by answers; official appointments require fresh consent",async()=>{
 for(const state of ["AZ","CO","FL","KY","MN","NC","OH"]){
 const p=profile(home("US",state));
 assert.equal(p.route,"fixed");assert.deepEqual(questions(p,{}),[]);
 assert.throws(()=>validateState({version:2,place:home("US",state),answers:{recipient:"Alex Chen"}},true));assert.deepEqual(validateState(fixture(home("US",state)),true).answers,{});
 const pdf=await readFile(new URL("../public/forms/basic/"+state+".pdf",import.meta.url));assert.equal(pdf.subarray(0,5).toString(),"%PDF-");
 }
 for(const country of ["NL","MT","PT"]){const state=fixture(home(country));assert.equal(profile(state.place).route,"deposit");
 assert.deepEqual(validateState(state,true),state);
 assert.ok(questions(profile(state.place),state.answers).some(q=>q.id==="officialMeeting"));
 delete state.answers.officialMeeting;assert.throws(()=>validateState(state,true));}
});
test("saved yes never supplies revised eligibility or disguises conditions as beneficiaries",()=>{
 for(const input of ["Alex Green if sober","Alex Green as trustee","My cousin","Alex Green after graduation","the executor"]) for(const kind of ["name","names"]) assert.ok(readAnswer({id:"recipient",kind},input).error,input);
 assert.equal(readAnswer({id:"recipient",kind:"name"},"Renée").value,"Renée");
 const original=fixture(home("GB","ENG")); const old=structuredClone(original);delete old.answers.household;
 let reached=false;for(const k of Object.keys(old.answers)){reached ||= k==="firstInstrument"; if(reached)delete old.answers[k];}
 const reopened=validateState(old);assert.equal(reopened.answers.recipient,original.answers.recipient);assert.equal(reopened.answers.household,"One adult beneficiary");assert.throws(()=>validateState(reopened,true));
});
test("England/Wales family instruments use the intended contingent gifts, trusts and local guardian law",()=>{
 for(const region of ["ENG","WLS"]) for(const household of ["Partner, then children","Children first"]){
 const state=fixture(home("GB",region),{household,extra:"Give a fixed sum of money",extraAmount:"500",extraRecipient:"Martin Kim"});const p=profile(state.place),a=state.answers,txt=sections(p,a).flat().join(" ");
 assert.deepEqual(validateState(state,true),state);for(const token of [a.children[0],a.trustee,a.coTrustee,"section 5 of the Children Act","later born alive","Section 33"]) assert.ok(txt.includes(token),token);
 assert.doesNotMatch(txt,/Ontario|90 days/);assert.match(signing(p).join(" "),/Dating is essential/);
 assert.equal(readAnswer(questions(p,a).find(q=>q.id==="coTrustee"),a.trustee,a).value,undefined);
 }});
test("97 locations fail closed off loopback and the currency stays local",()=>{
 let n=0;for(const country of Object.keys(markets))for(const region of Object.keys(regions[country]||{"":1})){const p=profile(home(country,region));for(const mode of ["workbench","local","public","closed",undefined])assert.equal(documentUse(p,mode,"willforfree.com"),"closed");if(supportsGifts(p))assert.match(giftCurrency(p),/^[A-Z]{3}$/);n++;}assert.equal(n,97);
});
test("old personalized files in newly fixed states import as wishes only, never into the static will",()=>{
 const old=fixture(home("US","UT"));old.place=home("US","NC");
 // Reproduce the previous schema (before the extra eligibility checks).
 let drop=false;for(const k of Object.keys(old.answers)){drop ||= k==="firstInstrument";if(drop)delete old.answers[k];}
 const s=validateState(old,false,true);assert.equal(s.purpose,"planning");assert.equal(s.answers.maker,old.answers.maker);
 assert.ok(s.record.some(([,v])=>v===old.answers.recipient));assert.throws(()=>validateState(old,true));
 assert.deepEqual(validateState(s),s);
});
test("a positive survival choice changes gifts and alternates, not offices, protected rights, intestacy or official forms",()=>{
 for(const where of [home("CA","BC"),home("CA","PE"),home("CA","SK"),home("CA","NB"),home("AU","NSW"),home("US","MI"),home("US","LA")]) {
  const s=fixture(where),p=profile(where),q=questions(p,s.answers).find(q=>q.id==="surviveThirty");assert.match(q.prompt,/two days/);assert.equal(readAnswer(q,"No or unsure").stop,true);
  assert.match(sections(p,s.answers).flat().join(" "),/must survive me by at least 30 days/);
  delete s.answers.surviveThirty;assert.throws(()=>validateState(s,true));assert.doesNotMatch(sections(p,s.answers).flat().join(" "),/must survive me by at least 30 days/);
 }
 for(const where of [home("US","CA"),home("US","TX"),home("CA","ON"),home("GB","ENG"),home("SK")]){
  const s=fixture(where);assert.equal(s.answers.surviveThirty,undefined);
 }
});
test("Maine's alternative is a blank statutory publication inaccessible through another jurisdiction",()=>{
 const s={version:2,place:home("US","ME"),purpose:"statutory",answers:{}};
 assert.deepEqual(validateState(s,true),s);assert.throws(()=>validateState({...s,place:home("US","MA")},true));assert.throws(()=>validateState({...s,answers:{maker:"Alex Chen"}},true));
});
test("U.S. respondents must confirm who takes a failed gift before a personal will is produced",()=>{
  for (const region of ["MI", "WI", "LA"]) {
    const state = fixture(home("US", region));
    const place = profile(state.place);
    const question = questions(place, state.answers).find(q => q.id === "usSubstituteGifts");
    assert.match(interviewCards(question, place)[0].title, /even if they leave children/);
    assert.equal(readAnswer(question, "No or unsure").stop, true);
    assert.match(sections(place, state.answers).flat().join(" "), /no child or other descendant/);
    delete state.answers.usSubstituteGifts;
    assert.doesNotThrow(() => validateState(state, false, true));
    assert.throws(() => validateState(state, true));
    assert.doesNotMatch(sections(place, state.answers).flat().join(" "), /no child or other descendant/);
  }
  for (const region of ["CA", "TX", "CO"]) {
    const state = fixture(home("US", region));
    assert.equal(questions(profile(state.place), state.answers).some(q => q.id === "usSubstituteGifts"), false);
  }
});
test("Oklahoma's court restriction and the relevant U.S. signing instructions survive a saved-session import",()=>{
  const state = fixture(home("US", "OK"));
  const place = profile(state.place);
  const question = questions(place, state.answers).find(q => q.id === "okCourtOrder");
  assert.match(interviewCards(question, place)[0].title, /including a limited one/);
  assert.equal(readAnswer(question, "No or unsure").stop, true);
  delete state.answers.okCourtOrder;
  assert.equal(state.answers.independentChoice, "Yes, all apply");
  assert.throws(() => validateState(state, true));
  assert.match(signing(place).join(" "), /district judge/);
  assert.match(signing(profile(home("US", "CA"))).join(" "), /first read aloud/);
  const louisiana = profile(home("US", "LA"));
  assert.match(louisiana.rule, /write the whole will by hand/i);
  assert.match(signing(louisiana).join(" "), /two credible witnesses to prove/);
});
test("Texas's publisher-specific family lists require a fresh choice for both child and childless editions",()=>{
  for (const descendants of ["I have children or grandchildren", "No children or grandchildren"]) {
    const state = fixture(home("US", "TX"), {descendants});
    const place = profile(state.place);
    const question = questions(place, state.answers).find(q => q.id === "txFamilyScope");
    assert.match(interviewCards(question, place, state.answers)[0].title, descendants.startsWith("I have") ? /later generation/ : /never had a child/);
    assert.equal(readAnswer(question, "No or unsure").stop, true);
    delete state.answers.txFamilyScope;
    delete state.answers.courtOutright; // The historical interview predates both confirmations.
    assert.doesNotThrow(() => validateState(state, false, true));
    assert.throws(() => validateState(state, true));
  }
});
test("NZ does not rely on the absence of dependence to rule out a parent's claim",()=>{
 const where=home("NZ"),s=fixture(where),q=questions(profile(where),s.answers).find(q=>q.id==="nzParentsPromises");
 assert.match(q.prompt,/no surviving parent/);assert.match(q.prompt,/work, services or care/);assert.equal(readAnswer(q,"No or unsure").stop,true);
});

test("Canadian named gifts require a fresh instruction and preserve Ontario family-branch gifts",()=>{
  for (const region of Object.keys(regions.CA)) {
    const state=fixture(home("CA",region));
    const p=profile(state.place);
    const check=questions(p,state.answers).find(q=>q.id==="canadianFailedGifts");
    const clauses=sections(p,state.answers).map(([,body])=>body);
    assert.equal(Boolean(check),region!=="QC");
    assert.equal(clauses.includes(canadianGiftClause),region!=="QC");
    if (!check) continue;
    assert.equal(readAnswer(check,"No or unsure").stop,true);
    assert.equal(interviewCards(check,p)[0].yesPass,true);
    delete state.answers.canadianFailedGifts;
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
  const family=fixture(home("CA","ON"),{household:"Children first",extra:"Give a fixed sum of money",extraAmount:"500",extraRecipient:"Avery Morgan"});
  const body=sections(profile(family.place),family.answers).flat().join(" ");
  assert.ok(body.includes(canadianGiftClause));
  assert.match(body,/Avery Morgan if they survive me.*falls into the residue/);
  assert.match(body,/descendants take their parent’s share by representation/);
});

test("Texas distinguishes a spouse from a child, and conflicting older entries can only issue private notes",()=>{
  const state=fixture(home("US","TX"),{marriage:"Married, spouse living",descendants:"I have children or grandchildren"});
  const p=profile(state.place);
  const q=questions(p,state.answers).find(q=>q.id==="formChildren");
  assert.ok(readAnswer(q,"Avery Morgan, ALEX MORGAN",state.answers).error);
  assert.deepEqual(readAnswer(q,"Avery Morgan, Alex Jordan Morgan",state.answers).value,["Avery Morgan","Alex Jordan Morgan"]);
  state.answers.formChildren=[state.answers.spouse];
  delete state.answers.courtOutright;
  assert.throws(()=>validateState(state,true));
  const notes=validateState(state,false,true);
  assert.equal(validateState(notes,true).purpose,"planning");
  assert.equal(notes.record.filter(([,value])=>value===state.answers.spouse).length,2);
});

test("spouse-first court forms require the outright gift choice and explain which survival rule applies",()=>{
  for (const [region,options,selected] of [
    ["CA",{},true],["CA",{caBalance:"2 · Descendants only"},false],
    ["TX",{txChoice:"Choice 1 · Spouse first"},true],["TX",{txChoice:"Choice 2 · Children first"},false],
  ]) {
    const state=fixture(home("US",region),options);
    const p=profile(state.place),check=questions(p,state.answers).find(q=>q.id==="courtOutright");
    assert.equal(Boolean(check),selected);
    if (selected) {
      assert.equal(interviewCards(check,p)[0].title,courtOutrightChoice);
      assert.deepEqual(interviewCards(check,p)[0].lines,[helpFor("survival",p)]);
      assert.equal(readAnswer(check,"No or unsure").stop,true);
      delete state.answers.courtOutright;
      assert.deepEqual(validateState(state,false,true).answers,state.answers);
      assert.throws(()=>validateState(state,true),/remaining questions/);
    }
    assert.match(helpFor("survival",p),region==="CA"?/120 hours/:/30 days/);
    assert.match(helpFor("signing",p),region==="CA"?/sign in California/:/sign in Texas/);
  }
});

test("fixed and statutory forms explain their own survival timing and keep witness help about the people signing",()=>{
  for (const region of ["AZ","CO","FL","KY","MN","NC","OH","ME"]) {
    const p=profile(home("US",region));
    if (region==="ME") p.route="statutory";
    const expected=region==="FL"?/no general five-day/:/120 hours/;
    assert.match(helpFor("survival",p),expected);
    assert.match(signing(p).join(" "),expected);
    assert.match(helpFor("witness",p),/independent/);
  }
  assert.match(helpFor("survival",profile(home("US","ME"))),/30 days/);
  assert.match(signing(profile(home("US","PA"))).join(" "),/two competent witnesses must give an oath or affirmation/);
  assert.match(after(profile(home("US","WA"))).join(" "),/30 days.*40 days/);
  assert.match(after(profile(home("NZ"))).join(" "),/before the ceremony/);
  assert.doesNotMatch(after(profile(home("CA","ON"))).join(" "),/Marriage can revoke/);
});

test("Maine and Texas explain the effect of the publisher's blanks before the visitor signs",()=>{
  const maine = {...profile(home("US","ME")),route:"statutory"};
  assert.match(signing(maine).join(" "),/choice B.*no space for the amount/i);
  const choiceInstructions = signing(maine).find(line=>line.startsWith("Initial only one box."));
  assert.match(choiceInstructions,/initial A and sign.*initial C and sign/);
  assert.doesNotMatch(choiceInstructions,/choice B|A or B/i);
  assert.match(helpFor("gifts",maine),/ask the probate court for a form with an amount field/);
  assert.match(helpFor("witness",maine),/two independent witnesses/);
  const texas = profile(home("US","TX"));
  const state = fixture(home("US","TX"),{txChoice:"Choice 2 · Children first"});
  const list = questions(texas,state.answers);
  const lines = id => interviewCards(list.find(q=>q.id===id),texas,state.answers)[0].lines.join(" ");
  assert.match(lines("txChoice"),/sign both choices.*leave both unsigned.*choice 1.*30 days/);
  assert.match(lines("giftFit"),/surviving spouse can keep using the family home/);
  assert.match(helpFor("home",texas),/your share of community property/);
  assert.doesNotMatch(helpFor("home",{...texas,route:"planning"}),/community property/);
  assert.match(after(profile(home("US","IL"))).join(" "),/clerk of the proper county immediately/);
  const california = profile(home("US","CA"));
  const choices = questions(california,{});
  assert.match(interviewCards(choices.find(q=>q.id==="caBond"),california,{})[0].lines.join(" "),/court can require a bond.*good cause/);
  assert.match(interviewCards(choices.find(q=>q.id==="caBalance"),california,{})[0].lines.join(" "),/domestic partner keeps their own share/);
});

test("the court-form reading confirmation identifies the current signed language at the point of choice",async t=>{
  t.mock.method(globalThis,"fetch",async path=>Response.json(JSON.parse(await readFile(new URL("../public"+path,import.meta.url),"utf8"))));
  const courtCard = region => {
    const p = profile(home("US",region));
    const q = questions(p,{}).find(query=>query.id==="formFinish");
    return interviewCards(q,p,{})[0].lines;
  };
  try {
    await setLanguage("fr",{remember:false});
    assert.match(courtCard("CA")[0],/official form is in English/);
    assert.match(courtCard("TX")[0],/official form is in English/);
    await setLanguage("es",{remember:false});
    assert.match(courtCard("TX")[0],/bilingual in English and Spanish/);
    assert.match(courtCard("CA")[0],/official form is in English/);
  } finally {
    await setLanguage("en",{remember:false});
  }
});

test("a failed late scope check can keep all gifts and long family notes without becoming a will",()=>{
 const place=home("CA","ON"),p=profile(place),note="My family remembers our long walks. ".repeat(16).trim();
 const s=fixture(place,{household:"Children first",extra:"Give a particular keepsake",extraItem:"blue silver ring",extraRecipient:"Mira Sloan",extraAfter:"Add personal notes",noteTopic1:"A message or another wish",noteText1:note,noteTopic2:"Continue to review"});
 const notes=preserveAsNotes(p,s,"People who may have a claim");assert.deepEqual(validateState(notes,true),notes);
 for(const t of [s.answers.care,s.answers.trustee,s.answers.extraItem,s.answers.extraRecipient,note])assert.ok(notes.record.some(([,v])=>v===t));
 assert.throws(()=>validateState({...s,record:notes.record},true),/cannot be used/);
});

test("Texas preserves every English alternate on a language switch and enforces the bilingual court's eight-row limit", async t=>{
  t.mock.method(globalThis, "fetch", async path => new Response(await readFile(new URL("../public"+path, import.meta.url))));
  const place = home("US", "TX");
  const list = ["Reese Harper", "Drew Hart", "Lila Hart", "Rosa Sage", "Luca Ray", "Otis Bell", "Rory Lake", "Mina Brook", "Amy Reed", "Gray King"];
  const state = fixture(place, {marriage:"Married, spouse living", descendants:"No children or grandchildren", txAlternates:list.join(", ")});
  assert.deepEqual(validateState(state, true).answers.txAlternates, list);
  try {
    await setLanguage("es", {remember:false});
    const p = profile(place);
    const question = questions(p, state.answers).find(q => q.id === "txAlternates");
    assert.equal(question.max, 8);
    assert.match(interviewCards(question, p)[0].title, /30 days.*8 full names/);
    assert.ok(readAnswer(question, list.slice(0,9).join(", "), state.answers).error);
    assert.deepEqual(readAnswer(question, list.slice(0,8).join(", "), state.answers).value, list.slice(0,8));
    assert.deepEqual(validateState(state, false, true).answers.txAlternates, list);
    assert.throws(() => validateState(state, true), /Choose English/);
    const edited = structuredClone(state);
    edited.answers.txAlternates = list.slice(0,8);
    assert.deepEqual(validateState(edited, true).answers.txAlternates, list.slice(0,8));
  } finally { await setLanguage("en", {remember:false}); }
  assert.deepEqual(validateState(state, true).answers.txAlternates, list);
});

test("Texas fetches the full court-form set and retries a failed set as a whole", async t => {
  const {hasPublisherForm, loadTexasForms} = await import("../public/publisher-forms.js");
  const paths = ["married-children","married-no-children","single-children","single-no-children"]
    .map(family=>"/forms/tx-"+family+".pdf");
  const seen = [];
  let fail = true;
  t.mock.method(globalThis, "fetch", async (path, options) => {
    seen.push([path,options.method || "GET"]);
    const status = fail && path===paths[2] ? 503 : 200;
    return new Response(path,{status,headers:{"content-type":"application/pdf"}});
  });
  const tx=profile({country:"US",region:"TX"});
  assert.equal(await hasPublisherForm(tx),false);
  fail=false;
  const [available, bundle]=await Promise.all([hasPublisherForm(tx),loadTexasForms()]);
  assert.equal(available,true);
  assert.deepEqual(seen,[...paths,...paths].map(path=>[path,"GET"]));
  for (const path of paths) {
    assert.equal(new TextDecoder().decode(bundle.get(path.slice(7,-4))),path);
    assert.equal(await loadTexasForms(),bundle);
  }
  assert.equal(seen.length,8);
});
