import { currentLanguage, sentence, wholeNumber, wording } from "./locale.js";
import {organizationEntries, planningReview, skipped} from "./planning.js";
import {survivalHelp} from "./survival.js";
// Supported gifts use the jurisdiction’s currency and distinguish an heir’s duty from an outright disposition.
// Free text about care or family wishes is always a separate file, never a will clause.
export const doneGifts = "I’m done";
export const differentTerms = "I need different terms";
export const keepForAdvice = "Keep it for local advice";
export const cancelAdvice = "Keep my recorded choices";
export const correctCash = "Change this gift";
export const confirmCash = (currency,total) => sentence("Yes, {0} {1} in total", currency, wholeNumber(total));
export const combinedGiftHint = "Confirm only if these entries are for the same recipient and the name shown here is the name to use for their combined cash gift.";
export const giftEntryLimit = "You have reached the interview limit for gift entries on this form.";
export const noExtra = "Nothing else";
export const personal = "Add personal notes";
export const bespoke = "I need another gift or different terms";
export const item = "Give a particular keepsake";
export const cash = "Give a fixed sum of money";
export const finishNotes = "Continue to review";
export const finishForm = "Finish other permitted gifts in the court PDF";
export const adviceOption = "Something for local advice";
const ordinary = "These are practical wishes only";
export function supportsGifts(p) {
  return !["fixed","planning","professional","deposit"].includes(p.route) && !["CA-QC","US-LA","GB-SCT","SK"].includes(p.key);
}
const topics = {
  "Pet care": "Who has agreed to look after your pet, who is the backup, and what should they know on day one? This note does not transfer the pet or set aside money.",
  "Funeral or memorial": "What would you like people to know about a funeral, memorial or existing arrangement? Tell someone now, so they can find it in time.",
  "Digital belongings": "Which photos, files or services should someone know about, and where can they find your separate inventory? Use each service’s legacy settings. Leave out logins, PINs, passwords and recovery phrases.",
  "A message or another wish": "What else would you like people to know? This is a personal message. Choose a gift or local advice if you want to change who inherits.",
};
const choice = (id, label, prompt, values) => ({ id, label, prompt, values });
const field = (id, label, prompt, kind) => ({ id, label, prompt, kind, values: [] });
export const giftCurrency = p => ({US:"USD",CA:"CAD",GB:"GBP",IE:"EUR",NL:"EUR",MT:"EUR",PT:"EUR",SK:"EUR",AT:"EUR",BE:"EUR",DE:"EUR",EE:"EUR",FI:"EUR",HR:"EUR",LU:"EUR",CH:"CHF",CZ:"CZK",DK:"DKK",IS:"ISK",NO:"NOK",PL:"PLN",SE:"SEK",AU:"AUD",NZ:"NZD",SG:"SGD"})[p.country];
const isGift = value => value === item || value === cash;
export const giftLimit = p => p.key === "US-CA" ? 5 : p.key === "US-TX" ? 8 : Infinity;
// Keep the original first-gift keys. For later gifts, the previous “anything else?” is the type choice.
export const giftKey = (stem, n) => n === 1 ? stem : stem + n;
// A notes or court-form choice can occur between gifts. Its own return menu keeps earlier notes
// and gifts intact when the maker adds another gift on the review screen.
function* itinerary(a) {
  let slot="extra", n=1, notes=false, court=false;
  for (;;) {
    const value=a[slot];
    const stop={slot,n,value,notes,court};
    if (value===personal && !notes) {
      yield {...stop,kind:"notes"}; notes=true; slot="afterPersonal";
    } else if (value===finishForm && !court) {
      yield {...stop,kind:"court"}; court=true; notes ||= a.formNotes===personal; slot="afterCourt";
    } else if (isGift(value)) {
      yield {...stop,kind:"gift"}; slot=giftKey("extraAfter",n++);
    } else { yield {...stop,kind:"end"}; return; }
  }
}
const giftAt = (a,step) => ({ n:step.n, type:step.value, start:step.slot,
  description:a[giftKey("extraItem",step.n)], amount:a[giftKey("extraAmount",step.n)],
  recipient:a[giftKey("extraRecipient",step.n)], who:a[giftKey("extraWho",step.n)],
  confirmedTotal:a[giftKey("extraTotal",step.n)] });
