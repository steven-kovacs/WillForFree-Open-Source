import {looksLikeQuestion,questionSubjects} from "./help-language.js";
import {allowedTopics} from "./topic-contract.js";
export {allowedTopics,helpContexts,safeTopic,firstTopic,chooseLocalTopic} from "./topic-contract.js";
import {currentLanguage,display} from "./locale.js";
export const help = {
  process: "First we check where you live and what kind of will fits. Then you tell us who should inherit. You can check your choices, download your kit and follow the instructions inside.",
  executor: "An executor handles the paperwork, pays bills and carries out the will. A beneficiary is someone who receives a gift.",
  children: "You can leave gifts to children. Some local forms also let you name someone to care for them or manage their money. Those are two different jobs.",
  signing: "A download alone isn’t a signed will. Your kit tells you exactly how to finish it where you live.",
  privacy: "Your answers and will stay in your browser. We never send them to an AI provider. Download your kit at the end to keep a copy.",
  price: "It’s free. No card, no email gate, no donation request, no paid download.",
  province: "Choose the place you consider your permanent home. If the suggestion is wrong, you can change it.",
  asset: "A gift can be one thing you own, like a ring, or an amount of money. Some property passes separately, such as an account with a named beneficiary.",
  notes: "Notes are messages for your family or questions to take to an appointment. A note does not give away property or take the place of a signed will.",
  general: "I can help with this step, explain a word, or tell you what comes next. What would you like to know?",
};

const patterns = {
  notes: /\b(notes?|message|memorial|funeral|pets?)\b/i,
  process:
    /\b(how does|how do i start|how it works|process|start (?:my|a|the) (?:will|interview)|draft|download|what happens next|steps|begin|will maker)\b/i,
  executor:
    /\b(executor|beneficiar(?:y|ies)|estate trustee|paperwork|administrator|someone to handle)\b/i,
  children:
    /\b(kids?|children|child|guardian|guardianship|trustee|caregiver|minor|trust)\b/i,
  signing:
    /\b(sign|signature|witness(?:es)?|notari[sz]e|handwrit\w*|legal|valid|binding|pen)\b/i,
  privacy:
    /\b(private|privacy|retain|store|sharing|secure|confidential|data|password)\b/i,
  price:
    /\b(price|pricing|paid|pay|cost|free|card|email|donation|charge|hidden|gimmick)\b/i,
  province:
    /\b(province|state|country|location|residence|ontario|canada|qu[eé]bec|alberta|manitoba|yukon|territor\w*|columbia)\b/i,
  asset:
    /\b(assets?|house|car|ring|money|property|accounts?|insurance|inheritance|inherit|gifts?|bank)\b/i,
};
// Only public glossary terms are compared. A visitor's phrase never leaves this tab.
const topicWords = {
  notes:["notes","message","funeral","pet"], process:["steps","download","How does it work?"],
  executor:["executor","beneficiary","estate trustee","liquidator"], children:["children","guardian","trustee"],
  signing:["witness","signature","handwritten will"], privacy:["privacy","private"],
  price:["free","price"], province:["location","permanent home"], asset:["gift","money","keepsake"]
};
function mentions(text,english) {
  const word=display(english).toLocaleLowerCase(currentLanguage());
  const phrase=text.toLocaleLowerCase(currentLanguage());
  if(currentLanguage()==="zh-Hans")return phrase.includes(word);
  const at=phrase.indexOf(word);
  if(at<0)return false;
  return !/[\p{L}\p{N}]/u.test(phrase[at-1]||"") && !/[\p{L}\p{N}]/u.test(phrase[at+word.length]||"");
}

export function topicsFor(text) {
  const subjects=questionSubjects(text);
  const local={executor:"executor",witness:"signing",signing:"signing",guardian:"children",personal:"notes",download:"process",outside:"asset",cost:"price"};
  const matched=new Set([...subjects].map(key=>local[key]).filter(Boolean));
  return allowedTopics.filter(k => matched.has(k) || k==="process" && /^start$/i.test(text.trim()) || patterns[k].test(text) || currentLanguage()!=="en" && topicWords[k]?.some(word=>mentions(text,word)));
}
const credentialLabels={
  fr:"mot de passe|code secret|clé privée",es:"contraseña|clave privada|código de acceso",
  de:"passwort|kennwort|privater schlüssel",it:"password|codice di accesso|chiave privata",
  nl:"wachtwoord|toegangscode",da:"adgangskode|kodeord",sv:"lösenord|pinkod",nb:"passord|tilgangskode",
  fi:"salasana|tunnusluku",is:"lykilorð|aðgangskóði",pt:"senha|palavra-passe|chave privada",
  et:"parool|salasõna",cs:"heslo|přístupový kód",pl:"hasło|kod dostępu",hr:"lozinka|zaporka",
  sk:"heslo|prístupový kód",mt:"password|kodiċi ta’ aċċess","zh-Hans":"密码|密碼|私钥|恢复短语|助记词"
};
const secretStatements=Object.fromEntries(Object.entries(credentialLabels).map(([lang,labels])=>[lang,
  new RegExp("(?:"+labels+")\\s*(?:[:：=]|(?:est|es|ist|è|is|er|är|on|é|je|jest|huwa|hija)(?![\\p{L}\\p{M}])|是|为)\\s*[^\\s?!？]+","iu")
]));
export function hasSensitive(v) {
  if(secretStatements[currentLanguage()]?.test(v))return true;
  return /(?:\b(?:password|passcode|pin|social insurance|credit card number|account number|recovery key|seed phrase|recovery phrase|private key|login)\s*(?:is\s+|[:=]\s*)\S+|\b(?:PIN|passcode)\s+\d{3,}\b|\b(?:seed phrase|recovery phrase|password|login|username|private key)\s+(?!manager\b|settings\b|inventory\b|instructions\b|anywhere[?？.]?$|here[?？.]?$|online[?？.]?$)\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\d[\s().-]*){7,}|sk-[\w-]{12,})/i.test(
    v,
  );
}
export function isQuestion(text) { return looksLikeQuestion(text); }
export function questionWhileAnswering(text,kind) { return looksLikeQuestion(text,kind); }
