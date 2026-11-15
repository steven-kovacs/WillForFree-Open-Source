import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures.mjs";
import { markets,regions,profile } from "../public/markets.js";
import { questions,readAnswer,validateState } from "../public/will.js";
import { interviewCards, coveredLater, YES, STOP } from "../public/interview-copy.js";
import { manageTurn, chooseLocalTopic } from "../public/conversation.js";
import { safeTopic,topicsFor } from "../public/flow.js";
import { createTopicService } from "../lib/topic.mjs";
import { item,cash } from "../public/extras.js";
const on={country:"CA",region:"ON"},p=profile(on),base=fixture(on);
function steps(id,place=p,a=base.answers){const q=questions(place,a).find(q=>q.id===id);return {q,cards:interviewCards(q,place,a)};}
const said=(text,id,part=0)=>{const {q,cards}=steps(id);return manageTurn(text,q,cards[part],p);};
test("positive and negative questions interpret ordinary yes, no and uncertainty in the displayed direction",()=>{
  for(const [id,part,good,bad] of [["eligible",0,"yep","nope"],["estateScope",0,"no","yes"],["localLaw",0,"none of these","yes"],["residueMeaning",0,"yes","no"]]){
    assert.equal(said(good,id,part).value,YES);assert.equal(said(bad,id,part).value,STOP);assert.equal(said("I don't know",id,part).value,STOP);
    assert.notEqual(said("yes but I'm not certain",id,part).value,YES);
  }
  assert.equal(said("what does that mean?","localLaw").type,"clarify");
});
test("gifts in conversation only propose the next question; they never set names, amounts or terms",()=>{
  assert.deepEqual(said("My car","extra"),{type:"gift",value:item,cue:"vehicle"});assert.equal(said("money for my brother","extra").value,cash);
  assert.equal(said("my car, but it's leased","extra").type,"guide");assert.equal(said("ring to my sister and money for my brother","extra").type,"guide");
  assert.equal(said("My car","maker").type,"later");assert.equal(said("nothing else","extra").value,"Nothing else");
  assert.equal(said("I need a carer, not a gift","extra").type!=="gift",true);
});
test("displays each market's supported route; shortened cards keep canonical values and partial groups cannot validate a kit",()=>{
  for(const country of Object.keys(markets))for(const region of Object.keys(regions[country]||{"":1})){
    const where={country,region}, pr=profile(where),a=fixture(where).answers, all=questions(pr,a);
    for(const q of all){
      const cards=interviewCards(q,pr,a);assert.ok(cards.length,q.id);
      for(const c of cards){assert.ok(c.title.length>3,q.id);assert.ok(Array.isArray(c.lines));assert.ok(Array.isArray(c.options));for(const o of c.options)assert.ok(q.values.includes(o.value),q.id);}
    }
  }
  assert.throws(()=>validateState({...base,answers:{...base.answers,estateScope:STOP}},true));
  assert.throws(()=>validateState({...base,answers:{eligible:YES}},true));
  assert.deepEqual(coveredLater("localLaw",p,{}),["canadaEstates"]);
  const q=steps("localLaw").q;assert.ok(readAnswer(q,STOP,{}).stop);
});
test("nano router receives only an allowlisted topic set and question type; timeout or an invented response cannot change an answer",async()=>{
  assert.deepEqual(safeTopic({topics:["executor"],context:"Morgan Fields"}),null);
  assert.deepEqual(safeTopic({topics:["asset"],context:"gift",answers:{maker:"Jo Lee"}}),null);
  assert.equal(chooseLocalTopic(topicsFor("Can my executor receive a gift?"),"gift"),"asset");
  assert.equal(chooseLocalTopic(topicsFor("what are notes?"),"choice"),"notes");
  let sent=[];
  const service=createTopicService({key:"fiction",fetcher:async(_url,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:'{"topic":"change-will"}'}]}]})};}});
  const result=await service.classify({topics:["executor","asset"],context:"gift"});
  assert.deepEqual(result,{topic:"asset",mode:"local"});assert.equal(sent.length,1);
  assert.equal(sent[0].store,false);assert.equal(sent[0].input,"Current kind of question: gift. Possible help topics: executor, asset");
});

test("ordinary chatter cannot become a name, supported introductions keep the exact spelling, and a question can be a note",()=>{
  const q=steps("maker").q,c=steps("maker").cards[0];
  for(const input of ["I need a will","I need help","no thanks","hello there","thank you","yep","not sure"]){
    const turn=manageTurn(input,q,c,p);assert.ok(!["field","answer"].includes(turn.type),input);
  }
  const introductory=manageTurn("My name is Jean Sutton",q,c,p);assert.equal(readAnswer(q,introductory.value,{}).value,"Jean Sutton");
  assert.equal(manageTurn("My sister is Morgan Rivera",{...q,giftField:"extraRecipient"},c,p).value,"Morgan Rivera");
  assert.equal(manageTurn("Whoopi Goldberg",q,c,p).value,"Whoopi Goldberg");
  for(const id of ["wishes","noteText1","extraRequest"]){
    const note={id,kind:"notes",values:[]};
    for(const text of ["Can my sister inherit my pension?","Please ask Anna: where are the family photos?","Hello there"]){
      assert.equal(manageTurn(text,note,c,p).type,"noteOrHelp");
      assert.equal(readAnswer(note,text,{}).value,text);
    }
  }
});

