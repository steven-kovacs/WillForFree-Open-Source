import {help} from "./flow.js";
import {fold, questionSubjects} from "./help-language.js";
import {currentLanguage, display, editionNotice, sentence, translatedList, wording} from "./locale.js";
import {completionSummary} from "./legal-locations.js";
import {estateNotice, signing, ordinaryWitnesses, originalCustody, scottishWitnessIdentity} from "./document.js";
import {survivalHelp} from "./survival.js";
import {businessHelp, businessWords} from "./business.js";
import {supportsGifts} from "./extras.js";
import {markets,regions} from "./markets.js";
import {maineSpouseAmount, texasFamilyHome} from "./procedures.js";

export const guidance = {
  blankEdition:"The blank will is in English. The signing guide is in your chosen language. Use the form only if you understand the entire will.",
  language:"These kits cover specific choices for a first will. Some include choices for parents. The chat explains what the selected form can do. You can change the language of the chat and kit. Publisher forms keep their original wording. California and Maine supply English forms. Texas also supplies an English–Spanish form. A location in the list does not mean every family or estate there can use the same form.",
  unknown:"I don’t have a prepared answer to that question. You can explore the help topics or check the local guidance. If your decision depends on the answer, ask a qualified estates professional where you live before signing.",
  expenses:"Keep receipts and a record of trips you make for the estate. Repayment of expenses and payment for an executor’s time are separate questions. This kit sets no mileage rate or fee. Check what the local rules allow before claiming either.",
  tax:"This kit doesn’t calculate taxes. What the estate or a beneficiary might owe depends on the property and the tax rules that apply. A local tax authority or a tax professional can help you check before you distribute anything.",
  debt:"Make a list of what the estate owns and owes. If there may be too little to pay everyone, ask a local estates professional about the order of payment before paying creditors or giving anything to beneficiaries.",
  probate:"After a death, a court or another local authority may need to confirm the will or who can handle the estate. A signed will alone doesn’t settle that question. The process depends on the location and the property involved.",
  familyRights:"Local law can protect a spouse, children or other dependants even if the will leaves them nothing. If you want to leave someone out, have a blended family, or a gift could affect benefits, get advice about that situation before signing.",
  limitedFamily:"This version leaves the remainder of your estate to one adult. It has no place to appoint a guardian or set aside money for a child. If you need either, choose a form that covers your family or get local advice.",
  capacity:"A will records the maker’s own choices. If someone needs help understanding the will or signing it, or you’re helping another person make theirs, ask a local estates professional about the options before using this kit.",
  international:"If you have property or a permanent home in more than one place, a single location choice may miss rules that affect your estate. Get advice covering each place before signing. Bring details of any existing will.",
  previous:"This service is for a first will. If you’ve already signed one, even by hand, changing it needs a different process.",
  change:"After a move, marriage, separation, birth, adoption, death or change of beneficiary, reconsider the whole plan under the law that then applies. Do not hand-edit a signed will. Completing this chat again produces a new unsigned document.",
  outside:"Check beneficiary nominations and jointly owned assets with the relevant institution. Keep account credentials outside the will.",
  home:"Check whose name is on the title, how the home is owned and whether there is a mortgage. Your will can only pass the interest that forms part of your estate. If you want to leave a particular home to someone, check that the form has that option.",
  lifetime:"This is a will concerning your estate after death. It does not appoint someone to make medical or financial decisions for you during your lifetime. An account that already names a beneficiary, or property owned jointly, may pass outside your will.",
  family:"Think about two jobs. Who would you want to care for your children if they needed a guardian? Who would you trust with money you leave them? A will can record your choices where local law allows. A surviving parent’s rights and a court’s decision can affect who cares for a child.",
  cost:"WillForFree charges nothing. If your local signing process involves a notary, court or other professional, they may charge for their part.",
  download:"Download your kit to keep a copy. It contains personal information, so store it somewhere private. If you close or refresh this page, your next chat starts fresh.",
  personal:"Pet-care instructions, memorial preferences, digital information and messages stay in a separate file. Those notes do not change who inherits or give anyone permission to sign into an account. Keep passwords, access codes and banking details out of the chat and the will.",
  notesOnly:"Keep these private notes for a future will. There is no will to sign in this kit.",
  id:"Use the full name a person uses on official papers.",
  edit:"You can change any answer on the review screen.",
  ai:"When you ask a question, your browser first checks the explanations we’ve already written. If you’re choosing between general help topics, AI can suggest one. If we don’t have an answer, the chat says so. AI doesn’t look up or write a new answer.",
  intestacy:"Local inheritance rules decide who receives the money and property in your estate. Someone important to you, like a close friend, could receive nothing under those rules. Some places also protect a spouse’s or child’s share even when you do make a will.",
  executorRole:"In many places, you can name someone you trust to settle bills and carry out your wishes. You may hear this person called an executor. Ask whether they’re willing to do it, and tell them where to find the signed original.",
  executorFit:"Check your first and backup choices against the local rules on where they live, their age, their ability to act and any convictions. No need to enter those private details.",
  beneficiary:"A beneficiary is a person or organization that gets something through your will.",
  guardianRole:"In the part about children, a guardian is the person you would like to look after them if one is needed.",
  trustee:"In the part about children, this is someone chosen to look after their money or property. They don’t have to be the child’s caregiver.",
  residue:"It means what’s left of your money and property after bills, expenses and any separate gifts.",
  beforeMethod:"Here, you can print your will and sign with two witnesses together, or write every word yourself and sign at the end. The kit explains the method you choose.",
  maine:"The official form includes options for a spouse, children and a guardian. The chat option leaves what’s left to one adult, with a backup.",
};

