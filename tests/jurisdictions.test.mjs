import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./fixtures.mjs";
import {copyByHand,executionProfile,profile,markets,regions} from "../public/markets.js";
import {questions,readAnswer,validateState,preserveAsNotes} from "../public/will.js";
import {after,sections,signing} from "../public/document.js";
import {interviewCards} from "../public/interview-copy.js";
import {helpFor} from "../public/interview-help.js";
import {canadianGiftClause, courtOutrightChoice, texasChildlessSpouseGift} from "../public/survival.js";
import {languages,setLanguage} from "../public/locale.js";
import {supportsGifts,giftCurrency,wishesProfile} from "../public/extras.js";
import {skipped} from "../public/planning.js";
import {documentUse} from "../public/release.js";
import {readFile} from "node:fs/promises";
import {appointmentContacts, appointmentInterpreter, appointmentPapers, appointmentRequest, depositCustody, dutchWitnesses, europeanNetherlands, procedures} from "../public/procedures.js";
const home=(country,region="")=>({country,region});
test("Ontario family branches and minor trusts use the same survival rule for a later-born descendant",()=>{
  for(const execution of ["Print and sign with two witnesses",copyByHand]){
    const place=home("CA","ON"),state=fixture(place,{execution,household:"Children first"});
    const p=executionProfile(profile(place),state.answers),will=sections(p,state.answers).flat().join(" ");
    assert.match(will,/conceived before my death and later born alive as surviving me/);
    assert.match(will,/conceived and born alive after my death.*section 1.1/);
    assert.match(will,/share vests upon live birth and satisfaction of any applicable statutory conditions/);
    assert.match(after(p,state.answers).join(" "),/six months.*third anniversary.*court declaration/);
    const q=questions(p,state.answers).find(q=>q.id==="ontarioLaterBirth");
    assert.equal(readAnswer(q,"No or unsure").stop,true);
    delete state.answers.ontarioLaterBirth;
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
  const single=fixture(home("CA","ON"));
  assert.ok(!("ontarioLaterBirth" in single.answers));
  assert.doesNotMatch(after(profile(single.place),single.answers).join(" "),/Estate Registrar/);
});
test("the Czech heir's quarter is disclosed in the issued terms only when there is a legacy",()=>{
  const place=home("CZ"),p=profile(place);
  for(const [overrides,expectGift] of [[{},false],[{extra:"Give a fixed sum of money",extraAmount:"90000",extraRecipient:"Circe Dell"},true]]){
    const {answers}=fixture(place,overrides);
    assert.equal(sections(p,answers).flat().join(" ").includes("one quarter"),expectGift);
    assert.equal(after(p,answers).join(" ").includes("section 1633"),expectGift);
  }
});
test("a widow, an undivided estate and a vulnerable stepchild cannot be cleared by old general answers",()=>{
  for(const [place,id,term] of [
    [home("DE"),"germanBindingWill",/joint will with a spouse who has since died/],
    ...["FI","SE"].map(c=>[home(c),"priorSpouseHeirs",/unable to leave their heirs’ share/]),
    ...["DK","IS","NO"].map(c=>[home(c),"undividedEstate",/undivided with their heirs/]),
    [home("AU","SA"),"saVulnerableStepchild",/former spouse or domestic partner/],
  ]) {
    const p=profile(place),state=fixture(place),q=questions(p,state.answers).find(x=>x.id===id);
    assert.match(interviewCards(q,p,state.answers)[0].title,term);
    assert.ok(readAnswer(q,"No or unsure").stop,place.country);
    const old=structuredClone(state);delete old.answers[id];
    assert.deepEqual(validateState(old,false,true).answers,old.answers);
    assert.throws(()=>validateState(old,true),/remaining questions/);
    const unresolved={...state,answers:{...state.answers,[id]:skipped},issues:{[id]:[0,"No or unsure"]}};
    assert.equal(wishesProfile(p,validateState(unresolved,true).answers,unresolved.issues).route,"planning");
  }
});
test("a partner taking the residue does not erase a separate gift to the same maker’s adult child",()=>{
  for(const place of [home("CA","ON"),home("GB","ENG"),home("GB","WLS")]) {
    const p=profile(place),state=fixture(place,{household:"Partner, then children",children:"Harper Thorne, Jade Thorne",partner:"Rory Thorne",extra:"Give a fixed sum of money",extraRecipient:"Harper Thorne",extraAmount:"760"});
    const a=state.answers,will=sections(p,a),qs=questions(p,a);
    assert.match(will.find(([label])=>label==="Separate gift 1")[1],/760 to Harper Thorne if they survive me/);
    assert.match(will.find(([label])=>label==="Gifts of my remaining estate")[1],/residue of my estate to my spouse or partner, Rory Thorne/);
    assert.ok(readAnswer(qs.find(q=>q.id==="childSeparateGift"),"No or unsure").stop);
    assert.equal(qs.some(q=>q.id==="declinedGiftGB"),place.country==="GB");
    if(place.country==="GB"){
      assert.match(interviewCards(qs.find(q=>q.id==="declinedGiftGB"),p,a)[0].lines.join(" "),/partner refuses the residue.*child refuses their share/);
      assert.ok(will.some(([label,body])=>label==="If a separate gift fails" && /Section 33.*does not apply to the separate gifts/.test(body)));
      assert.match(after(p).join(" "),/affected gift.*court.*younger person is generally presumed/);
    }
  }
});
test("Yukon and Québec distinguish a living heir’s refusal from death in both signed and handwritten text",()=>{
  for(const region of ["YT","QC"])for(const execution of ["Print and sign with two witnesses",copyByHand]){
    const place=home("CA",region),state=fixture(place,{execution,...(region==="YT"?{extra:"Give a particular keepsake",extraItem:"Ember brooch",extraRecipient:"Cleo Ash"}:{})});
    const p=executionProfile(profile(place),state.answers),will=sections(p,state.answers);
    const disposition = region === "QC" ? /renounces the whole inheritance.*backup takes it.*indivisible/ : /validly refuses a share of the residue.*backup takes that share/;
    assert.ok(will.some(([label,text])=>label==="Backup beneficiary" && disposition.test(text)));
    const old=structuredClone(state);delete old.answers[region === "QC" ? "wholeInheritanceRefusal" : "residueRefusal"];
    assert.deepEqual(validateState(old,false,true).answers,old.answers);assert.throws(()=>validateState(old,true),/remaining questions/);
    if(region==="YT")assert.ok(will.some(([,text])=>/refuses a separate gift.*falls into the residue/.test(text)));
  }
});
test("refusing a share of the residue is a fresh decision distinct from refusing a specific gift or caring for a pet",()=>{
  for(const place of [home("CA","AB"),home("CA","BC"),home("CA","NB"),home("AT"),home("NO"),home("PL")]) {
    const ca=place.country==="CA", bc=place.region==="BC", state=fixture(place,{extra:"Give a fixed sum of money",extraAmount:"610",extraRecipient:"Lena Brook",
      ...(bc?{pets:"Yes",petNames:"Moss",petCarer:"Cora Elm",petBackup:"Lyle Dale",petPlan:"Transfer ownership of all my pets"}:{})});
    const p=profile(place), a=state.answers;
    const body=sections(p,a).map(([,line])=>line).join(" ");
    assert.match(body, place.country === "PL" ? /renounces the whole inheritance.*backup takes it.*indivisible/ : /validly refuses a share of the residue.*backup takes that share/);
    assert.equal(/individual refuses a separate gift/.test(body),ca);
    if (p.civil) {
      const familyRights = questions(p,a).find(q=>q.id==="protectedShares");
      const [card] = interviewCards(familyRights,p,a);
      assert.equal(familyRights.prompt,card.lines.join(" "));
    }
    if(bc){
      assert.match(body,/Lyle Dale if this person survives me and is willing and able/);
      assert.match(body,/If no named carer takes my animals.*residue/);
      assert.match(body,/at least 30 days/);
    }
    const refusalKey = p.key === "PL" ? "wholeInheritanceRefusal" : "residueRefusal";
    for(const id of ca?[refusalKey,"separateGiftRefusal"]:[refusalKey]) {
      const q=questions(p,a).find(v=>v.id===id);
      assert.equal(readAnswer(q,"No or unsure").stop,true);
      assert.ok(interviewCards(q,p,a)[0].lines.includes(q.prompt));
    }
    const old=structuredClone(state);
    delete old.answers[refusalKey]; delete old.answers.separateGiftRefusal;
    assert.deepEqual(validateState(old,false,true).answers,old.answers);
    assert.throws(()=>validateState(old,true),/remaining questions/);
  }
});
test("earlier Québec and Polish confirmations cannot settle the new whole-inheritance choice",()=>{
  for (const place of [home("CA","QC"), home("PL")]) {
    const current = fixture(place);
    const old = structuredClone(current);
    delete old.answers.wholeInheritanceRefusal;
    old.answers.residueRefusal = "Yes, all apply";
    old.reviewNotes = [{id:"residueRefusal", part:0, question:"May part of the residue be refused?", text:"Discuss this gift with my adviser."}];
    const resumed = validateState(old, false, true);
    assert.deepEqual(resumed.answers, Object.fromEntries(Object.entries(current.answers).filter(([id])=>id!=="wholeInheritanceRefusal")));
    assert.deepEqual(resumed.reviewNotes,[{...old.reviewNotes[0],id:"wholeInheritanceRefusal"}]);
    assert.throws(()=>validateState(old,true),/remaining questions/);
    const q = questions(profile(place),resumed.answers).find(q=>q.id==="wholeInheritanceRefusal");
    assert.match(q.prompt,/whole inheritance.*indivisible/);
    resumed.answers[q.id]=readAnswer(q,"Yes, all apply").value;
    assert.deepEqual(validateState(resumed,true).answers,current.answers);
    old.answers.residueRefusal=skipped;
    old.issues={residueRefusal:[0,"No or unsure","I want advice about this gift."]};
    const pending=validateState(old,false,true);
    assert.deepEqual(pending.issues,{wholeInheritanceRefusal:old.issues.residueRefusal});
    assert.equal(wishesProfile(profile(place),pending.answers,pending.issues).use,"planning");
    assert.doesNotMatch(sections(profile(place),pending.answers).flat().join(" "),/renounces the whole inheritance/);
  }
});
test("New Brunswick gives an express disposition before or after commencement on both signing routes",()=>{
  const place = home("CA","NB");
  for (const execution of [undefined,copyByHand]) {
    const state = fixture(place,{...(execution?{execution}:{}),extra:"Give a fixed sum of money",extraAmount:"750",extraRecipient:"Addison Grove"});
    const p = executionProfile(profile(place),state.answers);
    const will = sections(p,state.answers).flat().join(" ");
    assert.match(will,/at least 30 days/);
    assert.match(will,/validly refuses a share of the residue.*backup takes that share/);
    assert.match(will,/individual refuses a separate gift.*falls into the residue/);
    assert.match(after(p).join(" "),/Former sections 15.1 and 16.*Marriage on or after that date.*section 15.02/);
    assert.equal(signing(p).join(" ").includes("legal minimum age for witnesses is 19"),!execution);
    delete state.answers.residueRefusal;
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
});
for (const [region,scope] of [
  ["NT",/section 22.*after their father’s death/i],
  ["NU",/in Nunavut.*if your child is born after your death/i],
  ["YT",/may have a protected share under section 21 of Yukon/i],
]) test(region+" discloses the local share for a child born after death on both will routes",()=>{
  const place = home("CA",region);
  for (const execution of [undefined,copyByHand]) {
    const state = fixture(place,execution ? {execution} : {});
    const p = executionProfile(profile(place),state.answers);
    const question = questions(p,state.answers).find(q=>q.id==="territorialChildShare");
    assert.match(question.prompt,scope);
    assert.match(question.prompt,/makes no provision.*court fixes.*reduced proportionately/i);
    assert.ok(interviewCards(question,p,state.answers)[0].lines.includes(question.prompt));
    assert.ok(after(p).includes(question.prompt));
    assert.equal(readAnswer(question,"No or unsure").stop,true);
    assert.ok(!sections(p,state.answers).flat().join(" ").includes(question.prompt));
    delete state.answers.territorialChildShare;
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
  assert.ok(!questions(profile(home("CA","ON")),{}).some(q=>q.id==="territorialChildShare"));
});
test("Texas custody through age 20 and a court nomination for an adult child have separate fresh confirmations",()=>{
  for(const descendants of ["I have children or grandchildren","No children or grandchildren"]) {
    const state=fixture(home("US","TX"),{descendants}), p=profile(state.place), qs=questions(p,state.answers);
    const custody=qs.find(q=>q.id==="txCustodyTerms"), nomination=qs.find(q=>q.id==="txGuardianScope");
    assert.match(custody.prompt,/under 21.*custodian/);
    assert.equal(readAnswer(custody,"No or unsure").stop,true);
    if(descendants.startsWith("I have")){
      assert.match(nomination.prompt,/incapacitated adult child/);
      assert.match(helpFor("guardian",p,{descendants}),/incapacitated adult child.*under 21/);
      assert.ok(interviewCards(qs.find(q=>q.id==="familyGuardian"),p,state.answers)[0].lines.includes(nomination.prompt));
      assert.equal(readAnswer(nomination,"No or unsure").stop,true);
    }else assert.equal(nomination,undefined);
    delete state.answers.txGuardianScope; delete state.answers.txCustodyTerms;
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
});
test("a living heir's renunciation needs a fresh choice and an express disposition in the affected editions", () => {
  for (const country of ["CH","CZ","DE","EE","MT","PT"]) {
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
  delete state.answers.residueRefusal; // The historical file predates both checks.
  assert.deepEqual(validateState(state, false, true).answers, state.answers);
  assert.throws(() => validateState(state, true), /complete the remaining questions/);
});
test("Quebec screens recipients on both signing routes; an appointment-age check belongs only to the affected guided states",()=>{
  for(const overrides of [{},{execution:copyByHand}]){
    const state=fixture(home("CA","QC"),overrides),p=profile(state.place);
    const q=questions(p,state.answers).find(q=>q.id==="quebecCareRecipients");
    assert.match(q.prompt,/article 761.*volunteers.*spouse or close relative.*foster family/);
    assert.equal(readAnswer(q,"No or unsure").stop,true);
    delete state.answers.quebecCareRecipients;
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
  for(const [region,min] of [["AK",19],["AL",19],["NE",19],["UT",21],["CO",null],["PA",null]]){
    const state=fixture(home("US",region)),p=profile(state.place),q=questions(p,state.answers).find(q=>q.id==="executorAgeFit");
    if(!min){assert.equal(q,undefined);continue;}
    assert.match(q.prompt,new RegExp("at least "+min+" when appointed"));assert.equal(readAnswer(q,"No or unsure").stop,true);
    assert.ok(helpFor("executorFit",p).includes("at least "+min+" when appointed"));
    delete state.answers.executorAgeFit;assert.throws(()=>validateState(state,true),/remaining questions/);
  }
});
test("fixed will forms cannot be tailored by answers; official appointments require fresh consent",async()=>{
 for(const state of ["AZ","CO","FL","KY","MN","NC","OH"]){
 const p=profile(home("US",state));
 assert.equal(p.route,"fixed");assert.ok(questions(p,{}).every(q=>q.planStep));
 assert.throws(()=>validateState({version:2,place:home("US",state),answers:{recipient:"Alex Chen"}},true));assert.equal(validateState(fixture(home("US",state)),true).answers.orgGift1,"I’m done");
 const pdf=await readFile(new URL("../public/forms/basic/"+state+".pdf",import.meta.url));assert.equal(pdf.subarray(0,5).toString(),"%PDF-");
 }
 for(const country of ["NL","MT","PT"]){const state=fixture(home(country));assert.equal(profile(state.place).route,"deposit");
 assert.deepEqual(validateState(state,true),state);
 assert.ok(questions(profile(state.place),state.answers).some(q=>q.id==="officialMeeting"));
 delete state.answers.officialMeeting;assert.throws(()=>validateState(state,true));}
});
test("notarial kits identify the receiving office, signatures, witnesses and holder of the original", async()=>{
  const places = ["MT","NL","PT"];
  for(const country of places) {
    const state = fixture(home(country)), p = profile(state.place);
    const meeting = questions(p,state.answers).find(q=>q.id==="officialMeeting");
    assert.ok(interviewCards(meeting,p,state.answers)[0].lines.includes(appointmentRequest[country]));
    assert.ok(helpFor("signing",p).includes(appointmentRequest[country]));
    assert.equal(helpFor("custody",p),depositCustody[country]);
    assert.ok(after(p).includes(depositCustody[country]));
    assert.deepEqual(signing(p),procedures[country]);
    if(country!=="MT") {
      const independent = questions(p,state.answers).find(q=>q.id==="independentChoice");
      assert.ok(independent.prompt.includes(appointmentInterpreter));
      assert.ok(interviewCards(independent,p,state.answers)[0].lines.includes(appointmentInterpreter));
    }
  }
  assert.match(helpFor("witness",profile(home("MT"))),/Sign the act of delivery.*four working days.*Countersign the registrar’s note/s);
  assert.match(helpFor("witness",profile(home("NL"))),/may require two witnesses/);
  assert.ok(signing(profile(home("NL"))).includes(dutchWitnesses));
  assert.match(helpFor("witness",profile(home("PT"))),/staff of that office.*interpreter cannot serve as a witness/i);
  assert.match(depositCustody.PT,/where the document is located within three days of learning/);
  const state=fixture(home("NL")), p=profile(state.place);
  const territorial=questions(p,state.answers).find(q=>q.id==="dutchEuropeanHome");
  assert.equal(territorial.prompt,europeanNetherlands);
  assert.equal(interviewCards(territorial,p,state.answers)[0].title,territorial.prompt);
  assert.equal(readAnswer(territorial,"No or unsure").stop,true);
  delete state.answers.dutchEuropeanHome;
  assert.deepEqual(validateState(state,false,true).answers,state.answers);
  assert.throws(()=>validateState(state,true),/remaining questions/);
  const translated = new Set([appointmentPapers,appointmentInterpreter,europeanNetherlands]);
  for(const country of places) {
    for(const text of [appointmentRequest[country],depositCustody[country],...procedures[country]])translated.add(text);
    for(const [label] of appointmentContacts[country])translated.add(label);
  }
  for(const language of Object.keys(languages).filter(code=>code!=="en")) {
    const catalog=JSON.parse(await readFile(new URL("../public/locales/"+language+".json",import.meta.url),"utf8"));
    for(const key of translated)assert.ok(catalog[key],language+" "+key);
  }
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
 const s=fixture(home("US","ME"),{},"statutory");
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
    delete state.answers.txCustodyTerms;
    delete state.answers.txGuardianScope;
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
    // A file predating the failed-gifts question also predates the later regional confirmations.
    delete state.answers.residueRefusal;
    delete state.answers.territorialChildShare;
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
  delete state.answers.txCustodyTerms;
  delete state.answers.txGuardianScope;
  assert.throws(()=>validateState(state,true));
  const notes=validateState(state,false,true);
  assert.equal(validateState(notes,true).purpose,"planning");
  assert.equal(notes.record.filter(([,value])=>value===state.answers.spouse).length,2);
});

test("spouse-first court forms require the outright gift choice and explain which survival rule applies",()=>{
  for (const [region,options,selected] of [
    ["CA",{},true],["CA",{caBalance:"2 · Descendants only"},false],
    ["TX",{txChoice:"Choice 1 · Spouse first"},true],["TX",{txChoice:"Choice 2 · Children first"},false],
    ["TX",{marriage:"Married, spouse living",descendants:"No children or grandchildren"},true],
    ["TX",{marriage:"Single, widowed or divorced",descendants:"No children or grandchildren"},false],
  ]) {
    const state=fixture(home("US",region),options);
    const p=profile(state.place),check=questions(p,state.answers).find(q=>q.id==="courtOutright");
    assert.equal(Boolean(check),selected);
    if (selected) {
      const childlessTexas=region==="TX" && state.answers.descendants==="No children or grandchildren";
      const card=interviewCards(check,p,state.answers)[0];
      assert.equal(card.title,childlessTexas ? "Do you want this provision in your will?" : courtOutrightChoice);
      assert.deepEqual(card.lines,[childlessTexas ? texasChildlessSpouseGift : helpFor("survival",p)]);
      assert.equal(readAnswer(check,"No or unsure").stop,true);
      delete state.answers.courtOutright;
      delete state.answers.txCustodyTerms;
      delete state.answers.txGuardianScope;
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
  assert.match(signing(maine).join(" "),/choice B on page 3.*fixed amount on the line.*sign below B/i);
  const choiceInstructions = signing(maine).find(line=>line.startsWith("Initial only one box."));
  assert.match(choiceInstructions,/initial A and sign.*initial C and sign/);
  assert.match(helpFor("gifts",maine),/fixed amount on the line/);
  assert.match(helpFor("witness",maine),/two independent witnesses/);
  const texas = profile(home("US","TX"));
  const state = fixture(home("US","TX"),{txChoice:"Choice 2 · Children first"});
  const list = questions(texas,state.answers);
  const lines = id => interviewCards(list.find(q=>q.id===id),texas,state.answers)[0].lines.join(" ");
  assert.match(lines("txChoice"),/sign both choices.*leave both unsigned.*choice 1.*30 days/);
  assert.match(lines("giftFit"),/surviving spouse can keep using the family home/);
  assert.match(helpFor("home",texas),/your share of community property/);
  assert.doesNotMatch(helpFor("home",{...texas,route:"planning"}),/community property/);
  assert.match(after(profile(home("US","IL"))).join(" "),/clerk of the circuit court in the proper county immediately/);
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

test("Maine rejects an older PDF at the same path and retries the pinned county edition",async t=>{
  const {hasPublisherForm, loadMaineForm, maineFormPath, mainePreviewUrl}=await import("../public/publisher-forms.js");
  const entries=JSON.parse(await readFile(new URL("../config/official-forms.json",import.meta.url),"utf8"));
  const expected=entries.find(form=>form.name==="me-statutory").sha256;
  assert.equal(maineFormPath,"/forms/me-statutory.pdf?edition="+expected);
  const originalFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=originalFetch;});
  const place={key:"US-ME",route:"statutory"};
  let content="%PDF-1.7 Previous edition";
  let requests=0;
  globalThis.fetch=async url=>{
    assert.equal(url,maineFormPath);
    requests++;
    return new Response(content,{headers:{"Content-Type":"application/pdf"}});
  };
  assert.equal(await hasPublisherForm(place),false);
  await assert.rejects(loadMaineForm(),/publisher’s form is unavailable/);
  assert.equal(requests,2);
  // A freshly extracted source edition can be used before installing publisher originals.
  try { content=await readFile(new URL("../public/forms/me-statutory.pdf",import.meta.url)); }
  catch(error){ if(error.code==="ENOENT")return; throw error; }
  const [available,verified]=await Promise.all([hasPublisherForm(place),loadMaineForm()]);
  assert.equal(available,true);
  assert.deepEqual(Buffer.from(verified),content);
  const [preview,secondPreview]=await Promise.all([mainePreviewUrl(),mainePreviewUrl()]);
  assert.equal(preview,secondPreview);
  const original=await originalFetch(preview);
  assert.equal(original.headers.get("content-type"),"application/pdf");
  assert.deepEqual(Buffer.from(await original.arrayBuffer()),content);
  assert.equal(requests,3);
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
