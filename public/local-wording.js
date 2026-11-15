import {currentLanguage, display} from "./locale.js";

// These local checks flag wording that cannot be safely used as a name or an outright keepsake.
const phrases = {
  "unsure": [
    "my sister",
    "my brother",
    "my spouse",
    "my child",
    "my daughter",
    "my son",
    "my mother",
    "my father",
    "my wife",
    "my husband",
    "my partner",
    "my friend",
    "not sure",
    "I don't know",
    "nobody",
    "myself",
    "undecided"
  ],
  "condition": [
    "if",
    "unless",
    "only if",
    "provided that",
    "on condition that",
    "after graduation",
    "when they graduate",
    "in trust",
    "instead",
    "must",
    "until",
    "equally",
    "on behalf of"
  ],
  "ineligible": [
    "house",
    "apartment",
    "land",
    "business",
    "business vehicle",
    "company",
    "shares",
    "stocks",
    "bank account",
    "cryptocurrency",
    "dog",
    "cat",
    "pet",
    "horse",
    "insurance",
    "pension"
  ],
  "ownership": [
    "leased",
    "rented",
    "financed",
    "mortgaged",
    "jointly owned",
    "co-owned",
    "on loan",
    "belongs to my company",
    "not mine"
  ],
  "pressure": [
    "I am being forced",
    "someone is forcing me",
    "I am under pressure",
    "I am not deciding freely",
    "I am being coerced"
  ]
};
const variants = {
  "cs": {
    "unsure": ["naše sestra", "náš bratr"],
    "ownership": ["pronajatý", "pronajatá", "pronajaté", "pronajatou", "vypůjčený", "vypůjčená", "vypůjčené"]
  },
  "da": {
    "unsure": ["vores søster", "vor søster", "vores bror", "vor bror"],
    "ownership": ["lejet", "lejede", "til leje"]
  },
  "et": {
    "unsure": ["meie õde", "me õde", "meie vend", "me vend"],
    "ownership": ["renditud", "üüritud", "laenatud"]
  },
  "fi": {
    "unsure": ["meidän siskomme", "siskomme", "meidän sisaremme", "sisaremme", "veljemme", "meidän veljemme"],
    "ownership": ["vuokrattu", "vuokratun", "lainassa", "lainattu"]
  },
  "hr": {
    "unsure": ["naša sestra", "naš brat"],
    "ownership": ["unajmljen", "unajmljeni", "unajmljena", "unajmljeno", "unajmljene", "iznajmljena", "posuđena"]
  },
  "is": {
    "unsure": ["systir okkar", "bróðir okkar"],
    "ownership": ["leigður", "leigða", "leigð", "leigt", "að láni"]
  },
  "mt": {
    "unsure": ["oħtna", "ħuna"],
    "ownership": ["mikri", "mikrija", "b’kera", "b’self"]
  },
  "nb": {
    "unsure": ["søsteren vår", "søstera vår", "vår søster", "broren vår", "vår bror"],
    "ownership": ["leid", "leide", "på lån"]
  },
  "pl": {
    "unsure": ["nasza siostra", "nasz brat"],
    "ownership": ["wypożyczony", "wypożyczona", "wypożyczone", "wynajęty", "wynajęta", "wynajęte"]
  },
  "sk": {
    "unsure": ["naša sestra", "náš brat"],
    "ownership": ["prenajatý", "prenajatá", "prenajaté", "požičaný", "požičaná", "požičané"]
  },
  "sv": {
    "unsure": ["vår syster", "vår bror"],
    "ownership": ["hyrd", "hyrda", "hyrt", "lånad", "lånade", "lånat"]
  },
  "fr": {
    "unsure": [
      "ma sœur",
      "ma soeur",
      "mon frère", "notre sœur", "notre soeur", "notre frère"
    ],
    "ownership": [
      "loué",
      "louée",
      "en location",
      "en crédit-bail",
      "financée",
      "financé",
      "hypothéquée"
    ],
    "ineligible": [
      "chien",
      "chienne",
      "chat",
      "chatte"
    ],
    "condition": [
      "à condition de",
      "sous réserve que",
      "s’il",
      "s’il obtient",
      "si elle"
    ]
  },
  "es": {
    "unsure": [
      "mi hermana",
      "mi hermano", "nuestra hermana", "nuestro hermano"
    ],
    "condition": [
      "si",
      "si se gradúa",
      "a condición de que"
    ],
    "ineligible": [
      "casa",
      "perro",
      "perra",
      "gato",
      "gata"
    ],
    "ownership": [
      "alquilada",
      "alquilado",
      "arrendada",
      "arrendado",
      "financiada",
      "financiado",
      "hipotecada"
    ]
  },
  "de": {
    "unsure": ["unsere Schwester", "unser Bruder"],
    "condition": [
      "falls",
      "wenn",
      "sofern"
    ],
    "ownership": [
      "geleast",
      "gemietet", "gemieteter", "gemietete", "gemietetes", "gemieteten", "gemietetem",
      "finanziert"
    ]
  },
  "it": {
    "unsure": ["nostra sorella", "nostro fratello", "la nostra sorella", "il nostro fratello"],
    "condition": [
      "se",
      "a condizione che"
    ],
    "ownership": [
      "noleggiata",
      "noleggiato",
      "in leasing", "a noleggio", "in prestito",
      "finanziata"
    ]
  },
  "pt": {
    "unsure": ["a nossa irmã", "nossa irmã", "o nosso irmão", "nosso irmão"],
    "condition": [
      "se",
      "desde que"
    ],
    "ownership": [
      "alugado",
      "alugada",
      "financiado",
      "financiada"
    ]
  },
  "nl": {
    "unsure": ["onze zus", "onze zuster", "onze broer"],
    "condition": [
      "als",
      "mits",
      "indien"
    ],
    "ownership": [
      "geleased",
      "gehuurd", "gehuurde", "geleend", "geleende",
      "gefinancierd"
    ]
  },
  "zh-Hans": {
    "condition": [
      "如果",
      "只要",
      "除非",
      "毕业后",
      "条件是"
    ],
    "unsure": [
      "我姐姐",
      "我妹妹",
      "我哥哥",
      "我弟弟",
      "我的姐姐",
      "我的妹妹", "我们的姐姐", "我们的妹妹", "我们的哥哥", "我们的弟弟",
      "我们姐姐", "我们妹妹", "我们哥哥", "我们弟弟"
    ],
    "ownership": [
      "租来的",
      "贷款买的",
      "租赁",
      "共同所有"
    ],
    "ineligible": [
      "房子",
      "房屋",
      "房产",
      "股份",
      "宠物",
      "猫",
      "狗"
    ]
  }
};

