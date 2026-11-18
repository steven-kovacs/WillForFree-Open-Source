import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './fixtures.mjs';
import {profile,markets,regions,executionProfile} from '../public/markets.js';
import {questions,readAnswer,validateState,preserveAsNotes} from '../public/will.js';
import {sections} from '../public/document.js';
import {interviewCards,mattersForReview} from '../public/interview-copy.js';
import {careEntries,canGiveToOrganization,goOn,skipped,deferred,noteAction,notePrivacy,noteEffect,reviewDetail,saveNote,setReviewNote,skipEffect,transfer,practical,customPet,priorPrompt} from '../public/planning.js';
import {giftList,giftCurrency,wishesProfile,ordinaryGifts,cash,confirmCash,notesEntries} from '../public/extras.js';
import {display,setLanguage,languages,sourcePattern,clearWording} from '../public/locale.js';
import {manageTurn} from '../public/conversation.js';
const on={country:'CA',region:'ON'},qcp={country:'CA',region:'QC'},cal={country:'US',region:'CA'},tx={country:'US',region:'TX'};
const org={orgGift1:'Give money',orgAmount1:'735',orgName1:'Meadow Arts Guild',orgTerms1:'I’ve checked',orgGift2:'Give an item',orgName2:'Birch Music Society',orgItem2:'amber violin',orgTerms2:'I’ve checked'};
const pets={pets:'Yes',petNames:'Juniper and Saffron',petCarer:'Cora Linn',petBackup:'Eli Park',petCare:'Green carrier by the stairs.',petPlan:transfer,funeral:'Cremation',funeralDetails:'Gather at Birch Cove.'};
test('all 97 locations collect distinct care, funeral, and repeatable organization wishes, in local currency',()=>{
 let count=0;for(const country of Object.keys(markets))for(const region of Object.keys(regions[country]||{'':true})){
  const place={country,region},p=profile(place),s=fixture(place,{...org,...pets,petPlan:practical,orgTerms1:p.key==='US-CA'?'A charity':'I’ve checked'});
  assert.deepEqual(validateState(s,true),s);assert.match(giftCurrency(p),/^[A-Z]{3}$/);
  const records=giftList(s.answers);assert.deepEqual(records.map(g=>g.recipient),[org.orgName1,org.orgName2]);
  assert.ok(careEntries(s.answers).some(([_,v])=>v===pets.funeralDetails));
  const supported=canGiveToOrganization(p,'item',2) && canGiveToOrganization(p,'cash',1);
  assert.equal(wishesProfile(p,s.answers).route==='planning',!supported,p.key);
  if(!supported)assert.ok(mattersForReview(p,s.answers).length,p.key);
  count++;
 }assert.equal(count,97);
});
test('prior will is an early, revisable answer; continuing never confirms a skipped legal check',()=>{
 const p=profile(on),s=fixture(on,{priorWill:'Yes'}),list=questions(p,s.answers);
 assert.equal(list[0].prompt,priorPrompt);assert.equal(list[1].id,'priorContinue');
 assert.equal(s.answers.priorContinue,goOn);assert.equal(wishesProfile(p,s.answers).route,'paper');
 assert.ok(!list.find(q=>q.id==='estateScope').prompt.includes('earlier will'));
 assert.equal(readAnswer(list[1],'Back to this question').value,undefined);
 const flags={estateScope:[0,'Yes'],assetCheck:[0,'I’m not sure']};s.answers.estateScope=skipped;s.answers.assetCheck=skipped;s.issues=flags;
 assert.deepEqual(validateState(s,true),s);assert.equal(wishesProfile(p,s.answers,s.issues).route,'planning');
 const rows=mattersForReview(p,s.answers,s.issues,list);assert.ok(rows.some(([label,answer])=>label.includes('outside Ontario') && answer==='Yes'));
 assert.ok(rows.some(([label])=>label===priorPrompt));assert.throws(()=>validateState({...s,issues:undefined},true));
 assert.throws(()=>validateState({...s,issues:{...flags,maker:[0,'ignored']}},true));
});
test('question notes survive validation and edits without answering a question or changing its will route',()=>{
 const p=profile(on),s=fixture(on),all=questions(p,s.answers),eligible=all.find(q=>q.id==='eligible');
 const [first,second]=interviewCards(eligible,p,s.answers);
 setReviewNote(s,eligible.id,0,first.title,'First card note.');
 setReviewNote(s,eligible.id,1,second.title,'Second card note.');
 setReviewNote(s,eligible.id,0,first.title,'Revised first card note.');
 assert.deepEqual(validateState(s,true),s);
 const matters=mattersForReview(p,s.answers,s.issues,all,s.record,s.reviewNotes);
 assert.deepEqual(matters.map(([label,value])=>[label,value]),[[second.title,'Second card note.'],[first.title,'Revised first card note.']]);
 assert.deepEqual(preserveAsNotes(p,s).reviewNotes,s.reviewNotes);
 assert.equal(wishesProfile(p,s.answers,s.issues).route,'paper');
 const missing={...s,answers:{...s.answers}};delete missing.answers.eligible;
 assert.throws(()=>validateState(missing,true));
 for(const invalid of [[...s.reviewNotes,s.reviewNotes[0]],[{...s.reviewNotes[0],text:'bad@example.org'}],[{...s.reviewNotes[0],part:-1}],[{...s.reviewNotes[0],text:'a'.repeat(601)}]]){
  assert.throws(()=>validateState({...s,reviewNotes:invalid},true));
 }
 setReviewNote(s,eligible.id,0,first.title,'');setReviewNote(s,eligible.id,1,second.title,'');
 assert.equal(s.reviewNotes,undefined);
 assert.equal(mattersForReview(p,s.answers,s.issues,all,s.record,s.reviewNotes).length,0);
 for(const country of Object.keys(markets))for(const region of Object.keys(regions[country]||{'':true})){
  const state=fixture({country,region}),original=executionProfile(profile(state.place),state.answers);
  const before=wishesProfile(original,state.answers).route;
  setReviewNote(state,'priorWill',0,priorPrompt,'Check the original documents.');
  assert.deepEqual(validateState(state,true),state);
  assert.equal(wishesProfile(original,state.answers,state.issues).route,before);
 }
});
test('only an express, supported transfer changes pet ownership; practical details do not enter the will',()=>{
 const open={...pets,petNames:skipped,petRequest:skipped,petPlan:customPet,noteTopic1:'Pet care',noteText1:skipped,extraRequest:skipped};
 const issue={petNames:[0,deferred,'Ask who will take Juniper.']},all=questions(profile(on),open);
 assert.ok(careEntries(open).every(([,value])=>value!==skipped));
 assert.deepEqual(notesEntries(open),[]);
 const review=mattersForReview(profile(on),open,issue,all);
 assert.ok(review.some(([,value])=>value==='Ask who will take Juniper.'));
 assert.ok(review.every(([,value])=>value!==skipped));
 for(const place of [on,qcp,{country:'NZ',region:''}]){
  const p=profile(place);for(const plan of [practical,transfer,customPet]){
   const s=fixture(place,{...pets,petPlan:plan,petRequest:'Different homes for each cat.'}),output=wishesProfile(p,s.answers);
   assert.deepEqual(validateState(s,true),s);
   if(plan===customPet){assert.equal(output.route,'planning');continue;}
   const clauses=sections(p,s.answers).flat().join(' ');assert.equal(clauses.includes('Cora Linn'),plan===transfer);assert.equal(clauses.includes('Eli Park'),plan===transfer);
   assert.doesNotMatch(clauses,/carrier|Cove|Cremation|Saffron/);
  }
 }
 for(const o of [{petCarer:'Leave open'},{}]){
  const place=o.petCarer?on:tx,s=fixture(place,{...pets,...o});assert.equal(wishesProfile(profile(place),s.answers).route,'planning');
 }
});
test('organization gifts follow the correct recipient and form; conditional gifts or a sixth California row need review',()=>{
 for(const place of [on,qcp,{country:'PL',region:''},{country:'DE',region:''}]){
  const s=fixture(place,org),p=profile(place),clauses=sections(p,s.answers).filter(([t])=>t.startsWith('Separate gift'));
  assert.equal(clauses.length,2);assert.match(clauses[0][1],/735.*Meadow Arts Guild/);assert.match(clauses[1][1],/Birch Music Society.*amber violin/);
  assert.doesNotMatch(clauses.flat().join(' '),/surviv|descendant/);assert.equal(clauses[0][1].includes('my heir to pay'),p.civil);
 }
 const personal={extra:cash,extraAmount:'45',extraWho:'A charity',extraRecipient:'Meadow Arts Guild'};
 const p=profile(cal),t=fixture(cal,{...personal,orgGift1:'Give money',orgName1:org.orgName1,orgAmount1:'735',orgTerms1:'A charity'});
 const sample=fixture(on,org),field=questions(profile(on),sample.answers).find(q=>q.id==='orgItem2');
 assert.deepEqual(manageTurn('my amber violin',field,interviewCards(field,profile(on),sample.answers)[0],profile(on)),{type:'field',value:'my amber violin'});
 assert.equal(t.answers.orgTotal1,confirmCash('USD',780));assert.equal(giftList(t.answers).length,2);assert.equal(wishesProfile(p,t.answers).route,'official');
 assert.throws(()=>validateState({...t,answers:{...t.answers,orgTerms1:'I’ve checked'}},true));
 const extra={};for(let i=1;i<=6;i++)Object.assign(extra,{['orgGift'+i]:'Give money',['orgName'+i]:'Guild '+i,['orgAmount'+i]:''+(100+i),['orgTerms'+i]:'A charity'});
 const over=fixture(cal,extra);assert.equal(giftList(over.answers).length,6);assert.equal(wishesProfile(p,over.answers).route,'planning');
 const me={country:'US',region:'ME'},blank={...profile(me),route:'statutory'};
 for (const n of [3,4]){
  const gifts=Object.fromEntries(Object.entries(extra).filter(([k])=>Number(k.match(/\d+$/)[0])<=n));
  const state=fixture(me,gifts,'statutory');assert.deepEqual(validateState(state,true),state);
  assert.equal(wishesProfile(blank,state.answers).route,n===3?'statutory':'planning');
 }
 const unsure=fixture(on,{...org,orgTerms1:deferred,orgRequest1:'Only for the auditorium.'});assert.equal(wishesProfile(profile(on),unsure.answers).route,'planning');
 const duplicate=fixture(on,{...org,extra:'Give a particular keepsake',extraItem:'blue cello',extraRecipient:'Lane Green'});assert.throws(()=>validateState({...duplicate,answers:{...duplicate.answers,orgItem2:'blue cello'}},true));
});
test('the new prompts, clauses, decisions and verbs are translated in every edition; names stay verbatim',async t=>{
 t.mock.method(globalThis,'fetch',async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../public'+url,import.meta.url),'utf8'))}));
 try{for(const lang of Object.keys(languages)){
  clearWording();await setLanguage(lang,{remember:false});const p=profile(on),s=fixture(on,{...pets,...org,priorWill:'Yes'}),all=questions(p,s.answers);
  const maker=all.find(q=>q.id==='maker'),makerCard=interviewCards(maker,p,s.answers)[0];
  for(const [action,type] of [[noteAction,'reviewNote'],['Skip this question','skip']]){
   assert.equal(manageTurn(display(action),maker,makerCard,p).type,type,lang);
   assert.notEqual(manageTurn(display(action)+'?',maker,makerCard,p).type,type,lang);
  }
  if(lang!=='en')for(const text of [noteAction,'Skip this question',notePrivacy,noteEffect,reviewDetail,saveNote,skipEffect,'Edit note','Remove note'])assert.notEqual(display(text),text,lang+' '+text);
  for(const q of all.filter(q=>q.planStep)){
   const card=interviewCards(q,p,s.answers)[0];assert.ok(card.options.every(o=>typeof display(o.label)==='string'));
   if(lang!=='en')assert.notEqual(display(card.title),card.title,lang+' '+q.id);
   if(q.id==='priorWill')assert.equal(manageTurn(display('Yes'),q,card,p).value,'Yes');
   if(q.id==='orgTerms1'){
    assert.equal(card.options.find(o=>o.value===deferred).label,'No or unsure');
    assert.equal(manageTurn(display(noteAction),q,card,p).type,'reviewNote');
    assert.equal(manageTurn(display('No or unsure'),q,card,p).value,deferred);
   }
  }
  for(const place of [on,{country:'PL',region:''}]){
   const p=profile(place),s=fixture(place,{...pets,petPlan:place===on?transfer:practical,...org});
   const text=sections(p,s.answers).map(([_,v])=>display(v)).join(' ');
   for(const token of ['Meadow Arts Guild','735','Birch Music Society','amber violin',giftCurrency(p)])assert.ok(text.includes(token),lang+' '+token);
   if(lang!=='en')assert.doesNotMatch(text,/for its general purposes|my heir to pay|is willing and able/);
  }
 }}finally{await setLanguage('en',{remember:false});}
});