export function ordinaryGifts(a) {
  const gifts=[];
  for (const step of itinerary(a)) if (step.kind==="gift") {
    const g=giftAt(a,step);
    if (g.recipient && g.recipient!==skipped && ![undefined,skipped].includes(g.type===item ? g.description : g.amount)) gifts.push(g);
  }
  return gifts;
}
export function giftList(a) {
  const first=ordinaryGifts(a);
  return [...first,...organizationEntries(a).filter(g=>g.recipient && g.recipient!==skipped && ![undefined,skipped].includes(g.amount || g.description)).map(g=>({...g,n:first.length+g.n,organization:true,type:g.kind==="item"?item:cash,confirmedTotal:a["orgTotal"+g.n]}))];
}
const cashRecipientKey = gift => (gift.organization || gift.who === "A charity" ? "charity|" : "person|") + giftIdentity(gift.recipient);

// The receipt keeps the individual entries. A will uses the total and name the visitor confirmed.
export function instrumentGifts(p, answers) {
  const result = [];
  const cashByRecipient = new Map();
  const currency = giftCurrency(p);
  for (const gift of giftList(answers)) {
    const row = {...gift, n: result.length + 1};
    if (gift.type === cash) {
      const key = cashRecipientKey(gift);
      const previous = cashByRecipient.get(key);
      if (previous) {
        const total = Number(previous.amount) + Number(gift.amount);
        if (gift.confirmedTotal === confirmCash(currency,total)) {
          previous.amount = String(total);
          previous.recipient = gift.recipient;
          continue;
        }
      }
      cashByRecipient.set(key,row);
    }
    result.push(row);
  }
  return result;
}
export function courtDeferred(a) {
  for (const step of itinerary(a)) if (step.kind==="court") return true;
  return false;
}
export function needsAdvice(a) {
  if (a.adviceOverride===keepForAdvice || a.noteCheck===bespoke) return true;
  for (const step of itinerary(a)) {
    if ([adviceOption,bespoke,differentTerms].includes(step.value)) return true;
    if (step.kind==="gift" && [bespoke,differentTerms].includes(a[giftKey("extraFit",step.n)])) return true;
  }
  return false;
}
export const giftIdentity = v => (v || "").normalize("NFKC").toLocaleLowerCase("en").replace(/[’']/gu,"").replace(/[^\p{L}\p{M}\p{N}]+/gu," ").trim();
export const itemIdentity = v => giftIdentity(v).replace(/^(?:(?:my|the|a|an) )+/u,"");
// Identify only the kind of gift in ordinary conversation. Never infer a binding amount, recipient or description.
// An outright item gift cannot contradict its own ownership confirmation.
export function itemOwnershipIssue(text) {
  return /\b(?:leased|lease|leasing|financed|financing|rented|rental|lien|mortgaged|encumbered|loan|owing|owe|co[ -]?owned|joint(?:ly)?[ -]owned|shared ownership|not (?:mine|solely mine)|(?:do not|don['’]t|only partly|partially) own|own (?:together|jointly|with)|belongs to (?:my|our|another|someone)|owned by (?:my|our|someone))\b/i.test(text);
}
export function giftIntents(v) {
  const types=[];
  if (/\b(?:car|truck|van|vehicle|motorbike|motorcycle|bike|bicycle|piano|camera|furniture|books?|artwork|sculpture|collectibles?|keepsake|heirloom|ring|necklace|watch|guitar|violin|brooch|bracelet|painting|earrings?|jewell?ery|clock)\b/i.test(v)) types.push(item);
  if (/\b(?:cash|money|dollars?|pounds?|euros?|cad|usd|gbp|eur)\b|[$£€]\s*\d/i.test(v)) types.push(cash);
  return types;
}
export const giftText = (p,g) => g.type === item ? g.description : giftCurrency(p)+" "+Number(g.amount).toLocaleString(currentLanguage());
export function wishesProfile(p, a, issues={}) {
  return (needsAdvice(a) || Object.keys(issues).length || planningReview(p,a,ordinaryGifts(a).length)) && !["planning","professional"].includes(p.route)
    ? { ...p, route: "planning", use: "planning" } : p;
}
export function notesEntries(a) {
  return Object.keys(topics).flatMap(t => {
    const i = [1,2,3,4].find(n => a["noteTopic"+n] === t && a["noteText"+n] && a["noteText"+n]!==skipped);
    return i ? [[t, a["noteText"+i]]] : [];
  });
}
function appendNotes(list,a) {
    const left = Object.keys(topics);
    for (let i=1; i<=Object.keys(topics).length; i++) {
      const id="noteTopic"+i;
      list.push(choice(id, i===1?"Personal notes":"Another personal note", i===1?"What would you like to leave a note about? You can pick more than one, one at a time.":"Want to add another kind of note?",[...left, finishNotes]));
      if (!left.includes(a[id])) break;
      list.push(field("noteText"+i,sentence("Note: {0}", wording(a[id])),topics[a[id]],"notes"));
      left.splice(left.indexOf(a[id]),1);
      if (!left.length) break;
    }
    if (notesEntries(a).length)
      list.push(choice("noteCheck","Purpose of your notes","Did you put a gift or a condition in these notes that you expect your will to carry out? Notes do not make gifts or change who inherits. If something is missing, we’ll make a planning kit so you can resolve it before signing.",[ordinary,bespoke]));
}
export function extraQuestions(p, a) {
  const notesRoute = ["professional", "planning"].includes(p.route);
  const supported = !notesRoute && supportsGifts(p);
  const ca = p.key === "US-CA";
  const choices = [noExtra, ...(supported ? [...(ca ? [] : [item]), cash] : []), personal, adviceOption];
  const guide = notesRoute ? "This kit records plans, including gifts you want to discuss locally."
    : supported ? (ca ? "You can name people or charities for cash gifts, one gift at a time." : "You can give keepsakes or money to named adults, one gift at a time.")
    : "This template does not make separate gifts. Choose local advice if you need one.";
  const list = [{...choice("extra","Anything else?", sentence("Anything else you want to make room for? Think of a ring, a charity, your pet, memorial plans or family photos. {0} Personal notes stay separate from the will.", guide), choices),giftMenu:true}];
  if (!a.extra || a.extra === noExtra) return list;
  const currency=giftCurrency(p), limit=giftLimit(p);
  const totals=new Map();
  const menu=(n,notes,court)=>[doneGifts,...(n<=limit ? [...(ca ? [] : [item]),cash] : []),...(!notes ? [personal] : []),...(p.route==="official" && !court ? [finishForm] : []),adviceOption];
  for (const step of itinerary(a)) {
    if (step.kind==="end") break;
    const { n,slot }=step;
    if (step.kind==="notes" || step.kind==="court") {
      if (step.kind==="court" && !step.notes)
        list.push(choice("formNotes","Notes alongside the court form","You can complete other available sections in your court PDF. Would you also like separate practical notes for your family?", [finishNotes, personal]));
      const notes=step.notes || step.kind==="notes" || a.formNotes===personal;
      const court=step.court || step.kind==="court";
      if (!step.notes && notes) appendNotes(list,a);
      if (a.noteCheck===bespoke || !supported) break;
      const id=step.kind==="notes" ? "afterPersonal" : "afterCourt";
      const prompt=n>limit ? giftEntryLimit : sentence("Anything else? Your earlier gifts are on the list.{0}", "");
      list.push({...choice(id,"Anything else?",prompt,menu(n,notes,court)),giftMenu:true});
      continue;
    }
    if (!supported || n>limit) break;
    const g=giftAt(a,step);
    const add=(stem,q) => list.push({ ...q, id:giftKey(stem,n), label:sentence("Gift {0} · {1}", n, wording(q.label)), giftNumber:n, giftStart:slot, giftField:stem, giftMenu:stem==="extraAfter" });
    const opt=(stem,label,prompt,values) => add(stem,choice("",label,prompt,values));
    const input=(stem,label,prompt,kind) => add(stem,field("",label,prompt,kind));
    const fit = p.civil ? (sentence("Do you want your heir to {0} to one independent adult, only if they survive you? If they die first, nobody takes this gift in their place and it remains with the rest of the estate. All these gifts together must leave most of the estate for the heir after debts.{1}{2}{3}", wording(g.type===item ? "deliver one specific, solely owned, unencumbered keepsake, with no replacement if it is no longer yours" : "pay a fixed estate gift in " + currency), wording(p.country==="CZ" ? " An heir may claim reduction to keep a quarter of their inheritance free of legacies." : ""), wording(p.country==="NO" ? " This chooses a different outcome from Norway’s usual substitution of the recipient’s descendants." : ""), wording(p.country==="PL" ? " This is a direction to your heir to perform the gift; ownership does not pass automatically to the recipient." : "")))
      : p.key === "US-TX"
      ? sentence("Is this {0} for one adult under the Texas form’s section 3.3? Its survival rule requires the recipient to be living 30 days after your death. The printed form governs if the gift cannot take effect. For a condition, a different survival period or a different fallback, choose local advice.", wording(g.type === item ? "one physical keepsake you own outright" : "one fixed amount in US dollars"))
      : g.type === item
        ? "Is this one physical keepsake you own outright, free of any loan or security interest, for one adult who survives you? If you no longer own it at death, there is no replacement gift except any proceeds protected by law. If they die first, the item follows the rest of your estate. For joint property, a pet, land or different terms, choose local advice."
        : ca ? "Is this one fixed US-dollar gift to one adult or one charity on the California form’s terms? An individual generally must live at least 120 hours (five days) after your death. For a charity, verify its full legal name. You will sign the box beside each gift."
        : sentence("Is this a fixed cash gift in {0} for one adult who survives you? Cash gifts are paid before the residue and may be reduced if the estate is short. If they die first, the gift follows the residue. For a charity, conditions or another arrangement, choose local advice.", currency);
    opt("extraFit","Terms",fit + (p.route==="official" ? "" : " " + survivalHelp(p)) + (p.country==="GB" && ["Partner, then children","Children first"].includes(a.household) ? " Even if this recipient is your child, the recipient’s descendants will not take this separate gift if the recipient dies before you." : ""),["Yes, that fits",differentTerms]);
    if ([bespoke,differentTerms].includes(a[giftKey("extraFit",n)])) break;
    if (g.type===item) input("extraItem","Keepsake","Which item? Give a short, identifying description, for example “gold wedding ring engraved June 1984”. Each keepsake should be distinguishable from the others.","item");
    else input("extraAmount",sentence("Cash ({0})", currency),sentence("How much in {0} for this gift? Enter a whole amount from 1 to 999,999, for example 500.", currency),"amount");
    if (ca) opt("extraWho","Recipient type","Who should receive this cash gift?",["An adult","A charity"]);
    input("extraRecipient","Recipient",ca && g.who==="A charity" ? "Enter the charity’s full registered name exactly as you verified it." : "What is the full legal name of the adult receiving this gift? A relationship like “my sister” alone is not enough.",ca && g.who==="A charity" ? "charity":"name");
    if (g.type===cash && g.recipient && g.amount) {
      const key=cashRecipientKey(g);
      const earlier=totals.get(key) || 0, total=earlier+Number(g.amount);
      if (earlier) opt("extraTotal","Combined cash gifts",sentence("{0} already has a cash gift. Together these entries give them {1} {2}. Is that the total you intend?", g.recipient, currency, wholeNumber(total)),[confirmCash(currency,total),correctCash]);
      totals.set(key,total);
    }
    const full=n===limit;
    const summary=g.recipient && (g.description || g.amount) ? sentence("Gift {0}: {1} → {2}. ", n, giftText(p,g), g.recipient) : "";
    let prompt=sentence("{0}Anything else?", wording(summary));
    if (full) prompt=giftEntryLimit;
    else prompt+=" Add another gift or choose “I’m done”.";
    opt("extraAfter","Anything else?",prompt,menu(n+1,step.notes,step.court));
  }
  if (a.adviceOverride===keepForAdvice && !list.some(q=>q.id==="extraRequest")) {
    list.push(choice("adviceOverride","Earlier choices and a change for advice","Keep the earlier choices as context for a local professional? The change below is unresolved. This kit will have no will to sign.",[keepForAdvice,cancelAdvice]));
    list.push(field("adviceFor","Earlier choice to revisit","Which earlier choice needs to change? Name the gift or other entry so the reviewer can compare it with your request.","notes"));
  }
  if (needsAdvice(a)) list.push(field("extraRequest","For local advice","What gift, condition or instruction do you want to discuss? This download will be a planning or appointment kit, with your answers and this request. It won’t include a will to sign. Do not enter passwords or account details.","notes"));
  return list;
}