const normalize = s => s.normalize("NFKC").toLowerCase().replace(/[’‘]/gu,"'").replace(/\s+/gu," ").trim();
let previous, groups;
function lexicon() {
  const language=currentLanguage();
  if(previous===language)return groups;
  previous=language;
  groups=Object.fromEntries(Object.entries(phrases).map(([name,english])=>[name,
    [...new Set([...english.map(k=>display(k)),...(variants[language]?.[name] || [])].map(normalize))].filter(Boolean)
  ]));
  return groups;
}
function includesTerm(value,term) {
  if(currentLanguage()==="zh-Hans")return value.includes(term);
  let at=value.indexOf(term);
  while(at!==-1){
    if(!/[\p{L}\p{M}]/u.test(value[at-1]||"") && !/[\p{L}\p{M}]/u.test(value[at+term.length]||""))return true;
    at=value.indexOf(term,at+term.length);
  }
  return false;
}
export function localWordingIssue(raw,kind) {
  if(disclosesPressure(raw))return "pressure";
  if(currentLanguage()==="en")return "";
  const value=normalize(raw), terms=lexicon(), has=key=>terms[key].some(t=>includesTerm(value,t));
  if(kind==="names" && raw.split(/[,;，、；\n]+/u).some(name=>terms.unsure.includes(normalize(name))))return "name";
  if(["name","names","charity"].includes(kind) && (terms.unsure.includes(value) || has("condition")))return "name";
  if(kind==="item" && (has("condition") || has("ineligible") || has("ownership"))) return "item";
  return "";
}

