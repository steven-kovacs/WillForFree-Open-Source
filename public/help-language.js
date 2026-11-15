import {currentLanguage, display} from "./locale.js";
import {vocabulary} from "./help-terms.js";

// Fold accents for typed questions, never for the wording saved in a will.
export const fold = text => text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase()
  .replace(/ł/g,"l").replace(/ø/g,"o").replace(/ð/g,"d").replace(/ħ/g,"h").replace(/ß/g,"ss")
  .replace(/[^\p{L}\p{N}*]+/gu," ").trim();
const starters = {
  en:"what|who|which|when|where|why|how|is it|is my|is that|is this|is there|is a|are there|are my|am i|does|do i|do we|do you|do my|do both|can i|can my|can we|can the|can someone|can an|can a|can you|can this|could|would|should|must|may i|may my|will i|will my|will the|will this|will it|will they|will a|tell me|explain|define|i wonder|i'm wondering|i want to know|help me understand",
  fr:"qui|que|qu'est|quel|quelle|quels|quelles|quand|comment|combien|pourquoi|où|puis-je|peut|peux|dois|est-ce|faut|y a|je voudrais savoir|expliquez",
  es:"quién|quiénes|qué|cómo|cuál|cuáles|cuándo|cuánto|cuánta|dónde|por qué|puedo|puede|pueden|debo|deben|tengo que|es necesario|hay que|quisiera saber",
  de:"wer|wen|wem|was|wie|wo|wann|warum|welche|welcher|welchen|darf|dürfen|kann|können|muss|müssen|ist es|ist mein|ist das|sind|brauche|ich frage mich",
  it:"chi|cosa|che cosa|come|quando|quanto|quale|quali|perché|dove|posso|può|possono|devo|serve|bisogna|è possibile",
  nl:"wie|wat|welke|waar|hoe|hoeveel|waarom|wanneer|mag|mogen|kan|kunnen|moet|moeten|is het|wordt|krijg",
  da:"hvem|hvad|hvordan|hvor|hvorfor|hvornår|hvilke|må|kan|skal|er det|koster|får",
  sv:"vem|vad|hur|var|varför|när|vilka|vilken|får|kan|måste|ska|är det|kostar|behöver",
  nb:"hvem|hva|hvordan|hvor|hvorfor|når|hvilke|kan|må|skal|er det|koster|får|trenger",
  fi:"kuka|ketkä|ketä|mikä|mitä|miksi|missä|mihin|miten|milloin|kuinka|paljonko|voiko|voinko|voivatko|saako|saanko|onko|täytyykö|pitääkö|tarvitaanko|tarvitsenko",
  is:"hver|hvað|hvar|hvernig|hvers vegna|hvenær|hvaða|má|mega|get|geta|getur|þarf|er hægt|er það",
  pt:"quem|o que|que|qual|quais|como|onde|quando|quanto|por que|porquê|posso|pode|podem|devo|preciso|tenho de|é possível",
  et:"kes|kelle|keda|mis|mida|millal|miks|kus|kuidas|kas|kui palju|milline",
  cs:"kdo|koho|komu|co|jak|kde|kdy|proč|který|které|kolik|mohu|můžu|může|mohou|musím|musí|smím|smí|lze|je možné",
  pl:"kto|kogo|komu|co|czym|jak|gdzie|kiedy|dlaczego|który|ile|czy|mogę|może|muszę|potrzebuję",
  hr:"tko|koga|komu|što|šta|kako|gdje|kada|zašto|koji|koliko|mogu|može|moram|trebam|je li|smijem|smije|mora li",
  sk:"kto|koho|komu|čo|ako|kde|kedy|prečo|ktorý|koľko|môžem|môže|musia|musím|musí|smie|dá sa|je možné",
  mt:"min|x'jiġri|x'inhu|x'inhi|x'inhuma|kif|fejn|meta|għaliex|liema|kemm|nista|jista|tista|jistgħu|għandi|irridu|għalfejn",
  "zh-Hans":"谁|谁能|怎么|怎样|如何|为什么|哪|能否|能不能|能吗|能不能|可不可以|可否|是否|需不需要|是不是|什么"
};

