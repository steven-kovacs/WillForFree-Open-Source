import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./fixtures.mjs";
import {profile} from "../public/markets.js";
import {validateState, readAnswer, questions} from "../public/will.js";
import {sections} from "../public/document.js";
import {cash,item,noExtra,doneGifts,finishNotes,finishForm,adviceOption,personal,confirmCash,giftList,giftKey,giftLimit,needsAdvice,notesEntries,giftIntents,keepForAdvice} from "../public/extras.js";
const on={country:"CA",region:"ON"},cal={country:"US",region:"CA"},tx={country:"US",region:"TX"};
const ring={extra:item,extraItem:"gold wedding ring",extraRecipient:"Sara Reed",extraAfter:cash,extraAmount2:"1500",extraRecipient2:"Ben Reed"};
function many(count,kind=cash){
 const o={extra:kind};
 for(let n=1;n<=count;n++){
  o[giftKey(kind===item?"extraItem":"extraAmount",n)] = kind===item ? "Silver brooch number "+n : String(n);
  o[giftKey("extraRecipient",n)] = "Taylor Reed";
  o[giftKey("extraAfter",n)] = n<count?kind:doneGifts;
 }
 return o;
}
test("the ring and money go to the right people, before residue, with no small interview ceiling",()=>{
 assert.deepEqual(giftIntents("A ring for my sister and some money for my brother"),[item,cash]);
 const s=fixture(on,ring); assert.deepEqual(validateState(s,true),s);
 assert.deepEqual(giftList(s.answers).map(g=>[g.description || g.amount,g.recipient]),[["gold wedding ring","Sara Reed"],["1500","Ben Reed"]]);
 const clauses=sections(profile(on),s.answers);
 assert.match(clauses.find(c=>c[0]==="Separate gift 1")[1],/Sara Reed.*gold wedding ring/);
 assert.match(clauses.find(c=>c[0]==="Separate gift 2")[1],/CAD 1500 to Ben Reed/);
 assert.ok(clauses.findIndex(c=>c[0]==="Who inherits")>clauses.findIndex(c=>c[0]==="Separate gift 2"));
 const long=fixture(on,many(80,item));assert.ok(Object.keys(long.answers).length>300);
 assert.deepEqual(validateState(long,true),long);assert.equal(giftList(long.answers).length,80);
 assert.equal(sections(profile(on),long.answers).filter(x=>x[0].startsWith("Separate gift")).length,80);
});
test("repeated cash requires assent to the actual combined amount; duplicate objects cannot be imported",()=>{
 const s=fixture(on,{...ring,extraAfter2:cash,extraAmount3:"350",extraRecipient3:"Ben Reed"});
 assert.equal(s.answers.extraTotal3,confirmCash("CAD",1850));
 for(const v of [undefined,"yes",confirmCash("CAD",1851)]) {
  const c=structuredClone(s);if(v===undefined) delete c.answers.extraTotal3;else c.answers.extraTotal3=v;
  assert.throws(()=>validateState(c,true));
 }
 const changed=structuredClone(s);changed.answers.extraAmount2="1600";assert.throws(()=>validateState(changed,true));
 const partial=structuredClone(s);delete partial.answers.extraTotal3;assert.deepEqual(validateState(partial),partial);
 const item2=fixture(on,{...ring,extraAfter:item,extraItem2:"silver wedding ring",extraRecipient2:"Ben Reed"});
 item2.answers.extraItem2="My Gold Wedding Ring";assert.throws(()=>validateState(item2,true));
 // It is fine to leave different items, or cash and an item, to the same person.
 assert.deepEqual(giftList(fixture(on,{...ring,extraRecipient2:"Sara Reed"}).answers).map(g=>g.recipient),["Sara Reed","Sara Reed"]);
});
test("notes can go between gifts; court deferrals, old single-gift saves and repeated finish choices round-trip",()=>{
 for(const [place,over] of [[on,{...ring,extraAfter:personal,noteTopic1:"Pet care",noteText1:"Mira knows the vet.",noteTopic2:finishNotes,afterPersonal:cash}],
 [tx,{...ring,extraAfter:finishForm,formNotes:personal,noteTopic1:"Pet care",noteText1:"Mira knows the vet.",noteTopic2:finishNotes,afterCourt:cash}]]){
  const s=fixture(place,over);assert.deepEqual(validateState(s,true),s);assert.equal(giftList(s.answers).length,2);assert.equal(notesEntries(s.answers).length,1);
  const early=structuredClone(s);for(const k of Object.keys(early.answers).slice(Object.keys(early.answers).indexOf("extraAmount2")+1))delete early.answers[k];
  assert.deepEqual(validateState(early),early);assert.throws(()=>validateState(early,true));
 }
 const old=fixture(on,{extra:cash,extraAmount:"100",extraRecipient:"Jane Sage"});old.answers.extraAfter=finishNotes;
 assert.equal(validateState(old,true).answers.extraAfter,doneGifts);
 const menu=questions(profile(on),old.answers).find(q=>q.id==="extraAfter");
 for(const phrase of ["done","I'm done","I’m done","no more gifts","nothing else"])assert.equal(readAnswer(menu,phrase).value,doneGifts);
 const charity=fixture(cal,{extra:cash,extraWho:"A charity",extraRecipient:"Example Foundation",extraAmount:"500",extraAfter:personal,noteTopic1:finishNotes});delete charity.answers.afterPersonal;let past=false;for(const k of Object.keys(charity.answers)){past ||= k==="firstInstrument";if(past)delete charity.answers[k];}
 assert.deepEqual(validateState(charity),charity);assert.throws(()=>validateState(charity,true));
});
test("full official rows stop without truncating: an extra request keeps all slots in an advice-only kit",()=>{
 for(const [place,limit] of [[cal,5],[tx,8]]){
  const s=fixture(place,many(limit));assert.equal(giftLimit(profile(place)),limit);assert.deepEqual(validateState(s,true),s);
  const last=giftKey("extraAfter",limit),q=questions(profile(place),s.answers).find(x=>x.id===last);
  assert.ok(!q.values.includes(cash) && !q.values.includes(item));assert.match(q.prompt,/rows in this form are filled/);
  s.answers[last]=cash;assert.throws(()=>validateState(s,true));s.answers[last]=adviceOption;s.answers.extraRequest="I have another gift for a friend.";
  assert.deepEqual(validateState(s,true),s);assert.ok(needsAdvice(s.answers));assert.equal(giftList(s.answers).length,limit);
 }
 const bad=fixture(cal);bad.answers.extra=item;assert.throws(()=>validateState(bad,true));
 assert.equal(giftLimit(profile(on)),Infinity);
});

