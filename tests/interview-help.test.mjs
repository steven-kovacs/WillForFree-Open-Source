import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {manageTurn} from "../public/conversation.js";
import {directSubject,guidance,helpFor,helpMenu,isGeneralTopicRequest,isTopicChoice} from "../public/interview-help.js";
import {interviewCards} from "../public/interview-copy.js";
import {disclosesPressure} from "../public/local-wording.js";
import {display,languages,setLanguage,sourcePattern} from "../public/locale.js";
import {markets,regions,profile,executionProfile,copyByHand} from "../public/markets.js";
import {adviceOption,wishesProfile} from "../public/extras.js";
import {hasSensitive,topicsFor} from "../public/flow.js";
import {questions,readAnswer} from "../public/will.js";

const challenges=JSON.parse(await readFile(new URL("../qa/ux/help-challenges.json",import.meta.url)));
const on=profile({country:"CA",region:"ON"});
const denials={en:"My family isn’t forcing me to sign.",fr:"Personne ne me force à signer.",es:"Nadie me obliga a firmar.",de:"Niemand zwingt mich zur Unterschrift.",it:"Nessuno mi costringe a firmare.",nl:"Niemand dwingt me om te tekenen.",da:"Ingen tvinger mig til at skrive under.",sv:"Ingen tvingar mig att skriva under.",nb:"Ingen tvinger meg til å signere.",fi:"Kukaan ei pakota minua allekirjoittamaan.",is:"Enginn neyðir mig til að skrifa undir.",pt:"Ninguém me obriga a assinar.",et:"Keegi ei sunni mind alla kirjutama.",cs:"Nikdo mě nenutí podepsat závěť.",pl:"Nikt nie zmusza mnie do podpisu.",hr:"Nitko me ne tjera da potpišem.",sk:"Nikto ma nenúti podpísať závet.",mt:"Ħadd ma jisforzani niffirma.","zh-Hans":"没有人逼我签字。"};

function turn(text,q) {return manageTurn(text,q,interviewCards(q,on,{})[0],on);}
const eligibility=questions(on,{}).find(q=>q.id==="eligible");
const name=questions(on,{}).find(q=>q.id==="maker");
const town=questions(on,{}).find(q=>q.id==="town");
const note={id:"extraRequest",kind:"notes",label:"For local advice",prompt:"",values:[]};
async function withCatalogs(run) {
  const prior=globalThis.fetch;
  globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL("../public"+path,import.meta.url)))});
  try {await run();} finally {await setLanguage("en",{remember:false});globalThis.fetch=prior;}
}
test("independent native questions, tentative choices, pressure disclosures and names across all interview languages",async()=>withCatalogs(async()=>{
  assert.deepEqual(new Set(Object.keys(challenges)),new Set(Object.keys(languages)));
  for(const [lang,f] of Object.entries(challenges)){
    await setLanguage(lang,{remember:false});
    for(const [field,subject] of Object.entries({witness:"witness",expenses:"expenses",tax:"tax",notaryCost:"cost",foreign:"international",unsupported:null})){
      assert.equal(directSubject(f[field]),subject,lang+"/"+field);
      for(const q of [name,town,eligibility])assert.equal(turn(f[field],q).type,"help",lang+"/"+field+"/"+q.id);
    }
    assert.equal(turn(f.uncertainty,eligibility).type,"clarify",lang);
    assert.equal(turn(f.witness,note).type,"noteOrHelp",lang);
    assert.equal(readAnswer(note,f.witness).value,f.witness,lang);
    assert.equal(turn(f.name,name).value,f.name,lang);
    assert.equal(readAnswer(name,f.name).value,f.name,lang);
    for(const q of [name,town]){
      assert.ok(readAnswer(q,f.witness).error,lang);
      assert.ok(readAnswer(q,display("Yes")).error,lang);
      assert.notEqual(turn(display("Yes"),q).type,"field",lang);
    }
    assert.equal(disclosesPressure(f.pressure),true,lang);
    assert.equal(disclosesPressure(denials[lang]),false,lang);
  }
}));

