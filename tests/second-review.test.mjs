import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {fixture} from "./fixtures.mjs";
import {copyByHand,executionProfile,markets,profile,regions} from "../public/markets.js";
import {after,sections,signing} from "../public/document.js";
import {cash,item,supportsGifts} from "../public/extras.js";
import {questions,readAnswer,validateState} from "../public/will.js";
import {interviewCards} from "../public/interview-copy.js";
import {californiaDefaultHeirs,jointWillRules,priorDesignationGuide} from "../public/procedures.js";
import {usWillGuidance} from "../public/us-sources.js";
import {detectLanguage,display,editionNotice,languages,setLanguage,sourceChoice,sourcePattern} from "../public/locale.js";
import {hasSensitive} from "../public/flow.js";

test("the four Australian parent screens and South Australian care screen need new affirmative answers",()=>{
  for(const region of ["ACT","NT","TAS","WA","SA","NSW","QLD","VIC"]) {
    const state=fixture({country:"AU",region});
    const id=region==="SA"?"saFamilyCare":"australianParents";
    const q=questions(profile(state.place),state.answers).find(q=>q.id===id);
    if(["NSW","QLD","VIC"].includes(region)) {assert.equal(q,undefined);continue;}
    assert.equal(readAnswer(q,"No or unsure").stop,true);
    assert.equal(interviewCards(q,profile(state.place),state.answers)[0].yesPass,true);
    delete state.answers[id];
    assert.deepEqual(validateState(state,false,true).answers,state.answers);
    assert.throws(()=>validateState(state,true),/remaining questions/);
  }
});

test("a Slovak testator names one heir and a previously named backup stays in private notes",()=>{
  const state=fixture({country:"SK",region:""});
  const p=profile(state.place);
  assert.equal(state.answers.backup,undefined);
  assert.equal(state.answers.slovakHeir,"Yes, all apply");
  const clause=sections(p,state.answers).find(([title])=>title==="Who inherits")[1];
  assert.ok(clause.includes(state.answers.recipient));
  assert.match(clause,/sole heir.*law of intestacy/);
  const old=structuredClone(state);
  delete old.answers.slovakHeir;
  old.answers.backup="Morgan West";old.answers.protectedShares="Yes, all apply";
  assert.throws(()=>validateState(old,true));
  const notes=validateState(old,false,true);
  assert.equal(notes.purpose,"planning");
  assert.ok(notes.record.some(([,v])=>v==="Morgan West"));
  assert.equal(validateState(notes,true).purpose,"planning");
});

test("language choices distinguish the published will, typed consent and private names",async t=>{
  t.mock.method(globalThis,"fetch",async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL("../public"+path,import.meta.url)))}));
  assert.equal(detectLanguage(["fr-Cyrl","nb-NO"]),"nb");
  const ok=profile({country:"US",region:"OK"}),state=fixture({country:"US",region:"OK"});
  try {
    for(const code of Object.keys(languages)){
      await setLanguage(code,{remember:false});
      for(const key of ["US-CO","US-NC","US-CA","US-ME","US-TX"]){
        const p=profile({country:"US",region:key.slice(3)});
        if(key==="US-ME")p.route="statutory";
        const notice=editionNotice(p);
        if(code==="en")assert.equal(notice,"");
        else {assert.notEqual(display(notice),notice,code+" "+key);assert.equal(notice.includes("bilingual"),code==="es" && key==="US-TX");}
      }
      const card=interviewCards(questions(ok,state.answers).find(q=>q.id==="okCourtOrder"),ok,state.answers)[0];
      if(code!=="en"){
        for(const o of card.options)assert.equal(sourceChoice(display(o.label),card.options)?.value,o.value,code);
        assert.ok(readAnswer({id:"children",kind:"names"},"Mira Lake\n"+display("my sister")).error,code);
      }
      if(code==="it")assert.ok(hasSensitive("la password è lilla"));
      if(code==="pt")assert.ok(hasSensitive("a senha é violeta"));
      if(code==="sv")assert.ok(hasSensitive("mitt lösenord är violett"));
    }
  } finally {await setLanguage("en",{remember:false});}
});

test("every location’s operative clauses, signing, aftercare and interview cards have catalog entries",async()=>{
  const required=new Set();
  const add=text=>{
    if(!text)return;
    const key=sourcePattern(text).replace(/\s+/gu," ").trim();
    if(/\p{L}/u.test(key))required.add(key);
  };
  for(const country of Object.keys(markets)){
    for(const region of Object.keys(regions[country] || {"":true})){
      const place={country,region},p=profile(place),branches=[{},{priorWill:"Yes"}];
      if(p.handOption)branches.push({execution:copyByHand});
      if(p.parentPlan)branches.push({household:"Children first"},{household:"Partner, then children",extraRecipient:"Avery Morgan"});
      if(p.key==="US-TX")for(const marriage of ["Married, spouse living","Single, widowed or divorced"])
        for(const descendants of ["I have children or grandchildren","No children or grandchildren"])branches.push({marriage,descendants});
      if(p.key==="US-AK")branches.push({orgGift1:"Give money",orgName1:"Cedar Vale Museum",orgAmount1:"307"});
      add(priorDesignationGuide(p));
      add(jointWillRules[p.key]);
      add(usWillGuidance[p.key]?.familySupport);
      add(usWillGuidance[p.key]?.executor);
      if(p.key==="US-CA")add(californiaDefaultHeirs);
      const gifts=supportsGifts(p) && p.route!=="official" ? {extra:item,extraItem:"silver ring",extraRecipient:"Mira Lake",extraAfter:cash,extraAmount2:"1250",extraRecipient2:"Ben Reed"} : {};
      for(const branch of branches){
        const {answers}=fixture(place,{...gifts,...branch});
        const effective=executionProfile(p,answers);
        if(!["fixed","official"].includes(p.route))for(const [heading,clause] of sections(effective,answers)){add(heading);add(clause);}
        for(const line of [...signing(effective),...after(effective,answers)])add(line);
        for(const q of questions(p,answers)){
          add(q.label);
          for(const c of interviewCards(q,p,answers)){
            for(const line of [c.title,c.tip,...c.lines,...c.options.map(o=>o.label)])add(line);
          }
        }
      }
      if(p.key==="US-ME")for(const line of [...signing({...p,route:"statutory"}),...after({...p,route:"statutory"})])add(line);
    }
  }
  for(const code of Object.keys(languages).filter(code=>code!=="en")){
    const catalog=JSON.parse(await readFile(new URL("../public/locales/"+code+".json",import.meta.url)));
    for(const key of required)assert.ok(Object.hasOwn(catalog,key),code+" "+key);
  }
});