// The destination is the actual output profile, including a visitor's choice of notes for advice.
// These topics are also available by tapping translated labels without typing a question.
export const helpMenu=[
  ["witness","Witness"],["guardian","Children, trustees and guardian"],["familyRights","Family rights"],
  ["outside","What can pass through your estate"],["survival","If a beneficiary dies too soon"],
  ["expenses","Executor expenses and pay"],["tax","Estate taxes"],["debt","Debts"],["probate","Probate, witness affidavits and proof of handwriting"],
  ["international","Property in another country"],["existing","An earlier will"],["lifetime","Health and financial decisions during life"],
  ["personal","Personal wishes"],["custody","After signing"],["edition","Language"],["download","Download your kit"],["cost","Is it actually free?"],["privacy","Is this private?"],
  ["intestacy","What happens if I leave no will?"],["executorRole","Who will take care of the paperwork?"],["gifts","Can I add more gifts or personal wishes?"],["home","Property covered by this will"]
];
export function helpFor(subject,p,{execution,household,descendants,maineChoice=false}={}) {
  const notes=p.route==="planning" || p.route==="professional";
  if(subject==="edition")return editionNotice(p) || (p.route==="fixed" || p.route==="statutory" ? guidance.blankEdition : guidance.language);
  if(subject==="cost")return guidance.cost;
  if(subject==="privacy")return help.privacy;
  if(subject==="expenseTax")return translatedList([guidance.expenses,guidance.tax]," ");
  if(subject==="home" && notes)return guidance.notesOnly;
  if(!notes && p.key==="US-TX" && (subject==="home" || subject==="familyRights"))
    return translatedList([texasFamilyHome,subject==="home" ? guidance.home : guidance.familyRights]," ");
  if(subject==="outside")return translatedList(["A joint owner or someone named on an account, pension or insurance policy may receive it separately. Property held in a trust may also pass separately.",guidance.outside]," ");
  if(subject==="personal" && ["fixed","statutory"].includes(p.route))return help.notes;
  if(subject==="process")return notes?"This path lets you write down your plans and download them to take to an appointment.":help.process;
  if(subject==="business")return businessHelp;
  if(subject==="age")return translatedList([sentence("Is {0} your permanent home, and are you at least {1}?",wording(p.name),p.minimum),"Use the place you consider your permanent home, even if you’re visiting somewhere else. The age shown is the minimum for this service."]," ");
  if(subject==="gifts") {
    if(notes)return "This kit records plans, including gifts you want to discuss locally.";
    if(maineChoice)return translatedList([guidance.maine,maineSpouseAmount]," ");
    if(p.route==="statutory")return translatedList([signing(p)[1],maineSpouseAmount]," ");
    if(p.key==="US-CA")return "You can name people or charities for cash gifts, one gift at a time.";
    return supportsGifts(p)?"You can give keepsakes or money to named adults, one gift at a time.":"This will form doesn’t have a place for separate gifts.";
  }
  if(["witness","signing","guardian","survival","custody"].includes(subject)) {
    if(notes)return guidance.notesOnly;
    if(maineChoice && ["witness","signing","guardian","survival"].includes(subject))return guidance.maine;
  }
  if(subject==="guardian"){
    if(p.parentPlan && household==="One adult beneficiary")return translatedList([guidance.limitedFamily,guidance.edit]," ");
    if(p.key==="US-TX" && descendants==="No children or grandchildren")
      return translatedList([sentence("{0} · {1}",wording("Children or grandchildren"),wording(descendants)),guidance.edit]," ");
    return p.parentPlan || ["official","statutory"].includes(p.route)?guidance.family:guidance.limitedFamily;
  }
  if(subject==="survival")return survivalHelp(p);
  if(subject==="custody")return originalCustody(p);
  if(subject==="probate" && !notes && estateNotice(p))
    return translatedList([guidance.probate, estateNotice(p)], " ");
  if(subject==="existing")return guidance.previous;
  if(subject==="signing" || subject==="witness") {
    if(p.handOption && !execution && p.route==="paper"){
      if(subject==="signing")return guidance.beforeMethod;
      return translatedList([guidance.beforeMethod,translatedList(["Print and sign with two witnesses",signing(p)[1]]," · ")]," ");
    }
    if(subject==="signing")return completionSummary(p);
    const rules=signing(p);
    if(p.route==="deposit")return completionSummary(p);
    if(p.route==="handwriting")return p.key==="CA-ON"?rules[1]:p.key==="US-LA"?rules[3]:completionSummary(p);
    if(p.route==="statutory")return rules[4];
    if(p.route==="official")return completionSummary(p);
    if(p.key==="GB-SCT")return translatedList([rules[0], scottishWitnessIdentity]," ");
    if(["GB-ENG","GB-WLS"].includes(p.key))return rules[0];
    if(p.country==="EE")return completionSummary(p);
    return p.route === "fixed" ? ordinaryWitnesses : rules[1];
  }
  return guidance[subject] || guidance.unknown;
}