test("unseen phrasing and ambiguous wording preserve the interview and the help budget",()=>{
  for(const [text,subject] of [
    ["Can my executor be reimbursed for petrol?","expenses"],["Does my estate pay taxes?","tax"],["Do I have to pay a notary?","cost"],
    ["What if the estate can't pay its debts?","debt"],["What is probate?","probate"],["What is forced heirship?","familyRights"],
    ["Can I disinherit my spouse?","familyRights"],["What if I have assets overseas?","international"],["Can my daughter witness the signing?","witness"],
    ["Does a power of attorney do this too?","lifetime"],["Where can I store the original?","custody"],["Who inherits my bank accounts?","outside"],
    ["How do I care for my dog?","personal"],["What if my beneficiary dies before me?","survival"],["Can I finish later?","download"],
    ["Does this have to match my ID?","id"],["What if I die without a will?","intestacy"],["Could my mother with dementia sign?","capacity"],
    ["What if someone forces me to sign?","capacity"],["Can I leave my house to my sister?","home"],
    ["Can the estate reimburse my mileage, and is it tax deductible?","expenseTax"],["Does this involve AI?","ai"],
    ["Will I be able to edit a name before downloading?","edit"],["Can I leave money to a charity?","gifts"],["Does this site use AI?","ai"],
    ["Do beneficiaries pay?",null],["What does my executor have to pay my beneficiary?",null],["How do I grow basil indoors?",null],
  ])assert.equal(directSubject(text),subject,text);
  assert.equal(isGeneralTopicRequest("What does my executor know about my private answers?"),false);
  const mixed="Where should Alex start, executor duties or privacy?";
  assert.equal(directSubject(mixed),null);
  assert.ok(isGeneralTopicRequest(mixed));
  assert.ok(isTopicChoice(mixed));
  assert.equal(isTopicChoice("Can you explain if my executor can sell my car?"),false);
  assert.deepEqual(topicsFor(mixed),["executor","privacy"]);
  for(const text of ["I wonder who can witness","Can Alex be my witness","Does this have to match my ID","Let me ask about probate","Which name","How much"])
    assert.equal(turn(text,name).type,"help",text);
  for(const text of ["Will Young","May Ann Li","Can Yılmaz","Qui Nguyen","Whoopi Goldberg"])
    assert.equal(readAnswer(name,turn(text,name).value).value,text);
  const gift=questions(on,{}).find(q=>q.giftMenu);
  for(const text of ["Would my daughter get my car","Can I leave my car to my twelve-year-old daughter?","Can I leave cash to my cat?","Can I leave cash to a charity?"])
    assert.ok(["guide","help"].includes(turn(text,gift).type),text);
  assert.equal(turn("Can I go back?",name).type,"guide");
  assert.equal(hasSensitive("Do you store my password anywhere?"),false);
  assert.equal(hasSensitive("My password is fiction123"),true);
  assert.equal(disclosesPressure("My phone is forcing me to update before I can sign in"),false);
  assert.equal(disclosesPressure("What is forced heirship?"),false);
  assert.equal(disclosesPressure("I am not being forced, but my brother is pressuring me."),true);
});

test("four everyday questions in each language reach privacy, editing, a home and charity locally",async()=>withCatalogs(async()=>{
  const more={
    en:["Who can see my answers?", "Can I correct a typo?", "Can I leave my house to my sister?", "Can I give money to a charity?"],
    fr:["Qui peut lire mes réponses ?", "Comment modifier une réponse ?", "Puis-je léguer ma maison à mon frère ?", "Puis-je donner à un organisme de bienfaisance ?"],
    es:["¿Quién lee mis respuestas?", "¿Puedo cambiar una respuesta?", "¿Puedo dejar mi casa a mi hija?", "¿Puedo dejar dinero a una organización benéfica?"],
    de:["Wer liest meine Antworten?", "Kann ich eine Antwort ändern?", "Kann ich mein Haus vererben?", "Kann ich einer gemeinnützigen Organisation Geld hinterlassen?"],
    it:["Chi può leggere le mie risposte?", "Posso correggere il nome?", "Posso lasciare la mia casa a mia sorella?", "Posso lasciare soldi in beneficenza?"],
    nl:["Wie leest mijn antwoorden?", "Kan ik mijn antwoord wijzigen?", "Mag ik mijn huis aan een vriend nalaten?", "Kan ik geld aan een goed doel nalaten?"],
    da:["Hvem ser mine svar?", "Kan jeg rette mit navn?", "Kan jeg efterlade mit hus til min søster?", "Kan jeg give penge til velgørenhed?"],
    sv:["Vem kan läsa mina svar?", "Kan jag ändra ett svar?", "Kan jag lämna mitt hus till min syster?", "Kan jag ge pengar till välgörenhet?"],
    nb:["Hvem kan se svarene mine?", "Kan jeg endre et svar?", "Kan søsteren min arve huset mitt?", "Kan jeg gi penger til en veldedig organisasjon?"],
    fi:["Kuka näkee vastaukseni?", "Voinko korjata nimen?", "Voinko jättää taloni sisarelleni?", "Voinko jättää rahaa hyväntekeväisyyteen?"],
    is:["Hver sér svörin mín?", "Get ég breytt svari eftir á?", "Má systir mín erfa húsið mitt?", "Má ég gefa til góðgerðarmála?"],
    pt:["Quem pode ler as minhas respostas?", "Posso alterar uma resposta?", "Posso deixar a minha casa à minha irmã?", "Posso deixar dinheiro a uma instituição de caridade?"],
    et:["Kes näeb minu vastuseid?", "Kas saan nime parandada?", "Kas mu õde võib pärida minu maja?", "Kas võin jätta raha heategevuseks?"],
    cs:["Kdo uvidí moje odpovědi?", "Mohu opravit jméno?", "Mohu odkázat svůj dům sestře?", "Mohu odkázat peníze charitě?"],
    pl:["Kto zobaczy moje odpowiedzi?", "Czy mogę zmienić odpowiedź?", "Czy mogę zostawić moje mieszkanie siostrze?", "Czy mogę zostawić pieniądze fundacji?"],
    hr:["Tko može vidjeti moje odgovore?", "Mogu li ispraviti ime?", "Mogu li ostaviti svoju kuću sestri?", "Mogu li ostaviti novac humanitarnoj udruzi?"],
    sk:["Kto uvidí moje odpovede?", "Môžem opraviť meno?", "Môžem odkázať svoj dom sestre?", "Môžem nechať peniaze charite?"],
    mt:["Min jista’ jara t-tweġibiet tiegħi?", "Nista’ nbiddel tweġiba?", "Nista’ nħalli d-dar tiegħi lil oħti?", "Nista’ nħalli flus għall-karità?"],
    "zh-Hans":["谁能看到我的回答？","我能修改答案吗？","可以把我的房子留给姐姐吗？","能给慈善机构留一笔钱吗？"]
  };
  assert.deepEqual(new Set(Object.keys(more)),new Set(Object.keys(languages)));
  const subjects=["privacy","edit","home","gifts"];
  for(const [lang,row] of Object.entries(more)){
    await setLanguage(lang,{remember:false});
    row.forEach((question,i)=>assert.equal(directSubject(question),subjects[i],lang+": "+question));
  }
}));