test("an unresolved proposed correction to the first gift preserves the later cash gift and family notes",()=>{
 const s=fixture(on,{...ring,extraAfter2:personal,noteTopic1:"Pet care",noteText1:"Lee can take the cats.",noteTopic2:finishNotes});
 Object.assign(s.answers,{adviceOverride:keepForAdvice,adviceFor:"Replace or reconsider gift 1: gold wedding ring to Sara Reed.",extraRequest:"Intended recipient: 王小明"});
 assert.deepEqual(validateState(s,true),s);assert.equal(giftList(s.answers).length,2);
 assert.equal(notesEntries(s.answers).length,1);assert.ok(needsAdvice(s.answers));
 assert.ok(!sections(profile(on),s.answers).some(c=>c[0].startsWith("Separate gift")));
 const unhealthy=structuredClone(s);delete unhealthy.answers.adviceFor;assert.throws(()=>validateState(unhealthy,true));
});

test("all gift recipient fields require an actual name, not a condition, relationship or trust instruction",()=>{
 const s=fixture(on,ring),q=questions(profile(on),s.answers).find(q=>q.id==="extraRecipient2");
 for (const v of ["Sara Reed if she graduates","Sara Reed as trustee for Ella Reed","my youngest daughter","my niece","younger brother"]) {
   assert.ok(readAnswer(q,v,s.answers).error); const bad=structuredClone(s);bad.answers.extraRecipient2=v;assert.throws(()=>validateState(bad,true));
 }
 assert.equal(readAnswer(q,"María José de la Cruz",s.answers).value,"María José de la Cruz");
 assert.equal(readAnswer(q,"Amar",s.answers).value,"Amar");
 const calS=fixture(cal,{extra:cash,extraWho:"A charity",extraRecipient:"Example Trust",extraAmount:"300"});
 const cq=questions(profile(cal),calS.answers).find(q=>q.giftField==="extraRecipient");
 assert.ok(readAnswer(cq,"Example Arts Society if it reopens").advice);assert.equal(readAnswer(cq,"The Children’s Foundation").value,"The Children’s Foundation");
});