const definitionStarts={
  en:"what is|what s|who is|what does|what do|define",fr:"qu est ce qu|qu est ce que|que signifie|c est quoi|quel est le rôle|à quoi sert",es:"qué es|qué significa|quién es|qué hace",de:"was ist|was bedeutet|wer ist|was macht",
  it:"che cos è|cos è|cosa significa|chi è|cosa fa",nl:"wat is|wat betekent|wie is|wat doet",da:"hvad er|hvad betyder|hvad laver",sv:"vad är|vad betyder|vad gör",nb:"hva er|hva betyr|hva gjør",fi:"mikä on|kuka on|mitä tarkoittaa|mitä tekee",is:"hvað er|hvað þýðir|hver er",pt:"o que é|o que significa|quem é|o que faz",et:"mis on|kes on|mida tähendab|mida teeb",cs:"co je|co znamená|kdo je|co dělá",pl:"co to jest|kto to jest|co oznacza|kim jest|co robi",hr:"što je|što znači|tko je|što radi",sk:"čo je|čo znamená|kto je|čo robí",mt:"x inhu|x inhi|xi jfisser|min hu|x jagħmel","zh-Hans":"什么是|什么叫"
};
const articles=/^(?:(?:an?|the|un[ae]?|le|la|l|el|ein(?:e[rnms]?)?|de|het|een|en|ett|et|uma?|o|il|lo|der|den|dem|di|del|du|d) )+/u;
function definedRole(value,lang) {
  const roles={beneficiary:["beneficiary"],executorRole:["executor","estate trustee","liquidator"],guardianRole:["guardian"],trustee:["trustee"],residue:["residue"]};
  const prefix=[...definitionStarts.en.split("|"),...definitionStarts[lang].split("|")].map(fold)
    .find(word=>lang==="zh-Hans"?value.startsWith(word):value.startsWith(word+" "));
  const zhSuffix=lang==="zh-Hans" && value.endsWith("是什么意思");
  if(!prefix && !zhSuffix)return null;
  const term=(zhSuffix?value.slice(0,-5):value.slice(prefix.length)).trim().replace(articles,"").replace(/ (?:mean|do|means)$/u,"");
  for(const [key,names] of Object.entries(roles)){
    if(names.some(name=>[fold(name),fold(display(name))].includes(term)))return key;
  }
  // Allow an inflected role noun, but never consume a longer question about someone's actions.
  if((!term.includes(" ") || /^(?:executeur|executrice) testamentaire$/u.test(term)) && questionSubjects(term,lang).has("executor"))return "executorRole";
  return null;
}
const placeNames=new Map();
function mentionsPropertyElsewhere(s,p) {
  const lang=currentLanguage();
  if(!placeNames.has(lang)) {
    const entries=[];
    for(const [country,name] of Object.entries(markets)){
      entries.push([country,"",name]);
      for(const [region,label] of Object.entries(regions[country] || {}))entries.push([country,region,label]);
    }
    placeNames.set(lang,entries.map(([country,region,name])=>({country,region,names:[...new Set([fold(name),fold(display(name))])]})));
  }
  const padded=" "+s+" ";
  return placeNames.get(lang).some(({country,region,names})=>
    (country!==p.country || region && region!==p.region) && names.some(name=>
      lang==="zh-Hans" && s.includes("在"+name) ||
      ["in","en","au","aux","em","im","a","i","v","w","u","fi"].some(prep=>padded.includes(" "+prep+" "+name+" "))));
}
export function directSubject(value,place) {
  const s=fold(value), found=questionSubjects(value);
  if(/\b(?:edit|correct|change|revise)\b.*\b(?:my answers?|a name|my last answer|my choice|before downloading|before i download)\b/u.test(s))return "edit";
  if(/\b(?:willforfree|this site|this service|this chat|do you|can the site)\b.*\b(?:use ai|use artificial intelligence|send.*to ai|use my answers)\b/u.test(s))return "ai";
  if(/\b(?:no will|without (?:a |any )?will|intesta(?:cy|te)|sans testament|sin testamento|ohne testament|senza testamento|zonder testament|uden testamente|utan testamente|uten testament|ilman testamenttia|an erfðaskrar|sem testamento|ilma testamendita|bez zaveti|bez testamentu|bez oporuke|bez zavetu|bla testment)\b|没有遗嘱|没立遗嘱/u.test(s) || s===fold(display("What happens if I leave no will?")))return "intestacy";
  if(/\b(?:how old (?:must|do|should) i|am i old enough|minimum age|age to make a will)\b/u.test(s))return "age";
  if(/\b(?:privacy|private|data|passwords?)\b/u.test(s) && /\b(?:who (?:can |will )?(?:see|read)|do you|does (?:the|this)|sell|send|share|store|save)\b/u.test(s))return "privacy";
  if(found.has("tax") && found.has("expenses"))return "expenseTax";
  if(found.has("tax"))return "tax";
  if(found.has("expenses"))return "expenses";
  if(found.has("edit"))return "edit";
  if(found.has("aiHelp") || /\b(?:AI|IA|KI)\b/u.test(value) || /\b(?:uses?|involve|involves|using|ask|ask the|does|is) ai\b/u.test(s))return "ai";
  if(found.has("official") && (found.has("cost") || /\b(?:how much|combien|cuanto|wie viel|quanto|hoeveel|hvor meget|hur mycket|hvor mye|paljonko|hvad kostar|kui palju|kolik|ile|koliko|kolko|kemm)\b|多少钱/u.test(s)))return "cost";
  if(found.has("executor") && /\b(?:executor\b.*\b(?:lives? abroad|lives? (?:in another|overseas)|nonresident)|nonresident executor)\b/u.test(s))return "executorFit";
  if(/\b(?:forces? me|makes? me sign|coercion|coerced into signing)\b/u.test(s))return "capacity";
  for(const key of ["capacity","lifetime","familyRights","international","debt","probate","custody","survival","outside","personal","download"])if(found.has(key))return key;
  if(place && (found.has("home") || /\b(?:property|apartment|land|house|cottage)\b/u.test(s)) && mentionsPropertyElsewhere(s,place))return "international";
  if(found.has("existing"))return /divorc|marri|separat|after (?:i move|moving)|remarr|mariage|matrimoni|scheidung|heirat|echtscheiding|trouwen|skilsm|avi[oó]ero|naimisiin|skilnad|hjonaband|casamento|lahutu|abiell|rozvod|snatek|rozwod|slub|vjen|sobas|zwieg|离婚|再婚|结婚/u.test(s)?"change":"existing";
  const definition=definedRole(s,currentLanguage());
  if(definition)return definition;
  if(found.has("witness"))return "witness";
  if(found.has("signing"))return "signing";
  if(found.has("guardian"))return "guardian";
  if(found.has("home"))return "home";
  if(found.has("identity"))return "id";
  if(found.has("privacyRequest") || s===fold(display("Is this private?")) || s===fold(display("Who can see my answers?")))return "privacy";
  if(found.has("executor") && /\b(?:declines?|refuses?|unwilling|can t act|cannot act|who (?:can|should) (?:be|serve)|live abroad|lives abroad)\b/u.test(s))return "executorFit";
  if(found.has("executor") && /(?:executor.*(?:get paid|be paid|gets paid|charge for|paid for)|pay (?:the|my|an) executor)/u.test(s))return "expenses";
  if(found.has("charity") || /\b(?:specific gift|separate gift|conditional gift|physical gift)\b/u.test(s) || s===fold(display("Can I add more gifts or personal wishes?")))return "gifts";
  if(s===fold(display("Who will take care of the paperwork?")))return "executorRole";
  if(/\b(?:match my id|legal name|middle name|nickname|name on my id|passport|birth certificate)\b/u.test(s))return "id";
  if(found.has("business") || businessWords.test(value))return "business";
  if(/\b(?:language|translation|translated|welsh|bilingual)\b/u.test(s) || s.includes(fold(display("Language"))) && currentLanguage()!=="en")return "edition";
  if(found.has("cost") && (/\b(?:site|download|kit|willforfree|your service|this service|ce service|este servicio|dieser dienst|questo servizio|deze dienst|denne tjeneste|den har tjansten|este servico)\b/u.test(s) || /^(?:is (?:it|this)(?: really| actually)? free|how much (?:is it|does (?:it|this) cost)|do i (?:have to |need to )?pay|what does (?:it|this) cost)$/u.test(s) || s===fold(display("Is it actually free?"))))return "cost";
  return null;
}
export function isGeneralTopicRequest(value) {
  const s=fold(value);
  return /\b(?:explain|which (?:help )?topic|topics? (?:first|to start)|tell me about|where (?:do|should) (?:i|we|\w+) start|how does (?:it|this|the site) work)\b/u.test(s) ||
    /^(?:what (?:is|are)|what s|who is) (?:an? |the )?(?:executor|beneficiary|witness|guardian|trustee|residue|will kit|privacy|gifts?)$/u.test(s) ||
    /(?:expliqu|explic|erklar|spieg|uitleg|forklar|forkla|selit|utskyr|selgit|vysvet|wyjasn|objas|spjega|解释|说明)/u.test(s);
}
// Only a request to choose a help topic can benefit from a remote ranking.
// A mention of multiple legal subjects, even after "please explain", needs its own prepared answer.
export function isTopicChoice(value) {
  const s=fold(value);
  return /\b(?:which (?:help )?topic|where (?:do|should) .*start|(?:topic|topics) .*start with|which .*first)\b/u.test(s) ||
    /(?:quel sujet|que tema|welches thema|quale argomento|welk onderwerp|hvilket emne|vilket amne|mista aiheesta|hvada efni|qual (?:o )?tema|millisest teemast|kterym tematem|ktorego tematu|kojom temom|ktorou temou|liema suggett|哪个主题|哪一项.*先)/u.test(s);
}