test("the actual kit controls witness, family and planning answers",()=>{
  const place=(country,region="")=>profile({country,region});
  const printed={execution:"Print and sign with two witnesses"};
  assert.match(helpFor("witness",on),/write every word.*independent adults/s);
  assert.match(helpFor("witness",on,printed),/two independent adults/);
  assert.match(helpFor("witness",executionProfile(on,{execution:copyByHand}),{execution:copyByHand}),/does not require any witnesses/);
  assert.match(helpFor("witness",place("US","PA")),/not required/);
  assert.match(helpFor("witness",place("GB","SCT")),/one suitable independent/);
  const englishWitnesses = helpFor("witness",place("GB","ENG"));
  assert.match(englishWitnesses,/two independent witnesses over 18/i);
  assert.match(englishWitnesses,/the beneficiary could lose their gift/i);
  assert.match(englishWitnesses,/executor can be a witness if they meet the other requirements/i);
  assert.match(helpFor("witness",place("US","TX")),/two witnesses and a notary/);
  assert.match(helpFor("witness",place("EE")),/six months/);
  assert.equal(helpFor("guardian",on),guidance.family);
  assert.match(helpFor("guardian",on,{household:"One adult beneficiary"}),/one adult.*review screen/s);
  assert.match(helpFor("guardian",place("US","TX"),{descendants:"No children or grandchildren"}),/No children or grandchildren.*review screen/s);
  assert.equal(directSubject("Can I leave my house in Florida to my sister?",on),"international");
  assert.equal(directSubject("Can I leave my house in Ontario to my sister?",on),"home");
  assert.equal(helpFor("guardian",place("CA","BC")),guidance.limitedFamily);
  assert.equal(helpFor("guardian",place("US","FL")),guidance.limitedFamily);
  assert.equal(helpFor("guardian",place("US","ME"),{maineChoice:true}),guidance.maine);
  for(const c of ["NL","MT","PT"])assert.match(helpFor("witness",place(c)),/notar|court/i,c);
  const notes=wishesProfile(on,{extra:adviceOption});
  assert.equal(notes.route,"planning");
  for(const subject of ["witness","signing","custody","guardian","survival"])assert.equal(helpFor(subject,notes),guidance.notesOnly);
});

test("every help-menu route and authored response has a usable edition in every language and location",async()=>withCatalogs(async()=>{
  const profiles=[];
  for(const country of Object.keys(markets))for(const region of Object.keys(regions[country]||{"":1}))profiles.push(profile({country,region}));
  assert.equal(profiles.length,97);
  const alternates=profiles.filter(p=>p.handOption).map(p=>executionProfile(p,{execution:copyByHand}));
  const variants=[...profiles,...alternates,{...on,route:"planning"},{...profiles.find(p=>p.key==="US-ME"),route:"statutory"}];
  for(const lang of Object.keys(languages)){
    await setLanguage(lang,{remember:false});
    const catalog=lang==="en"?null:await (await fetch("/locales/"+lang+".json")).json();
    const check=(text,label)=>{
      assert.ok(typeof text==="string" && text.length>0,label);
      if(catalog)assert.ok(Object.hasOwn(catalog,sourcePattern(text)),lang+"/"+label+": "+sourcePattern(text));
      assert.ok(!/\{\d\}|undefined/u.test(display(text)),label);
    };
    for(const [key,text] of Object.entries(guidance))check(text,key);
    for(const [subject,label] of helpMenu){
      check(label,subject);
      for(const p of variants)check(helpFor(subject,p),p.key+"/"+subject);
    }
  }
}));