test("a lease, financing or shared ownership can never become an outright item in a signed kit",()=>{
 const a=fixture(on,{extra:item,extraItem:"Blue 2018 Civic",extraRecipient:"Lee Rivera"});const q=questions(p,a.answers).find(q=>q.id==="extraItem");
 for(const v of ["my leased blue Civic","my financed 2019 Civic","my jointly owned 2018 Ford","my car which I do not own"]){
  assert.equal(readAnswer(q,v,{}).advice,v);
  assert.throws(()=>validateState({...a,answers:{...a.answers,extraItem:v}},true));
 }
 assert.match(said("my car which I still owe money on","extra").text,/loan/);
});

test("court-form yes/no replies follow the actual question, including reversed option order",()=>{
 const tx={country:"US",region:"TX"},ca={country:"US",region:"CA"};
 for(const [place,id,yes,no,over] of [
  [tx,"descendants","I have children or grandchildren","No children or grandchildren",{}],
  [ca,"caBond","Sign the box to waive bond","Leave the bond box unsigned",{}],
  [ca,"caExtras","I will add specific gifts in the court PDF","Use my balance choice for everything",{}],
  [tx,"txSpecific","I will enter separate gifts in the court PDF","Use section 2 for everything",{}],
  [tx,"txLiving","Yes, list them now","I will complete the descendant details on the court form",{descendants:"I have children or grandchildren"}],
  [tx,"txAdditional","Add more names","Only the person I named",{marriage:"Single, widowed or divorced",descendants:"No children or grandchildren"}],
 ]){
  const pr=profile(place),a=fixture(place,over).answers,{q,cards}=steps(id,pr,a);
  assert.equal(manageTurn("yes",q,cards[0],pr).value,yes,id);assert.equal(manageTurn("no",q,cards[0],pr).value,no,id);
 }
});

test("business ownership by itself passes; a conflict, uncertainty or missing answer cannot produce a personal will", async () => {
  const {ownsBusiness} = await import("../public/business.js");
  const {sections} = await import("../public/document.js");
  for (const country of Object.keys(markets)) {
    for (const region of Object.keys(regions[country] || {"":1})) {
      const place = {country,region}, pr = profile(place);
      if (pr.route === "fixed") continue;
      const ordinary = fixture(place), owner = fixture(place,{businessOwnership:ownsBusiness});
      assert.deepEqual(validateState(owner,true),owner,pr.key);
      assert.deepEqual(sections(pr,owner.answers),sections(pr,ordinary.answers),pr.key);
      assert.equal(ordinary.answers.businessTransfer,undefined);
      for (const id of ["businessTransfer","businessWishes"]) {
        const missing = structuredClone(owner);
        delete missing.answers[id];
        assert.throws(()=>validateState(missing,true));
        const failed = {...owner, answers:{...owner.answers,[id]:STOP}};
        assert.throws(()=>validateState(failed,true));
        const q = questions(pr,owner.answers).find(q=>q.id===id);
        assert.ok(readAnswer(q,STOP,owner.answers).stop);
      }
    }
  }
  assert.equal(said("I have a business","businessOwnership").value,ownsBusiness);
  assert.equal(said("yes","businessOwnership").value,ownsBusiness);
  assert.equal(said("no","businessOwnership").value,base.answers.businessOwnership);
  assert.equal(said("not sure","businessOwnership").value,"I’m unsure");
  const owner=fixture(on,{businessOwnership:ownsBusiness});
  const {q,cards}=steps("businessWishes",p,owner.answers);
  assert.notEqual(manageTurn("Yes but I want my daughter to get the shop",q,cards[0],p).value,YES);
  assert.equal(manageTurn("I want a different plan",q,cards[0],p).value,STOP);
  assert.equal(manageTurn("Can I make a will if I own a business?",q,cards[0],p).type,"guide");
  const gift={kind:"item",giftField:"extraItem",id:"extraItem"};
  assert.ok(readAnswer(gift,"my business van",owner.answers).advice);
  assert.equal(readAnswer(gift,"my blue Honda Civic",owner.answers).value,"my blue Honda Civic");
});

test("old affirmative estate screens keep their original meaning and a new partial owner restarts at the missing check",()=>{
  const old = structuredClone(base);
  delete old.answers.businessOwnership;
  delete old.answers.estateScope;
  old.answers.scope=YES;
  assert.deepEqual(validateState(old,true,true),base);
  assert.throws(()=>validateState({...old,answers:{...old.answers,scope:STOP}},true,true));
  assert.throws(()=>validateState({...old,answers:{...old.answers,businessOwnership:"I own a business"}},true,true));
  assert.throws(()=>validateState({...old,answers:{...old.answers,estateScope:YES}},true,true));
  const pending={...base,answers:{eligible:YES,businessOwnership:"I own a business"}};
  assert.deepEqual(validateState(pending,false,true),pending);
  assert.equal(questions(p,pending.answers).find(q=>!Object.hasOwn(pending.answers,q.id)).id,"businessTransfer");
  assert.throws(()=>validateState(pending,true));
});