// First-person disclosures still take priority when followed by a question about getting help.
const personalPressure = {
  fr:/me (?:force|contraint|pousse|met la pression)|m['’]oblige|oblige à signer/u,
  es:/me (?:obliga|fuerza|presiona)|obligad[oa] a firmar/u,
  de:/zwingt mich|zwingen mich|setzt mich unter druck|werde .*gezwungen/u,
  it:/mi (?:costringe|obbliga)|sono costrett[oa] a firmare/u,
  nl:/dwingt me|dwingt mij|ik word .*gedwongen|zet (?:me|mij) onder druk/u,
  da:/tvinger mig|presser mig|jeg bliver tvunget/u,sv:/tvingar mig|pressar mig|jag tvingas/u,nb:/tvinger meg|presser meg|jeg blir tvunget/u,
  fi:/pakottaa minu[at]|pakottavat minut|minua (?:pakotetaan|painostetaan)|painostaa minua/u,
  is:/neyðir mig|þvingar mig|þrýstir á mig/u,pt:/me (?:obriga|força|pressiona)|(?:obriga[rm]?|força[rm]?|pressiona[rm]?)-me/u,
  et:/sunnib mind|mind sunnitakse|survestab mind/u,cs:/mě nutí|nutí mě|mě nutí|nutí mne|mě donutil/u,
  pl:/zmusza mnie|zmuszają mnie|mnie zmusza|wywiera na mnie presję/u,hr:/me (?:tjera|prisiljava)|prisiljava me|tjera me/u,
  sk:/ma núti|núti ma|ma prinútil/u,mt:/iġegħelni|iġġegħelni|qed jisforzani|qed iġiegħelni|qed tagħmilli pressjoni/u,
  "zh-Hans":/逼(?:着)?我|强迫我|胁迫我|逼我签/u
};

const englishDisclosure = /\b(?:(?:i am|i['’]m|i was|i feel) (?:being |getting )?(?:coerced|forced|pressured|under pressure)|(?:forcing|pressuring|coercing|forced|coerced|pressured) me|(?:someone|they|he|she|my [\p{L}-]+) (?:is |are |keeps? )?making me|(?:this|it)(?:['’]s| is) not my choice|i (?:have no choice|can['’]t say no))\b/iu;
const negatedPressure = {
  en:/\b(?:no one|nobody|no[ -]one|not|never|(?:isn|aren|wasn|weren|doesn|don|hasn|haven|didn)'t)\s+(?:(?:is|was|has|being|ever|been|actually|really)\s+)*(?:forcing|forced|coerc\w*|pressur\w*|making me|under pressure)\b/u,
  fr:/personne ne (?:me (?:force|contraint|pousse)|m'oblige)|ne me (?:force|contraint|pousse) pas|ne m'oblige pas/u,es:/nadie me (?:obliga|fuerza|presiona)|no me (?:obliga|fuerza|presiona)/u,
  de:/niemand (?:zwingt|setzt) mich|zwingt mich nicht|werde nicht .*gezwungen/u,it:/nessuno mi (?:costringe|obbliga)|non mi (?:costringe|obbliga)/u,
  nl:/niemand (?:dwingt|zet)|(?:dwingt|zet) (?:me|mij) niet|niet gedwongen/u,da:/ingen (?:tvinger|presser) mig|tvinger mig ikke/u,
  sv:/ingen (?:tvingar|pressar) mig|tvingar mig inte/u,nb:/ingen (?:tvinger|presser) meg|tvinger meg ikke/u,
  fi:/kukaan ei (?:pakota|painosta)|minua ei (?:pakoteta|painosteta)/u,is:/enginn (?:neyðir|þvingar) mig/u,
  pt:/ninguém (?:me (?:obriga|força|pressiona)|está a (?:obrigar|forçar|pressionar))|não me (?:obriga|força|pressiona)/u,et:/keegi ei sunni|mind ei sunnita/u,cs:/nikdo mě nenutí|nikdo mě (?:nenutil|netlačí)/u,
  pl:/nikt (?:mnie nie|nie) zmusza|nie zmusza mnie/u,hr:/nitko me ne (?:tjera|prisiljava)/u,sk:/nikto ma nenúti/u,
  mt:/ħadd (?:mhu qed |ma )(?:jġegħelni|jisforzani|jġiegħelni)/u,"zh-Hans":/没(?:有)?人(?:在)?(?:逼|强迫|胁迫)我|不是被迫/u
};
export function disclosesPressure(raw) {
  const lang=currentLanguage();
  const contrast={fr:"mais",es:"pero",de:"aber",it:"ma",nl:"maar",da:"men",sv:"men",nb:"men",fi:"mutta",is:"en",pt:"mas",et:"aga",cs:"ale",pl:"ale",hr:"ali",sk:"ale",mt:"iżda"};
  const parts=normalize(raw).split(/[.!?;。！？；]|\b(?:but|however)\b|但是|可是/u)
    .flatMap(part=>contrast[lang]?part.split(" "+contrast[lang]+" "):[part]);
  return parts.some(part=>{
    if(negatedPressure.en.test(part) || negatedPressure[lang]?.test(part))return false;
    if(/\b(?:phone|browser|app|computer|website|device) (?:is )?forcing me to (?:update|log in|reboot|sign in)|\b(?:saying|alleging|claiming) (?:that )?i was forced\b/u.test(part))return false;
    if(englishDisclosure.test(part) || /\b(?:my [\p{L}-]+|he|she|they) (?:forces?|coerces?|pressures?) me\b/u.test(part))return true;
    return lang!=="en" && (personalPressure[lang]?.test(part) || lexicon().pressure.some(t=>includesTerm(part,t)));
  });
}
