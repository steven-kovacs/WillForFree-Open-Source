import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures.mjs";
import { profile, executionProfile } from "../public/markets.js";
import { questions, validateState, readAnswer } from "../public/will.js";
import { sections } from "../public/document.js";
import { noExtra, item, cash, personal, bespoke, finishNotes, finishForm, needsAdvice, notesEntries, wishesProfile } from "../public/extras.js";
import { interviewProgress } from "../public/progress.js";
const on={country:"CA",region:"ON"}, ca={country:"US",region:"CA"};
test("a keepsake precedes residue; family notes never become a will clause or a gift to a pet",()=>{
  const overrides={extra:item,extraItem:"grandfather’s walnut violin",extraRecipient:"Ari Palmer",extraAfter:personal,noteTopic1:"Pet care",noteText1:"Casey can take Juniper to her usual vet.",noteTopic2:"Funeral or memorial",noteText2:"Please play our wedding song.",noteTopic3:finishNotes};
  const s=fixture(on,overrides);
  assert.deepEqual(validateState(s,true),s);
  const text=sections(executionProfile(profile(on),s.answers),s.answers).map(x=>x.join(" ")).join("\n");
  assert.ok(text.indexOf("walnut violin")>0 && text.indexOf("walnut violin") < text.indexOf("Who inherits"));
  assert.match(text,/Ari Palmer/);assert.match(text,/no substitute/);assert.doesNotMatch(text,/Juniper|wedding song/);
  assert.equal(notesEntries(s.answers).length,2);
  const more=fixture(on,{...overrides,noteCheck:bespoke,extraRequest:"I want a fund for pet care."});
  assert.ok(needsAdvice(more.answers));assert.equal(wishesProfile(profile(on),more.answers).route,"planning");
});
test("court gift capability, currency, Unicode notes and targeted exclusions follow the selected form",()=>{
  const cal=fixture(ca,{extra:cash,extraAmount:"1,250",extraWho:"A charity",extraRecipient:"Example Foundation"});
  assert.equal(validateState(cal,true).answers.extraAmount,"1250");
  for(const val of ["-4","12.5","1,2","0","3e4","50 if he agrees"])
    assert.ok(readAnswer({kind:"amount"},val).error);
  for (const v of ["violin if sold","gold ring only after graduating","The violin which Alex takes when she turns thirty","black guitar and silver violin"]) {
    const result=readAnswer({kind:"item"},v);assert.equal(result.advice,v);assert.ok(!result.value);
  }
  for (const how of [item,cash]) {
    const tx=questions(profile({country:"US",region:"TX"}),{extra:how}).find(q=>q.id==="extraFit");
    assert.match(tx.prompt,/living 30 days after your death/);assert.doesNotMatch(tx.prompt,/follows the rest/);
  }
  assert.ok(readAnswer({kind:"notes"},"My PIN is 2345").error);
  assert.ok(readAnswer({kind:"notes"},"seed phrase is test").error);
  assert.equal(readAnswer({kind:"notes"},"Fotos: 家族").value,"Fotos: 家族");
  assert.ok(!questions(profile(ca),{}).find(q=>q.id==="extra").values.includes(item));
  assert.ok(!questions(profile({country:"CA",region:"QC"}),{}).find(q=>q.id==="extra").values.includes(cash));
  assert.throws(()=>validateState({...cal,answers:{...cal.answers,extra:item}},true));
  const both=fixture({country:"US",region:"TX"},{extra:cash,extraAmount:"110",extraRecipient:"Lee Taylor",extraAfter:finishForm,formNotes:personal,noteTopic1:"Pet care",noteText1:"Ask the backup carer.",noteTopic2:finishNotes});
  assert.deepEqual(validateState(both,true),both);assert.deepEqual(notesEntries(both.answers),[["Pet care","Ask the backup carer."]]);
  assert.ok(!needsAdvice(fixture(on).answers));
});
test("progress never regresses as the household, gift and note branches are discovered; only kit ready is complete",()=>{
  const s=fixture(on,{household:"Partner, then children",extra:cash,extraAmount:"500",extraRecipient:"Rene Mills",extraAfter:personal,noteTopic1:"Digital belongings",noteText1:"Family photos are on the silver drive.",noteTopic2:finishNotes});
  const p=profile(on),partial={};let prev=0;
  for(const [id,value] of Object.entries(s.answers)){
    const info=interviewProgress(questions(p,partial),id,"chat");assert.ok(info.value>=prev && info.value<94,id);prev=info.value;partial[id]=value;
  }
  assert.equal(interviewProgress([],null,"review").value,94);assert.equal(interviewProgress([],null,"finished").value,100);
  assert.equal(interviewProgress([],null,"helper"),null);
  const old={...s,answers:{}}; for(const [id,v] of Object.entries(s.answers)){if(id==="extra")break;old.answers[id]=v;}
  assert.deepEqual(validateState(old),old);assert.throws(()=>validateState(old,true));
  old.answers.extra=noExtra;assert.throws(()=>validateState(old,true),/remaining questions/);
  for (const q of questions(p,old.answers)) if(!(q.id in old.answers)) old.answers[q.id]=q.values[0];
  assert.deepEqual(validateState(old,true),old);
});