const roleWords = {
  fr:"exécuteur*|exécutrice*|liquidateur*|liquidatrice*",es:"albacea*",de:"testamentsvollstreck*",it:"esecutor*",nl:"executeur*",da:"bobestyr*",sv:"testamentsexekutor*|boutredningsman*",nb:"testamentsfullbyrd*|bostyr*",fi:"toimeenpanij*|pesänselvittä*",is:"skiptastjór*|erfðaskrárframkvæmd*",pt:"testamenteir*|cabeça de casal",et:"testamenditäit*|testamendi täit*",cs:"vykonavatel*",pl:"wykonawc*",hr:"izvršitelj*",sk:"vykonávateľ*",mt:"eżekutur*|eżekutriċi|tal-eżekutur","zh-Hans":"执行人"
};
const priceForOfficial = {
  en:"notar*|court|lawyer|solicitor|filing|probate|registration",fr:"notair*|tribunal|avocat*",es:"notari*|juzgado|abogad*",de:"notar*|gericht*|anwalt*",it:"notai*|notaio|tribunale|avvocat*",nl:"notaris*|rechtbank|advocaat*",da:"notar*|retten|advokat*",sv:"notari*|domstol*|advokat*",nb:"notar*|retten|advokat*",fi:"notaar*|oikeud*|asianajaj*",is:"lögbók*|dómstól*|lögmann*",pt:"notári*|cartório*|tribunal|advogad*",et:"notar*|kohtus|kohtu*",cs:"notář*|soud*|advokát*",pl:"notariusz*|sąd*|prawnik*",hr:"bilježnik*|bilježnika|sud*|odvjetnik*",sk:"notár*|súd*|advokát*",mt:"nutar|in-nutar|qorti|il-qorti|avukat","zh-Hans":"公证|法院|律师"
};
const dictionaries={...vocabulary,executor:{en:"executor*|estate trustee|administrator|liquidator",...roleWords},official:priceForOfficial};
const compiled=new Map();
function expression(list, chinese) {
  const prefix=chinese?"":"(?:^| )", end=chinese?"":"(?= |$)";
  const phrases=list.split("|").map(term=>fold(term).replaceAll("*","[\\p{L}\\p{N}]*"));
  return new RegExp(prefix+"(?:"+phrases.join("|")+")"+end,"u");
}
function dictionary(lang) {
  if(!compiled.has(lang)) {
    const entries=Object.entries(dictionaries).map(([key,group])=>[key,[expression(group.en,false),
      ...(group[lang] && lang!=="en"?[expression(group[lang],lang==="zh-Hans")]:[])]]);
    compiled.set(lang,{terms:entries,starts:(starters[lang] || "").split("|").map(fold)});
  }
  return compiled.get(lang);
}
export function questionSubjects(value,lang=currentLanguage()) {
  const text=fold(value);
  return new Set(dictionary(lang).terms.filter(([,patterns])=>patterns.some(re=>re.test(text))).map(([key])=>key));
}
export const questionMark = text => /[?？¿]/u.test(text);
export function looksLikeQuestion(value, kind) {
  if(questionMark(value))return true;
  const lang=currentLanguage(), text=fold(value);
  if(!text)return false;
  if(lang==="zh-Hans" && /吗|么|呢$|怎么办|怎么|如何|谁|多少|可以吗|能不能|是否|什么|哪里/u.test(text))return true;
  const starts=lang==="en"?dictionary("en").starts:[...dictionary(lang).starts,...dictionary("en").starts];
  if(/^(?:how much|which name|what name|how many|what next|let me ask|i have a question)\b/u.test(text))return true;
  if(/^(?:can|will|may|do|did|are|is)\s+\S+\s+/u.test(text) && questionSubjects(value,lang).size)return true;
  if(lang==="fr" && /(?:peut|doit|faut|sont|est|vais|vont|dois|peux|devront)-(?:t-)?(?:il|ils|elle|elles|on|je)/iu.test(value))return true;
  if(!starts.some(start=>text===start || text.startsWith(start+" ")))return false;
  if(!["name","names","town","noteName","notes"].includes(kind))return true;
  // Short real names can start with a question word (Qui Nguyen, Can Yilmaz).
  return text.split(" ").length>=3 || lang==="zh-Hans" || questionSubjects(value,lang).size>0 ||
    /^(?:(?:what|who|how|where|why|when) (?:now|next|else)|please explain)$/u.test(text);
}
export function localControl(input) {
  const text=fold(input);
  return ["Yes","No","I’m not sure","Nothing else","I’m done","Skip this","Start over","Help","Go back"]
    .find(word=>fold(display(word))===text || fold(word)===text);
}
