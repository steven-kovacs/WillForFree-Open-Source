// These choices are also available alongside unchanged publisher forms. Only the
// explicitly supported transfers below may enter an instrument. Other details stay local.
import {display, sentence, wording} from './locale.js';
export const deferred = 'For professional review';
export const skipped = 'Review this question'; // Internal answer marker; never substitutes for consent or a name.
export const goOn = 'Continue anyway';
export const reviewDetail = 'Add a note to your kit (optional)';
export const skipEffect = 'Continuing leaves this question unanswered. You’ll receive planning notes without a will to sign.';
export const noteAction = 'Leave a note for a professional';
export const notePrivacy = 'Your note stays in your kit. You choose whether to share it with a professional.';
export const noteEffect = 'Save your note, then answer this question. Your answers determine which documents are included in your kit.';
export const saveNote = 'Save note and return to question';
export const warning = 'Do not sign or use this kit as a will until a qualified local estates professional has reviewed it with you.';
export const previousAdvice = 'Keep your existing will and any signed changes safe. This interview does not change them. Signing a new will could cancel earlier instructions, including ones made abroad. Have the documents checked together before signing.';
export const petAdvice = 'Ask the people you name if they can help. Share the care plan now so someone can act right away.';
export const funeralAdvice = 'Share this preference now with the person likely to arrange your funeral. This sheet is not a formal direction; check locally if you want it to be binding.';
export const orgAdvice = 'Check the exact legal name and that the organization can accept this gift for its general purposes.';
export const forReview = 'This gift will be recorded for professional review. It will not be made by this form.';
export const orgEffect = 'If the organization cannot receive the gift, it stays with the rest of your estate, subject to local law.';
export const alaskaOrganizationGift = 'Any part of this gift that the organization cannot receive or validly refuses falls into the residue of my estate, subject to applicable law. The organization keeps any part it accepts and is entitled to receive.';
export const orgTitle = 'Gifts to organizations';
export const orgItem = 'Give an item', orgCash = 'Give money';
export const practical = 'Care plan only', transfer = 'Transfer ownership of all my pets', customPet = 'I want another arrangement';
export const petTerms = 'This gives all pets you own outright at death to your first carer, or your backup if the first cannot take them. No money is set aside. If neither takes them, the pets stay in your estate.';
export const petReview = 'A transfer or funds for care need professional review with this form. Your care plan will still be in your kit.';
export const priorPrompt = 'Have you already made a will or signed a change to one?';
export const priorExamples = 'Include handwritten wills and wills made in another country.';
export const blankAdvice = 'Your planning answers stay separate from the blank form. They do not fill in or change it.';
export const orgGiftHelp = 'You can record gifts of money or items to organizations. The interview tells you whether the gift goes in this will or needs professional review.';
export const orgName = 'What is the organization’s full legal name?';
export const orgFit = 'Have you checked the recipient and do these terms match your wishes?';
export const orgTerms = 'The gift is an unrestricted, fixed sum or one item you own outright. If the item is no longer yours, there is no replacement except as required by law.';
export const maineCharity = 'On the blank Maine form, enter each charity’s name and amount in section 2.3 and sign its line. No gift is made if you do not sign or if the charity no longer exists or declines the gift.';
const q = (id,label,prompt,values=[],rest={}) => ({id,label,prompt,values,planStep:true,...rest});
const field = (id,label,prompt,kind,optional=false) => q(id,label,prompt,optional?['Leave open']:[],{kind,optional});
const skip = 'Leave open';
const hasCareAnswer = value => Boolean(value && ![skip,skipped,deferred].includes(value));
// An annotation belongs to one card and cannot stand in for an interview answer.
export function setReviewNote(state,id,part,question,text) {
  const notes=(state.reviewNotes || []).filter(note=>note.id!==id || note.part!==part);
  if(text){
    const caption=display(question);
    notes.push({id,part,question,...(caption!==question?{caption}:{}),text});
  }
  if(notes.length)state.reviewNotes=notes;
  else delete state.reviewNotes;
}
export function earlierQuestions(a) {
  return [q('priorWill','An earlier will',priorPrompt,['No','Yes','I’m not sure'],{lines:[priorExamples]}),
    ...(hasPrior(a)?[q('priorContinue','An earlier will','Would you like to continue?', [goOn,'Back to this question'],{lines:[previousAdvice]})]:[])];
}
export const hasPrior = a => ['Yes','I’m not sure'].includes(a.priorWill);
export function canTransferPets(p) {
  return ['paper','handwriting'].includes(p.route) && ['CA','AU','NZ','GB'].includes(p.country) && p.key!=='GB-SCT';
}
export function careQuestions(p,a) {
  const list=[q('pets','Pet care','Would you like to make a plan for your pets?',['No','Yes'])];
  if(a.pets==='Yes') {
    list.push(field('petNames','Pet care','Which pets should people look after?','notes'),
      field('petCarer','First choice for pet care','Who would you like to take your pets?','name',true),
      field('petBackup','Backup for pet care','Who could take them if your first choice cannot?','name',true),
      field('petCare','Care instructions','What will your pets need on the first day?','notes',true),
      q('petPlan','Pet care','What should the kit do for your pets?', [practical,transfer,customPet],{lines:[petAdvice,canTransferPets(p) && hasCareAnswer(a.petCarer) ? petTerms : petReview]}));
    if(a.petPlan===customPet)list.push(field('petRequest','For local advice','What arrangement would you like for your pets?','notes'));
  }
  list.push(q('funeral','Funeral or memorial','Do you have a preference for your funeral or remains?', ['No preference','Burial','Cremation','Other arrangements'],{lines:[funeralAdvice]}));
  if(['Burial','Cremation','Other arrangements'].includes(a.funeral))list.push(field('funeralDetails','Funeral or memorial','What should people know about your wishes or any arrangements already made?','notes',true));
  return list;
}
export function careEntries(a) {
  const entries=[];
  const add=(label,value,preset=false)=>{if(hasCareAnswer(value))entries.push([label,value,preset]);};
  if(a.pets==='Yes'){add('Pet care',a.petNames);add('First choice for pet care',a.petCarer);add('Backup for pet care',a.petBackup);add('Care instructions',a.petCare);add('Pet care',a.petPlan,true);add('For local advice',a.petRequest);}
  if(a.funeral && a.funeral!=='No preference'){add('Funeral or memorial',a.funeral,true);add('Funeral or memorial',a.funeralDetails);}
  return entries;
}
export const orgKey=(stem,n)=>'org'+stem+n;
export function organizationEntries(a) {
  const gifts=[];
  for(let n=1;[orgItem,orgCash].includes(a[orgKey('Gift',n)]);n++) {
    const key=stem=>orgKey(stem,n),kind=a[key('Gift')]===orgItem?'item':'cash';
    gifts.push({n,kind,recipient:a[key('Name')],description:a[key('Item')],amount:a[key('Amount')],terms:a[key('Terms')]});
  }
  return gifts;
}
// Evidence and deliberate exclusions: docs/review/planning-choices-2026-11-16.md.
export function canGiveToOrganization(p,kind,row) {
  if(p.route==='statutory')return p.key==='US-ME' && kind==='cash' && row<=3;
  if(p.route==='official')return p.key==='US-CA' && kind==='cash' && row<=5;
  return ['paper','handwriting'].includes(p.route) && (['CA','GB','AU','NZ','IE','SG'].includes(p.country) || ['DE','PL','US-AK','US-HI','US-IA','US-ID','US-MA','US-ME','US-MI','US-MT','US-ND','US-NE','US-NY','US-SC','US-UT','US-WA'].includes(p.key));
}
export function organizationQuestions(p,a,ordinary,currency,confirmCash,identity) {
  const list=[],totals=new Map();
  for(const g of ordinary)if(g.who==='A charity' && g.amount)totals.set(identity(g.recipient),(totals.get(identity(g.recipient))||0)+Number(g.amount));
  for(let n=1;;n++) {
    const key=stem=>orgKey(stem,n), val=a[key('Gift')];
    list.push(q(key('Gift'),orgTitle,n===1?'Would you like to leave money or an item to an organization?':'Another gift to an organization?', ['I’m done',orgCash,orgItem],{lines:n===1?[orgGiftHelp]:[]}));
    if(![orgCash,orgItem].includes(val))break;
    const cash=val===orgCash, supported=canGiveToOrganization(p,cash?'cash':'item',ordinary.length+n);
    const suffix=(label)=>sentence('Gift {0} · {1}',ordinary.length+n,wording(label));
    list.push(q(key('Name'),suffix('Organization'),orgName,[],{kind:supported?'charity':'notes',lines:[supported ? orgAdvice : forReview]}));
    list.push(cash?q(key('Amount'),suffix('Amount'),sentence('Use a whole amount in {0}, between 1 and 999,999.',currency),[],{kind:'amount'}):q(key('Item'),suffix('Keepsake'),'Which item would you like to give?',[],{kind:supported?'item':'notes'}));
    if(supported){
      const manual=p.route==='statutory',ca=p.key==='US-CA';
      const localEffect=p.key==='US-AK'?alaskaOrganizationGift:orgEffect;
      const effect=manual?maineCharity:ca?'One adult or one charity can receive it. A person usually has to live five days after you. Check a charity’s registered name and sign the box beside each gift.':localEffect;
      list.push(q(key('Terms'),suffix('Terms'),orgFit,[ca||manual?'A charity':'I’ve checked',deferred],{lines:[...(ca||manual?[]:[orgTerms]),effect,...(p.civil?['After debts and all these gifts, most of the estate must still go to your heir.','The recipient doesn’t automatically own the gift. Your heir must carry it out.']:[])]}));
    }
    if(!supported || a[key('Terms')]===deferred)list.push(field(key('Request'),suffix('For local advice'),'What would you like to do differently?','notes',true));
    if(cash && a[key('Name')] && a[key('Name')]!==skipped && /^\d+$/.test(a[key('Amount')] || '')){
      const name=identity(a[key('Name')]),before=totals.get(name)||0,total=before+Number(a[key('Amount')]);
      if(before)list.push(q(key('Total'),suffix('Combined cash gifts'),sentence('{0} already has a cash gift. Together these entries give them {1} {2}. Is that the total you intend?',a[key('Name')],currency,total),[confirmCash(currency,total),deferred]));
      totals.set(name,total);
    }
  }
  return list;
}
export function planningReview(p,a,ordinaryCount=0) {
  return Object.values(a).includes(skipped) || Object.entries(a).some(([id,value])=>/^org(?:Terms|Total)\d+$/.test(id) && value===deferred) || a.petPlan===customPet ||
    a.petPlan===transfer && (!canTransferPets(p) || !hasCareAnswer(a.petCarer)) ||
    organizationEntries(a).some(g=>!canGiveToOrganization(p,g.kind,ordinaryCount+g.n));
}
