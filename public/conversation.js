import { currentLanguage, display, sentence, sourceChoice, translatedList, wording } from "./locale.js";
// The conversation manager can suggest a next turn. Only explicit, validated answers
// advance the interview. This module never sends message text or saves a transcript.
import { questionWhileAnswering, topicsFor } from "./flow.js";
import {localControl, questionMark, questionSubjects} from "./help-language.js";
export { chooseLocalTopic } from "./flow.js";
import { giftIntents, itemOwnershipIssue, giftCurrency, item, cash, personal, noExtra, doneGifts } from "./extras.js";
import { businessWords, noBusiness, ownsBusiness } from "./business.js";
const norm = s => s.normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?]+$/,"").replace(/\s+/g," ");
const yes = /^(?:y|yes|yep|yup|yeah|correct|right|that(?:'s| is) (?:right|correct)|yes (?:please|i do|i can)|i (?:can|do)|si|oui)$/;
const no = /^(?:n|no|nope|nah|no thanks|not me|i (?:don't|do not|can't|cannot))$/;
const unsure = /^(?:(?:i(?:'m| am) )?(?:not (?:really )?sure|unsure|uncertain)|i (?:don't|do not) know|no or unsure|maybe|not certain)$/;
const confused = /\b(?:what (?:does (?:that|this|it) mean|do you mean)|what'?s that|say that (?:again|differently)|in plain (?:english|language)|(?:i(?:'m| am) )?(?:confused|lost)|don'?t (?:get|understand) (?:it|this|that)|explain (?:please|this|that|it)|simpler|give me an example|why (?:ask|are you asking))\b|^(?:huh|help|explain|what do you mean)$/;
const qualifications = /\b(?:but|except|unless|provided|only if|as long as|if|when|after|once|until|not|never|maybe|owe|financ(?:ed|ing)|loan|joint(?:ly)?|mortgage|lease|leased|owe|trust|minor|underage|pet|house|land|bank account|business|crypto)\b|n['’]t\b/i;
const propertyLead = /^(?:my|our|the|a|an)\s|\b(?:leave|give|gift|inherit|bequeath|pass on)\b/i;
const knownObjects = /\b(?:car|truck|van|motorbike|motorcycle|bike|bicycle|piano|camera|furniture|books?|artwork|sculpture|instrument|collect(?:ion|ibles?)|painting|ring|necklace|watch|guitar|violin|keepsake|cash|money|dollars?)\b/i;
export const termMeanings = [
  [/\bbeneficiar(?:y|ies)\b/i,"A beneficiary is a person or organization that gets something through your will."],
  [/\b(?:executor|liquidator|estate trustee)\b/i,"This is the person you choose to handle the paperwork, pay bills and carry out your will."],
  [/\b(?:residue|residuary|balance of (?:my|the) estate)\b/i,"It means what’s left of your money and property after bills, expenses and any separate gifts."],
  [/\b(?:dependant|dependent)s?\b/i,"Someone who relies on you for support, such as money, care or a place to live."],
  [/\b(?:witness|witnesses)\b/i,"A witness is someone who sees you sign and also signs to confirm it. Your kit says who can witness and how."],
  [/\b(?:guardian|guardianship)\b/i,"In the part about children, a guardian is the person you would like to look after them if one is needed."],
  [/\b(?:trustee|custodian)\b/i,"In the part about children, this is someone chosen to look after their money or property. They don’t have to be the child’s caregiver."],
  [/\b(?:domicile|permanent home)\b/i,"Your permanent home is the place you consider home long term, even when you’re away temporarily."],
  [/\b(?:intestacy|intestate)\b/i,"It means local law decides who inherits property your will doesn’t pass to someone."],
  [/\b(?:codicil)\b/i,"A codicil is a formal change to a will you’ve already made."],
  [/\b(?:notes|private notes)\b/i,"Notes are a file you can keep or share. They don’t give away property and don’t replace a will."],
];
const smallTalk = /^(?:hi|hey|hello)(?: there| again)?$|^(?:(?:i (?:need|want|could use)|can i (?:get|have)) (?:some |a little |more )?help|help(?: me)?(?: please| with this)?|(?:please |can you )?help me|what now|what next|next|continue|not today|not now|no thank you|never mind|nevermind|please continue|all good|makes sense|who knows|looks good|thank you(?: so much)?|thanks(?: very much| a lot)?)$/i;
const nameIntro=/^(?:my (?:full |legal )?name is|i (?:choose|nominate)|my (?:sister|brother|mother|father|partner|spouse|wife|husband|daughter|son)(?:['’]s name is| is))\s+(.+)$/iu;
const contexts = {amount:"gift",item:"gift",charity:"gift",notes:"notes",noteName:"notes",name:"people",names:"people",town:"location"};
export function contextOf(q) {return q.giftField || q.giftMenu ? "gift" : contexts[q.kind] || (q.id==="execution"?"signing":"choice");}
const binaryChoices={descendants:[0,1],caBond:[1,0],caExtras:[1,0],txSpecific:[1,0],txLiving:[0,1],txAdditional:[1,0],formNotes:[1,0],adviceOverride:[0,1]};
export function resolveTyped(card,q,input) {
  if(questionMark(input))return null;
  const s=norm(input), opts=card.options;
  const exact=sourceChoice(input,opts) || opts.find(o=>norm(o.label)===s);
  if (exact) return exact;
  if (q.id==="businessOwnership") {
    if (yes.test(s) || /^(?:yes,? )?i (?:own|have|run|co-own) (?:a|my own|part of a) (?:small |side )?(?:business|company)$/.test(s) || /^i(?:'m| am) (?:a freelancer|self[- ]employed|a sole (?:trader|proprietor))$/.test(s)) return opts.find(o=>o.value===ownsBusiness);
    if (no.test(s) || /^i (?:don't|do not) (?:have|own|run) a business$/.test(s)) return opts.find(o=>o.value===noBusiness);
    if (unsure.test(s)) return opts.find(o=>o.value==="I’m unsure");
  }
  if (card.yesPass!==undefined) {
    if (yes.test(s) || no.test(s)) return opts[(yes.test(s)===card.yesPass)?0:1];
    if (unsure.test(s)) return opts[2];
    // Several confirmations are statements, with positive buttons such as "Neither applies".
    if (/^(?:none|none of (?:these|them)|neither|neither applies)$/.test(s) && !card.yesPass) return opts[0];
    return null;
  }
  if(binaryChoices[q.id]) {
    const [y,n]=binaryChoices[q.id];
    if(yes.test(s) || no.test(s)) return opts[yes.test(s)?y:n];
    if(q.id==="descendants" && unsure.test(s)) return opts[2];
  }
  if(q.giftField==="extraFit") {
    if(yes.test(s)) return opts[0];
    if(no.test(s) || unsure.test(s)) return opts[1];
  }
  if(q.giftMenu && /^(?:no|nope|none|nothing|nothing else|no more(?: gifts)?|no thanks|(?:i(?:'m| am) )?(?:done|finished)|that['’]?s (?:all|it)|all done)$/.test(s))
    return opts.find(o=>[doneGifts,noExtra].includes(o.value));
  if(q.optional && /^(?:skip|skip it|none|leave (?:it )?(?:blank|open))$/.test(s)) return opts.find(o=>o.value==="Leave open");
  if(q.id==="execution") {
    if(/^(?:print|printed|print it|on paper|with witnesses)$/.test(s)) return opts[0];
    if(/^(?:by hand|handwritten|handwrite it|write by hand)$/.test(s)) return opts[1];
  }
  if(q.id==="household"){
    const value=/^(?:(?:my )?(?:children|kids)(?: first)?|just (?:my )?(?:children|kids))$/.test(s)?"Children first":
      /^(?:(?:my )?(?:spouse|partner)(?: first)?,? then (?:my |our )?(?:children|kids))$/.test(s)?"Partner, then children":
      /^(?:one (?:person|adult)|just one adult)$/.test(s)?"One adult beneficiary":null;
    return opts.find(o=>o.value===value);
  }
  return null;
}
export function manageTurn(input,q,card,place) {
  const command=localControl(input), marked=questionMark(input), asking=questionWhileAnswering(input,q.kind);
  const context=contextOf(q);
  const helpTurn=()=>({type:"help",topics:topicsFor(input),context});
  // A note can be a literal question or command. Only its author may choose to save it.
  if(q.kind==="notes") {
    if(asking || command || confused.test(norm(input)) || smallTalk.test(norm(input)) || /^(?:start over|go back|restart)$/i.test(input.trim()))
      return {...helpTurn(),type:"noteOrHelp"};
    return {type:"field",value:input};
  }
  if(marked && (command || sourceChoice(input.replace(/[?？¿]/gu,""),card.options) || resolveTyped(card,q,input.replace(/[?？¿]/gu,""))))return {type:"clarify"};
  const localized=!marked && sourceChoice(input,card.options);
  if(localized)return {type:"answer",value:localized.value,label:localized.label};
  if(command && !marked)input=command;
  if(currentLanguage()!=="en" && q.giftMenu) {
    const items=["My car","My ring","Give an item"], amounts=["Money","Give money","A cash gift"];
    if(items.some(k=>norm(display(k))===norm(input)) && card.options.some(o=>o.value===item)) return {type:"gift",value:item,cue:norm(display("My car"))===norm(input)?"vehicle":""};
    if(amounts.some(k=>norm(display(k))===norm(input)) && card.options.some(o=>o.value===cash)) return {type:"gift",value:cash};
  }
  const s=norm(input), selected=resolveTyped(card,q,input);
  if(!asking && (q.kind==="name" || q.kind==="noteName")) {
    const intro=nameIntro.exec(input.trim());
    if(intro && !smallTalk.test(norm(intro[1])) && !yes.test(norm(intro[1])) && !no.test(norm(intro[1]))) return {type:"field",value:intro[1]};
    if(intro) return {type:"clarify"};
  }
  if(!asking && /^(?:(?:i['’]?d like to|i want to|let['’]?s) )?(?:start (?:over|again)|restart(?: the chat)?|clear (?:my|the) (?:answers|chat))$/.test(s)) return {type:"reset"};
  if(!asking && /^(?:please )?(?:go back|change (?:my |the )?(?:last|previous) answer)$/.test(s)) return {type:"back"};
  if(asking && /\b(?:go back|start over|restart|change my last answer)\b/i.test(s))return {type:"guide",text:"You can change any answer on the review screen."};
  if(/^(?:i (?:need|want|would like) (?:a|to (?:make|write) (?:a|my)) will|(?:i['’]d like to|help me) (?:make|write) (?:a|my) will|let['’]?s (?:start|begin))$/.test(s))
    return {type:"guide",text:sentence("You’re in the right place. {0}", wording(card.title))};
  if(/^(?:thank(?:s| you)|got it|that makes sense|okay|ok)$/.test(s)) return {type:"guide",text:sentence("Here’s the next thing I need from you: {0}", wording(card.title))};
  if(q.id==="businessOwnership" && selected) return {type:"answer",value:selected.value,label:selected.label};
  if(card.yesPass===undefined && unsure.test(s) && !["notes","noteName"].includes(q.kind)) return {type:"guide",text:q.optional?"You can skip this one and come back to it on the review screen.":q.giftMenu?"You don’t have to add a gift right now. You can add one on the review screen if you decide later.":sentence("You can leave this tab open while you check. {0}", wording(currentHelp(q,card)))};
  if(selected) return {type:"answer",value:selected.value,label:selected.label};
  if(smallTalk.test(s) || (["name","names","noteName","town","item","charity","amount"].includes(q.kind) && (yes.test(s) || no.test(s) || s==="no thanks"))) {
    if(q.optional && /^(?:no|nope|no thanks|no thank you)$/.test(s)) return {type:"answer",value:"Leave open"};
    return {type:"guide",text:currentHelp(q,card)};
  }
  const wantsHelp = confused.test(s) || asking;
  if(wantsHelp && businessWords.test(s) && ["businessTransfer","businessWishes"].includes(q.id))return {type:"guide",text:card.tip};
  const intents=giftIntents(input);
  if(/^(?:(?:what(?:'s| is| does)|what do you mean by|(?:can you |please )?explain|define|meaning of)\s+(?:(?:an?|the) )?(?:beneficiar(?:y|ies)|executor|liquidator|estate trustee|residu(?:e|ary)|depend[ae]nt|witness(?:es)?|guardian(?:ship)?|trustee|custodian|domicile|permanent home|intesta(?:cy|te)|codicil|(?:private )?notes)(?: mean)?)(?: and (?:an? )?(?:guardian|trustee|executor|beneficiary))?$/.test(s)) {
    const defs=termMeanings.filter(([r])=>r.test(s)).map(([,value])=>value);
    if(defs.length) return {type:"guide",text:translatedList(defs.slice(0,2)," ")};
  }
  if(confused.test(s)) return {type:"clarify"};
  if(q.giftMenu && /^(?:what about|can i (?:give|leave))\b/i.test(s) && intents.length) {
    if(questionSubjects(input).has("personal") || /\b(?:charit\w*|tax\w*)\b/u.test(s))return helpTurn();
    if(qualifications.test(s) || questionSubjects(input).has("guardian") || /\b(?:child|kid|teen|baby|year[- ]old|year[- ]olds|years? old)\b/i.test(s)) return {type:"guide",text:"That detail could change the gift. I haven’t added anything. You can describe the arrangement using “Something different”."};
    const available=intents.every(t=>q.values.includes(t));
    return {type:"guide",text:available?sentence("Yes, you can start that kind of gift here. Choose “{0} when you’re ready. I’ll ask for the details and who gets it.", wording(intents[0]===item?"Give an item":"Give money")):"This form can’t make that kind of gift here. You can save your request using “Something different”."};
  }
  if(wantsHelp)return helpTurn();
  if(/\b(?:i (?:don['’]t|do not) (?:want|need)|skip (?:this|it)|not now)\b/i.test(s) && q.giftMenu && !/\b(?:but|instead|also|and)\b/.test(s)) {
    return {type:"guide",text:sentence("To move on without adding a gift, choose “{0}.”", wording(q.id==="extra"?"Nothing else":"I’m done"))};
  }
  if(q.giftMenu) {
    if(/\b(?:actually|instead|forget|ignore|not|never|no longer)\b|n['’]t\b/i.test(s) && intents.length)
      return {type:"guide",text:"I haven’t added or removed a gift. Pick the one item or amount you do want to add, or say “done”."};
    if((qualifications.test(s) || itemOwnershipIssue(s)) && (intents.length || propertyLead.test(s))) return {type:"guide",text:"I haven’t added a gift. A condition, a loan or shared ownership can change what happens. Use “Something different” to describe it, or choose one item or cash gift that fits this form."};
    if(intents.length>1) return {type:"guide",text:"You can add both. Start with one item or one amount of money. After you name who gets it, I’ll ask “Anything else?”."};
    if(intents.length===1) {
      if(card.options.some(o=>o.value===intents[0])) return {type:"gift",value:intents[0],cue:intents[0]===item&&/\b(?:car|truck|van|vehicle)\b/i.test(s)?"vehicle":intents[0]===item?"item":"money"};
      return {type:"guide",text:"This form can’t add that kind of gift here. “Something different” lets you save the request as notes. It won’t put the gift in a will."};
    }
    if(/^(?:(?:leave|add|write) (?:a |some )?)?(?:personal )?(?:notes?|messages?)$/.test(s) && q.values.includes(personal)) return {type:"answer",value:personal};
    if(/(?:my |a |an |the )\S/.test(s) && !qualifications.test(s) && q.values.includes(item))
      return {type:"guide",text:"Do you mean a physical item you own? Choose “Give an item” and I’ll ask what it is and who should get it."};
  }
  if(!q.giftField && !q.giftMenu && !["notes","noteName"].includes(q.kind) && intents.length && (propertyLead.test(s) || knownObjects.test(s) && !/\s/.test(s))) {
    return {type:"later",cue:intents.length===1?intents[0]:"several",text:"We’ll get to gifts in a separate step. I haven’t added a gift or changed this answer."};
  }
  if(card.yesPass!==undefined) return {type:"clarify"};
  if(q.giftField==="extraRecipient" && q.kind==="name" && /^(?:my|our)\s+(?:older |younger |only )?(?:sister|brother|son|daughter|mum|mom|mother|dad|father|partner|husband|wife|friend|aunt|uncle|cousin)\.?$/i.test(input.trim()))
    return {type:"guide",text:sentence("What’s {0}’s full name? That’s the name I’ll put beside this gift.", input.trim().replace(/^(?:my|our) /i,"your ").replace(/\.$/,""))};
  if(["name","names","town"].includes(q.kind) && /^(?:my|our)\b/i.test(s)) {
    return {type:"guide",text:q.kind==="town"?"Just type the name of the town or city where you live.":"Use the full name you want printed. For example, instead of “my brother”, type his full name."};
  }
  if(q.giftField==="extraItem" && /^(?:(?:my|our|the|a|an) )?(?:car|truck|van|vehicle|ring|watch|guitar|bike|bicycle)$/i.test(s))
    return {type:"guide",text:/car|truck|van|vehicle/.test(s)?"Which one? Add a detail such as the year, make and model. For example, “my blue 2018 Honda Civic”.":"Add a detail someone could recognize, like “my gold ring engraved June 1984”."};
  if(q.kind==="amount") {
    // Only remove a matching currency mark. Never translate currencies or infer an amount.
    const currency=giftCurrency(place), sign={CAD:"$",USD:"$",AUD:"$",NZD:"$",GBP:"£",EUR:"€",SGD:"$"}[currency];
    let amount=input.trim();
    if(sign && amount.startsWith(sign)) amount=amount.slice(1).trim();
    amount=amount.replace(new RegExp("^"+currency+"\\s+|\\s+"+currency+"$","ig"),"");
    if(/^(?:[1-9]\d{0,5}|[1-9]\d{0,2},\d{3})$/.test(amount)) return {type:"answer",value:amount};
  }
  return {type:"field",value:input};
}
export function currentHelp(q,card) {
  if(card.tip) return card.tip;
  if(q.id==="eligible") return "Answer for yourself. If a statement doesn’t fit, I’ll show you what to do next without putting anything in a will.";
  if(q.giftField==="extraFit" && /own.*outright/.test(card.title)) return "For example, a car you’ve finished paying for and own by yourself fits this step. A leased car, one you share ownership of, or one with a loan doesn’t.";
  if(q.giftMenu) return "A gift says exactly what goes to whom. A message leaves instructions or memories for your family, without changing who inherits.";
  if(q.giftField==="extraFit") return "This is what would happen to this gift. Pick “Yes, that works” only if that’s what you want. Otherwise choose different instructions.";
  if(q.giftField==="extraRecipient") return q.kind==="charity"?"Use the name on the charity’s official registration.":"For example, type the person’s name, such as “Jordan Chen”, instead of just “my sister”.";
  if(q.kind==="town") return "The town where you normally live is enough. You don’t need to give a street address.";
  if(q.kind==="noteName") return "Use the name you’d like on your notes. It doesn’t have to be a full legal name.";
  if(q.id==="alsoKnown") return "Type the other name you use. If you don’t use another name, choose “Skip this”.";
  if(q.kind==="name" || q.kind==="names") return sentence("Use the full name a person uses on official papers.{0}", wording(q.optional?" If you don’t want to name anyone here, choose “Skip this”.":""));
  if(q.kind==="amount") return "For five hundred, type 500. I’ll ask who should get the money next.";
  if(card.lines.length) return translatedList(card.lines," ");
  if(q.giftField==="extraAfter") return "You can add another gift now. When you’ve listed everything, choose “I’m done”.";
  return card.options.length?sentence("This step asks: {0} The choices are {1}.", wording(card.title), wording(translatedList(card.options.map(o=>o.label)," / "))):sentence("This step asks: {0}", wording(card.title));
}
export function responseHint(q,card) {
  if(q.giftMenu) return "Try “my car” or “money” if that choice is available. To move on without adding anything, type “done”.";
  if(q.giftField==="extraFit") return "Does this match how you want the gift to work? You can say yes, ask about it, or choose different instructions.";
  if(card.yesPass!==undefined) return "You can answer yes, no or “I’m not sure”.";
  if(card.options.length) return sentence("Which is closest: {0}?", wording(translatedList(card.options.map(o=>o.label)," / ")));
  return currentHelp(q,card);
}
