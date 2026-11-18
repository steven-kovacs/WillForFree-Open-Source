import {orgGiftHelp, earlierQuestions, hasPrior, deferred, transfer, customPet, canTransferPets, organizationEntries, canGiveToOrganization, forReview, skipped} from "./planning.js";
import { currentLanguage, editionNotice, sentence, translatedList, wholeNumber, wording } from "./locale.js";
import { californiaSpouseChoice, offersSurvival, partnerResidue, refusalToBackup, survivalHelp, texasResidueChoices } from "./survival.js";
import {backupOnDeath, independentDecisions, protectedFamily} from "./suitability.js";
import {limitsAppointiveProperty,  appointmentInterpreter, appointmentRequest, californiaBond, californiaCommunityShare, californiaCustodianScope, californiaGuardianScope, executorAgeInstruction, maineRemainder, maineSpouseAmount, maineSpouseRights, texasFamilyHome, texasGuardianScope, texasUnsignedChoice, texasInformalMarriage, estatePropertyGuide } from "./procedures.js";
import { businessHelp, ownsBusiness } from "./business.js";
import { item, cash, ordinaryGifts, giftList, giftText, personal, adviceOption, finishForm, finishNotes, differentTerms, giftCurrency, keepForAdvice, cancelAdvice, combinedGiftHint, giftEntryLimit } from "./extras.js";

export const YES = "Yes, all apply", STOP = "No or unsure";
const option = (value, label = value) => ({ value, label });
const card = (title, lines = [], options, tip = "") => ({title, lines, options, tip});
// The button wording and typed yes/no mean the same thing. A negative question
// must never silently turn a person's "yes" into a suitability confirmation.
const check = (title, lines, pass = "Yes", fail = "No", tip = "", yesPass = true) => ({
  ...card(title, lines, [option(YES,pass), option(STOP,fail), option(STOP,"I’m not sure")],tip),
  yesPass, recovery: tip || translatedList(lines," ") || title
});
const exception = (title, lines, tip, pass="None of these", fail="One applies") =>
  check(title, lines, pass, fail, tip, false);
const simpleLabels = {
  "1 · Registered spouse or partner, then descendants":californiaSpouseChoice,
  "One adult beneficiary":"One adult", "Another situation":"A different arrangement",
  "Leave open":"Skip this", [item]:"Give an item", [cash]:"Give money",
  [personal]:"Leave a message", [adviceOption]:"Something different",
  [finishForm]:"Fill in other gifts on the form", [finishNotes]:"Done with notes",
  [differentTerms]:"I want different instructions", [keepForAdvice]:"Save this change in my notes",
  [cancelAdvice]:"Keep my original choices", "These are practical wishes only":"Just messages",
  "I need another gift or different terms":"I meant to make a gift",
  "I will complete the descendant details on the court form":"I’ll list them on the form",
  "Use my balance choice for everything":"Use the people I chose",
  "I will add specific gifts in the court PDF":"I’ll fill in other gifts on the form",
  "Use section 2 for everything":"Use the people I chose",
  "I will enter separate gifts in the court PDF":"I’ll fill in other gifts on the form",
  "I’m unsure":"I’m not sure", "None of these":"Something else",
};
export const friendlyValue = value => simpleLabels[value] || value;
const kindChoices = q => (q.values || []).map(v => option(v, v===deferred ? "No or unsure" : friendlyValue(v)));
const regular = (q,title,lines=[],tip="") => card(title,lines,kindChoices(q),tip);
const rest = "What’s left means your money and property after debts, expenses and any gifts you list separately.";
const independent = "If someone is helping you read the screen, that is different from someone choosing your answers. This form needs to be your own decision.";
const federal = "For example, federal rules can apply to the estate of someone registered, or entitled to be registered, under the Indian Act who usually lives on a reserve or Crown land. Being Indigenous, on its own, doesn’t decide this.";
const careRole = "A guardian looks after a child; the person managing the child's money can be someone else.";
const fallback = "If nobody you name can inherit what’s left, local law decides who gets it.";
const timing = p => offersSurvival(p) ? "This will asks that each person receiving a gift live at least 30 days after you." :
  p.civil || p.country === "GB" || p.key === "CA-ON" ? "Local rules apply if it isn’t clear who died first." : "Local rules can require someone to live a minimum time after you to receive a gift.";
const notes = p => ["planning","professional"].includes(p.route);
const one = (...vs) => [regular(...vs)];
export function interviewCards(q,p,a={}, legacyChecks=[]) {
  const family = ["Children first","Partner, then children"].includes(a.household);
  const partner = a.household==="Partner, then children";
  if(q.id==="orgGift1")return [card(q.prompt,q.lines,q.values.map((v,i)=>option(v,i===0?"No":v)))];
  if (q.giftField==="extraTotal" || /^orgTotal\d+$/.test(q.id)) return one(q,q.prompt,[combinedGiftHint]);
  if(q.id==="mainePaperChoice")return [card(q.prompt,[maineSpouseAmount,maineRemainder,maineSpouseRights],q.values.map(v=>option(v,v===STOP?"Make a notes kit":v)))];
  if (q.planStep) return one(q,q.prompt,q.lines || []);
  if (q.giftMenu) {
    const addItem=q.values.includes(item), addCash=q.values.includes(cash);
    const limitReached=p.route==="official" && !addItem && !addCash && q.id!=="extra";
    const prior=q.giftField==="extraAfter" ? giftList(a).find(g=>g.n===q.giftNumber) : null;
    const previous=prior ? sentence("Gift {0}: {1} to {2}.",prior.n,giftText(p,prior),prior.recipient) : "";
    const example=addItem && addCash ? "For example, “my car” or “money for my brother”." : addCash ? "You can add a cash gift to a person or charity." : limitReached ? giftEntryLimit : notes(p) ? "You can write a message about gifts you have in mind." : "This will form doesn’t have a place for separate gifts.";
    return one(q, q.id==="extra" ? "Anything else you’d like to leave someone?" : "Anything else?", [previous,example,q.id==="extra" ? orgGiftHelp : ""].filter(Boolean));
  }
  if (q.giftField==="extraFit") {
    const isItem=a[q.giftStart]===item, ca=p.key==="US-CA", tx=p.key==="US-TX";
    const lines=[];
    const first=card(isItem?"Do you own the item outright?":"Are you giving a set amount of money?",[
      isItem?"It’s one physical item you own by yourself, with no loan against it.":sentence("The gift will be a specific amount in {0}.", giftCurrency(p)),
      ...(isItem && a.businessOwnership===ownsBusiness ? ["Choose a personal keepsake here. Your business interest follows the rest of your estate."] : [])
    ],[option("Yes, that fits","Yes"),option(differentTerms,"I need a different arrangement")]);
    if(ca) lines.push("One adult or one charity can receive it. A person usually has to live five days after you. Check a charity’s registered name and sign the box beside each gift.");
    else if(tx) lines.push("It’s for one adult who lives at least 30 days after you. The Texas form says what happens if they can’t receive it.");
    else {
      lines.push(p.civil ? sentence("Your heir must {0} to one independent adult who outlives you. If they die first, nobody replaces them; the gift stays in the rest of your estate.", wording(isItem?"deliver the item":"pay the gift"))
        : "It’s for one adult who outlives you. If they die first, this gift goes with the rest of your estate.");
      if(isItem) lines.push(p.civil ? "If you no longer own the item, there is no replacement." : "If you no longer own the item, there is no replacement, apart from any proceeds protected by law.");
      else if(!p.civil) lines.push("Cash gifts are paid before the rest is divided. If there isn’t enough money, the gift may be smaller.");
      if(p.civil) lines.push("After debts and all these gifts, most of the estate must still go to your heir.");
      if(p.country==="CZ") lines.push("Your heir may ask to keep a quarter of their inheritance free of these gifts.");
      if(p.country==="NO") lines.push("This replaces the usual rule that the recipient’s children or later generations may take their place.");
      if(p.country==="PL") lines.push("The recipient doesn’t automatically own the gift. Your heir must carry it out.");
      if(p.country==="GB" && family) lines.push("Even if this gift is for your own child, their children won’t take their place for this gift.");
      lines.push(timing(p));
    }
    // One short check at a time on routes with more terms than fit a single turn.
    const opts=[option("Yes, that fits","Yes, that works"),option(differentTerms,"I want different instructions")];
    const split=lines.length>3 ? [lines.slice(0,2),lines.slice(2)] : [lines];
    return [first,...split.map((body,i)=>card(i===0?"If the gift can’t be made, is this what you want?":"Do these rules work for your gift?",body,opts))];
  }
  if (q.giftField==="extraItem") return one(q,"Which item would you like to give?",["Describe it so someone can tell which one you mean. For a car, the year, make and model are useful."]);
  if (q.giftField==="extraAmount") return one(q,"How much money would you like to give?",[sentence("Use a whole amount in {0}, between 1 and 999,999.", giftCurrency(p))]);
  if (q.giftField==="extraRecipient") return one(q,q.kind==="charity" ? "What’s the charity’s full registered name?" : "Who should get this gift?", [q.kind==="charity" ? "Use the name you checked on the charity’s records." : "Enter the adult’s full name, so your will identifies them."]);
  if (q.giftField==="extraWho") return one(q,"Is this gift for a person or a charity?");
  if (/^noteTopic/.test(q.id)) return one(q,q.id==="noteTopic1" ? "What would you like to leave a message about?" : "Would you like to leave another message?");
  if (/^noteText/.test(q.id)) return one(q,{"Pet care":"What would you like your pet’s caregiver to know?","Funeral or memorial":"What would you like people to know about your funeral or memorial?","Digital belongings":"Where can people find the photos or files that matter to you?","A message or another wish":"What would you like to say?"}[q.label.slice(6)] || "What would you like to say?", [q.label.includes("Digital") ? "Leave out passwords, PINs and account numbers." : q.label.includes("Pet care") ? "This message tells people about care. It doesn’t give away a pet or set aside money." : "This is a message for your family. It doesn’t change who inherits."]);
  switch(q.id) {
    case "eligible": return [
      check("Are you making this will for yourself?",[],"Yes, for me","No",independent),
      check(sentence("Is {0} your permanent home, and are you at least {1}?", wording(p.name), p.minimum),[],"Yes to both","No","Use the place you consider your permanent home, even if you’re visiting somewhere else. The age shown is the minimum for this service."),
      check("Are these your own choices?",["You understand what you own and who depends on you. You can read and understand the whole will in the language in which you will sign it, and you can sign it yourself.",independentDecisions,...(["NL","PT"].includes(p.key)?[appointmentInterpreter]:[])],"Yes","No",independent)];
    case "businessOwnership": return one(q,q.prompt,["Count a side business, working for yourself, or a business you own with someone else."],businessHelp);
    case "businessTransfer": return [check("Do you know what your estate would get from the business?",[
      "That might be tools you own yourself, shares you can pass on, or money if a co-owner must buy you out.",
      "Check any company rules, agreements with co-owners and limits on who can inherit. If the company owns a van or bank account, it belongs to the company."
    ],"I’ve checked","I need to check","Look for what happens when an owner dies. If you’re unsure what would reach your estate, check your papers or ask a local adviser before signing.")];
    case "businessWishes": return [check("Should your share follow the rest of your will?",[
      p.key === "SK" && !p.legacySlovakBackup ? q.prompt : "Whatever your estate gets from the business would go to the same people, in the same shares, with the same backups you choose for everything left over.",
      "If you want a different person to inherit it, want to keep it out of this will, or need the will to say who runs or buys the business, choose “I want a different plan”."
    ],"Yes, the same people","I want a different plan","Leaving a business unnamed doesn’t keep it out of the will. A plan for a different owner or a second will needs to fit with your personal will before you sign.")];
    case "estateScope": return [
      exception(sentence("Do you own any assets outside {0}?", wording(p.name)),["For example, count money in a bank account, a share in a business or land in another jurisdiction."],"This form covers an estate in one place. Property elsewhere can involve more than one set of inheritance rules.","No","Yes"),
      exception("Do any of these apply to your plans?",["There is an agreement with someone else about who inherits.","There’s a disagreement about who you must support.","A gift could affect someone’s benefits, or someone else needs to sign for you."],"For example, an inheritance can change payments someone gets because of a disability. If any of these fit, this form can’t account for it.")];
    case "localLaw":
      if(p.country==="CA") return [exception("Could special rules apply to anything you own?",[sentence("For example: rights to land on a First Nations reserve, or property that follows different inheritance rules from the rest of {0}.", wording(p.name)),"Federal rules can also apply if you’re registered, or could register, under the Indian Act and normally live on a reserve or Crown land. Being Indigenous on its own doesn’t decide this."],federal,"No, just the usual rules","Yes, special rules may apply")];
      if(p.country==="US") return [exception("Does anything you own follow special inheritance rules?",[sentence("For example, land the United States holds in trust for a Tribe or an individual Native American, or other property whose inheritance is not governed by the law of this state ({0}).", wording(p.name))],"Different inheritance rules can apply to land the United States holds in trust for a Tribe or an individual Native American. If you are unsure about a particular property, check before using this form.","No, just state rules","Yes, special rules may apply")];
      if(p.country==="NZ") return [exception("Does your estate include Māori freehold land or property with special inheritance rules?",[],"These types of property can pass under different rules from other belongings.","No","Yes")];
      return [check("Does Singapore’s civil law apply to your estate?",["This form is for a non-Muslim estate. Any CPF nomination is handled separately."],"Yes","No","A CPF nomination is a separate way to choose who receives your CPF savings.")];
    case "household": return one(q,"Who would you like to get what’s left?",[rest,"If you choose your children, each child’s share stays with their side of the family. An adult manages a child’s share until 18."]);
    case "familyFit":
      if(family) return [check(partner ? "Does this describe your family today?" : "Does this describe your family?",[
        partner ? (p.country==="GB" ? "You’re together with your spouse or registered civil partner. All your children are living and are children of both of you." : "You and your partner are together. All your children are living and are children of both of you.") : "You have no spouse or partner and all your children are living.",
        partner && p.country!=="GB" ? "There’s no former partner, other dependant or competing claim for support." : partner ? "There are no competing claims for support or property." : "Nobody else depends on you for support, and there are no unresolved support duties or family disputes."],"Yes, that’s my family","My situation is different","If a child has died, a past partner may have a claim, or someone else depends on you, this family option may not fit.")];
      return [exception("Do you have any of these family ties?",["A spouse or partner, children, grandchildren or later generations.",...(p.civil?["A living parent, grandparent or other ancestor."]:[]),"Someone who depends on you or is owed support."],"This option leaves what’s left to one adult. Your permanent home and the property covered must both be here.")];
    case "maker": return one(q,notes(p) ? "What name would you like on your notes?" : "What’s your full legal name?",notes(p)?[]:["Write it the way you want it to appear on your will."]);
    case "town": return one(q,"What town or city do you live in?",["Just the place name. No street address needed."]);
    case "executor": return one(q,"Who would you trust to handle the paperwork after you die?",[sentence("{0} They settle bills and carry out your will.", wording(p.key==="CA-QC"?"In Québec this person is called a liquidator.":"This person is called your executor.")),p.route==="official"?"Enter their full legal name.":sentence("Enter the full legal name of an eligible adult who lives in {0}.", wording(p.name)),...[executorAgeInstruction(p)].filter(Boolean)]);
    case "alternate": return one(q,"Who could do that job if your first choice can’t?",["Enter a different adult’s full name, or skip this."]);
    case "partner": case "spouse": return one(q,q.prompt);
    case "children": case "formChildren": return one(q,"What are the full names of your living children?",["Include adopted children. Put one name on each line or separate the names with commas."]);
    case "care": case "familyGuardian":
      if (p.key === "US-TX") return one(q,q.prompt,[texasGuardianScope]);
      if (p.key === "US-CA") return one(q,q.prompt,[californiaGuardianScope]);
      return one(q,"Who would you choose to look after your children if a guardian is needed?",["Enter their full name or skip this. Naming someone doesn’t replace a surviving parent who has the right to care for them."],careRole);
    case "trustee": return one(q,"Who would you trust to manage your children’s inheritance until they turn 18?",["Enter an adult’s full name. This can be someone other than their caregiver."]);
    case "coTrustee": return one(q,"Who should manage the children’s money alongside your first choice?",["Enter a different adult’s full name. The two people will do this job together."]);
    case "recipient": case "oneAdult":
      if (p.route!=="official") return one(q,q.prompt,[rest]);
      return one(q,p.key==="US-TX" ? "Who is the first person you want to share what’s left?" : "Who should inherit what’s left?",[p.key==="US-TX"?"Enter their full name. You can add others to share equally.":sentence("Enter the person’s full name. {0}", wording(rest))]);
    case "backup": return one(q,family || refusalToBackup.has(p.key) ? q.prompt : "Who should inherit instead if your first choice dies before you?",["Enter a different adult’s full name."]);
    case "intent": return [check("Are you happy with these choices if someone dies first?",[...(p.key==="CA-ON" && !family ? ["If your first choice dies before you, their spouse or children don’t automatically take their place. Your named backup inherits instead."]:[]),fallback,timing(p)],"Yes","I want another outcome",p.key === "SK" ? fallback : "For example, if your backup also dies first, your will doesn’t name someone beyond them.")];
    case "execution": return one(q,"Would you rather print the will or write it by hand?",["For a printed will, you sign with two witnesses together. For a handwritten will, write every word yourself and sign at the end."]);
    case "partnerOutright": return [check("Should your partner be free to use the residue they inherit?",[partnerResidue],"Yes","I want another outcome")];
    case "declinedGiftGB": return [check(q.prompt, [
      ...(family ? [partner ? "If your partner refuses the residue, it goes to your children’s family branches. If a child refuses their share, their surviving descendants can take that branch." : "If a child refuses their share, their surviving descendants can take that branch."] : ["If your first beneficiary refuses the residue, it goes to your backup if they qualify."]),
      "If a person refuses a separate cash or item gift, it goes back into the residue. Refusing one gift does not by itself refuse a different gift or an appointment."
    ],"Yes","I want another outcome")];
    case "firstInstrument": return [exception(q.prompt,[],q.prompt,"No","Yes")];
    case "independentChoice": return [check("Can you read, understand and sign the will yourself?",["NL","PT"].includes(p.key) ? [independentDecisions, appointmentInterpreter] : ["Nobody is interpreting it or making decisions for you. There’s no court order giving a guardian or another person control of these choices."],"Yes","No",independent)];
    case "assetCheck": return [check("Are you leaving only property you can give through this will?",["A joint owner or someone named on an account, pension or insurance policy may receive it separately. Property held in a trust may also pass separately.",estatePropertyGuide(p),limitsAppointiveProperty(p) && p.key !== "AU-TAS" && "A trust, will or deed may let you decide who receives property held under it. The gifts in this will leave that power unused.",p.key === "SG" && "If your share of an HDB flat passes under your will, the beneficiary must meet HDB’s eligibility rules to keep it.","Your permanent home is here. There’s no foreign property, competing law because of citizenship, special inheritance rule or uncertainty about ownership."].filter(Boolean),"Yes","No","For example, a person named on a life insurance policy may receive it regardless of what your will says.")];
    case "recipientsCheck": return [check("Are all the people you named allowed to receive gifts under these rules?",[p.key === "SK" && !p.legacySlovakBackup ? q.prompt : "Include your backups. Nobody named helped write, arrange or pay for this will, or is closely connected to someone who did.","Nobody named is your paid or unrelated caregiver, care-home owner or worker, guardian, spiritual adviser or medical adviser, or someone closely connected to them. Ordinary care by family is different."],"Yes","No","If the person both cares for you and would inherit, check whether this rule applies to your situation.")];
    case "canadaEstates": return [exception("Could the federal government be responsible for your estate?",["This can matter if you’re registered, or could register, under the Indian Act and usually live on a reserve or Crown land. Indigenous identity alone doesn’t decide this."],federal,"No","Yes, possibly")];
    case "supportCheck": return family ? [check("Have you included everyone who relies on you?",["Think about money, a place to live and unpaid care, as well as anyone you must support. Your plan needs to provide enough for them, with no competing family arrangement or other claim."],"Yes","No")] : [exception("Could anyone have a claim for support after you die?",["Think about a current or former partner, someone you raised as a child, or someone you now help or used to help with money, housing or care, including someone who lived with you."],"Someone may depend on you even without a written support agreement.","No","Yes, someone might")];
    case "familyTermsGB": return [check("Is this how you want your children to inherit?",["Each surviving child gets an equal share. If a child dies before you leaving descendants who survive you, that branch takes the child’s share. Include children born or adopted later. Each beneficiary owns their share from your death.","Adults manage a child’s share until 18. If the child dies after you but before 18, their remaining share goes to their own estate.","This option is for families without stepfamily arrangements, disputed parentage or a need to protect someone’s share in a special trust."],"Yes","No")];
    case "guardianGB": return [check("Can you make this choice about your children’s care?",["You hold parental responsibility for each child. There’s no earlier written guardian choice, court order about who the child lives with or special guardianship, and no dispute or arrangement across borders.","Your choice usually takes effect only when no parent with parental responsibility is alive."],"Yes","No",careRole)];
    case "familyMeaning": return [check("If a child dies before you, should their share go to their children?",["It follows that child’s side of the family, rather than going to their spouse.","Who each child’s legal parents are is clear. There’s no assisted reproduction, surrogacy or dispute to account for. A guardian named here can’t replace someone who still has the legal right to make decisions for the child."],"Yes","No")];
    case "residueMeaning": return [check("If your first choice dies before you, should your named backup inherit?",["The first person’s spouse or children don’t take their place automatically. If your backup also dies first, local law decides who inherits."],"Yes","I want another outcome")];
    case "englandWales": return [check("Are your permanent home and all your property in England or Wales?",["You have no property elsewhere, even in Scotland or Northern Ireland. You’re not about to marry or form a civil partnership. There’s no unresolved claim involving a former partner, household or dependant.","If you own property as joint tenants, it normally passes automatically to the surviving owners. If you own it as tenants in common, you can leave your share in your will."],"Yes","No")];
    case "quebecTerms": return [check("Do these Québec arrangements work for you?",["If you print the will, you can tell both witnesses yourself that it is your will. You want the liquidator to be able to sell and manage property as the will describes.","There’s no dispute over support or marital property, and no gift affected by a foster family or care facility relationship."],"Yes","No")];
    case "estoniaTerm": return [check("Are you comfortable with a will that lasts six months?",["In Estonia this type of will expires after six months if you’re still alive. You’ll need to track the date yourself. A notarial will is an option if you want one that lasts longer."],"Yes","No")];
    case "officialMeeting": {
      const steps={NL:["You can personally read the will, sign every numbered page and take it to a Dutch civil-law notary.","You’ve checked with the office about the language and who will keep the will."],PT:["You can personally declare and sign this will with a Portuguese notary authorized for international wills and two eligible witnesses together.","You’ve checked the ceremony and any interpreter arrangements with the notary."],MT:["You can personally read, sign, seal, speak and deliver the will to a Maltese notary or court.","You’ve checked the procedure and language with the office. No monastic vows or restrictions on a recipient, including the writer or their family, affect you."]};
      return [check("Have you checked the appointment arrangements?",[appointmentRequest[p.country],...steps[p.country]],"Yes","Not yet")];}
    case "fiduciaryFit": return [check(sentence("Have you checked that the people handling your will can do the job in {0}?", wording(p.name)),["Check your first and backup choices against the local rules on where they live, their age, their ability to act and any convictions. No need to enter those private details."],"Yes","Not yet")];
    case "wholeInheritanceRefusal": case "residueRefusal": case "separateGiftRefusal": case "txCustodyTerms": case "txGuardianScope":
    case "caDescendantShares": case "caGuardianScope": case "caCustodyScope":
      return [check("Do you want this provision in your will?",[q.prompt],"Yes","No")];
    case "usExecutorQualification":
    case "executorAgeFit": return [check("Your executor choices",[q.prompt],"Yes","Not yet")];
    case "territorialChildShare": return [check("Protected family rights",[q.prompt],"Yes","No")];
    case "ontarioLaterBirth": return [check("Which later-born descendants can inherit?",[q.prompt],"Yes, use these terms","I want different terms")];
    case "earlierPowerOfAppointment": case "tasmanianPowerOfAppointment": case "courtPowerOfAppointment":
    case "dutchEuropeanHome": case "usSubstituteGifts": case "quebecCareRecipients":
    case "txFamilyScope":
    case "okCourtOrder": return [check(q.prompt, [])];
    case "australianClaims": return [check(sentence("Is your estate entirely covered by the law in {0}?", wording(p.name)),["There’s no claim involving a former or separated partner, stepchild, household member, someone who depended on you or someone you had a close personal relationship with."],"Yes","No")];
    case "australianParents":
    case "austrianCare":
    case "heirRenunciation":
    case "saFamilyCare":
    case "canadianFailedGifts":
    case "slovakHeir":
    case "adultResidueRecipients": return [check(q.prompt,[],"Yes","No")];
    case "courtOutright": return p.key === "US-TX" && !a.txChoice
      ? [check("Do you want this provision in your will?",[q.prompt],"Yes","No")]
      : [check(q.prompt,[survivalHelp(p)],"Yes","No")];
    case "protectedShares": return [check("Are you free to leave what you own to the two adults you named?",[protectedFamily,backupOnDeath],"Yes","No")];
    case "nzParentsPromises": return [exception("Do either of these apply to you?",["You have a living parent.","You promised, even informally, to leave someone something for work, services or care."],"In New Zealand a living parent may sometimes have a claim even if you have never supported them.","Neither applies","One applies")];
    case "surviveThirty": return [check("Should each person have to live 30 days after you to inherit?",["This includes your backup. For example, if someone dies two days after you, the will treats them as having died first.","Their separate gift goes back into what’s left. Your backup gets what’s left only if they also live 30 days after you."],"Yes, use 30 days","I want different timing")];
    case "marriage": return one(q,"Which describes your relationship status today?",[texasInformalMarriage, "Choose “None of these” if you are unsure whether you are legally married."]);
    case "descendants": return one(q,"Do you have children or grandchildren?",["Include adopted children and grandchildren through a child who died. If your only living descendants are great-grandchildren or a later generation, choose “I’m not sure”."]);
    case "giftFit": return [check(sentence("Do you want your property and money to go to {0}?", wording(a.marriage==="Married, spouse living" ? (a.descendants==="I have children or grandchildren"?"your spouse, children or grandchildren":"your spouse"):"your children or grandchildren")),["That’s who this Texas court form is designed for.",texasFamilyHome],"Yes","No")];
    case "caBalance": return [card("Who should get what’s left after debts and other gifts?",[survivalHelp(p),californiaCommunityShare,"On the printed form, you’ll sign one box for this choice."],q.values.map((v,i)=>option(v,[californiaSpouseChoice,"My children and later generations","One person","Two to four people"][i])))];
    case "multiple": return one(q,"Who should share equally?",["Enter two to four different full names, separated by commas."]);
    case "caRegistered": return [check("Are you married to this person or registered as domestic partners with California’s Secretary of State?",[],"Yes","No")];
    case "caDescendants": return [check("Do you have children, grandchildren or later generations you want to inherit this way?",[],"Yes","No")];
    case "custodian": return one(q,q.prompt,[californiaCustodianScope]);
    case "custodyAge": return one(q,q.label,["Choose an age between 18 and 25.",californiaCustodianScope]);
    case "txLiving": return one(q,"Are all your children living, and do you have between one and seven children?",["If so, you can list them here. Otherwise, fill in the family details on the court form."]);
    case "formFinish": return [check("Will you read the whole court form and follow its signing instructions?",[editionNotice(p),"You can make choices here or fill in the remaining optional sections yourself on the form."].filter(Boolean),"Yes","No")];
    case "caExtras": return one(q,"Would you like to fill in any other gift boxes on the printed form?",["For now, your home, personal belongings and money can go to the people you already chose. You can still add up to five cash gifts in this chat."]);
    case "txSpecific": return one(q,"Would you like to fill in other gift boxes on the Texas form?",["You can use your choice in section 2 for everything. You can still add up to eight gifts here."]);
    case "caBond": return one(q,"Do you want your executor to be excused from posting a bond?",["A bond is a financial safeguard. To waive it, you sign the box in paragraph 9. If you don’t want to waive it, leave that box unsigned.",californiaBond]);
    case "alsoKnown": return one(q,"What other name do you regularly use, if any?",["Enter it here, or skip this."]);
    case "txAlternates": return one(q, q.prompt);
    case "txAdditional": return one(q,sentence("Should anyone share equally with {0}?", a.recipient || wording("the person you named")));
    case "txOthers": return one(q,"Who else should share equally?",["Enter up to seven other full names, separated by commas. The people on the list who survive you share equally."]);
    case "txChoice": return one(q,"Who should get what’s left after debts and other gifts?",[texasResidueChoices,texasUnsignedChoice]);
    case "appointment": return [check("Would you like to write down your plans?",[p.route==="professional"?"You can take these answers to a local will appointment.":"Your download will contain your answers as notes. It won’t include a will to sign."],"Yes, write my plans","No")];
    case "wishes": return one(q,"What would you like to remember or ask someone about?",["For example, a gift you have in mind or a question about your family. Leave out passwords and account numbers."]);
    case "noteCheck": return one(q,"Are these just messages, or did you mean to make a gift?",["A message doesn’t change who inherits. If you meant to add a gift or a condition here, we’ll keep it in a notes kit for you to follow up on."]);
    case "formNotes": return one(q,"Would you like to leave a separate message for your family?");
    case "adviceOverride": return one(q,"Would you like to save your requested change as a note?",["You’ll keep the earlier choices for reference. This download won’t contain a will to sign."]);
    case "adviceFor": return one(q,"Which earlier gift or choice would you like to change?");
    case "extraRequest": return one(q,"What would you like to do differently?",["We’ll put your request and earlier answers in a file you can take to someone locally. It won’t include a will to sign."]);
    case "legacyConsent": return legacyChecks.flatMap(old=>interviewCards(old,p,a)).map(c=>({...c,legacy:true}));
    default: return one(q,q.prompt);
  }
}



// These later records repeat conditions explicitly shown and accepted on the early cards.
// Receipts are created only after the entire group passes, never inferred from uploaded files.
export function coveredLater(id,p,a) {
  if (id==="eligible") return ["independentChoice"];
  if (id==="estateScope") return ["firstInstrument"];
  if (id==="localLaw" && p.country==="CA") return ["canadaEstates"];
  if (id==="intent" && p.key==="CA-ON" && !["Partner, then children","Children first"].includes(a.household)) return ["residueMeaning"];
  return [];
}

export function reviewLabel(q) {
  const common={estateScope:"Your property and plans",eligible:"Making this will",localLaw:"Which rules cover your property",town:"Town or city where you live",recipient:"Who gets what’s left",oneAdult:"Who gets what’s left",multiple:"People sharing what’s left",backup:"Who inherits as a backup",intent:"If nobody you named can inherit",residueMeaning:"If your first choice dies first",surviveThirty:"Waiting 30 days to inherit",assetCheck:"Property covered by this will",supportCheck:"People who depend on you",protectedShares:"Family rights",caBalance:"Who gets what’s left",giftFit:"Who the form can provide for",txAdditional:"Other people sharing what’s left",txSpecific:"Other gifts on the form"};
  return common[q.id] || q.label;
}

export function reviewQuestionTitle(q,card,p,answers) {
  const match=/^org(?:Terms|Total)(\d+)$/.exec(q.id);
  if(!match)return card.title;
  const number=ordinaryGifts(answers).length+Number(match[1]);
  const gift=giftList(answers).find(g=>g.organization && g.n===number);
  if(!gift)return card.title;
  const value=gift.type===item?gift.description:wording(sentence("{0} {1}",giftCurrency(p),wholeNumber(Number(gift.amount))));
  const description=sentence("Gift {0}: {1} to {2}.",gift.n,value,gift.recipient);
  return translatedList([description,card.title]," ");
}

// Labels are authored text; the visitor’s typed answer is always kept verbatim.
export function mattersForReview(p,a,issues={},all=[],record=[],reviewNotes=[]) {
  const rows=record.filter(([label])=>label==="Question to discuss").map(([label,value])=>[label,value,true]);
  if(hasPrior(a))rows.push([earlierQuestions(a)[0].prompt,a.priorWill,false]);
  const questionAt=(id,part)=>{
    const q=all.find(q=>q.id===id);
    const cards=q?interviewCards(q,p,a,all.filter(c=>c.id!=="legacyConsent" && c.values?.[0]===YES)):[];
    const card=cards[part] || cards[0];
    return {card,title:card?reviewQuestionTitle(q,card,p,a):"Question to discuss"};
  };
  for(const [id,[part,answer,note]] of Object.entries(issues)){
    const {card,title:question}=questionAt(id,part);
    const title=card?translatedList([question,...card.lines]," · "):question;
    rows.push([title,answer,!(card?.options.some(o=>o.label===answer) || [deferred,"You said someone may be pressuring you.","The publisher’s form is unavailable here."].includes(answer))]);
    if(note)rows.push(["For local advice",note,true]);
  }
  if(a.petPlan===customPet || a.petPlan===transfer && (!canTransferPets(p) || !a.petCarer || ["Leave open",skipped].includes(a.petCarer))) {
    const request=a.petRequest!==skipped && a.petRequest;
    rows.push(["Pet care",request || a.petPlan,Boolean(request)]);
  }
  const first=ordinaryGifts(a).length;
  for(const g of organizationEntries(a))if(!canGiveToOrganization(p,g.kind,first+g.n) || g.terms===deferred || a["orgTotal"+g.n]===deferred) {
    const description=g.kind==="item"?g.description:giftCurrency(p)+" "+g.amount;
    if(g.recipient && g.recipient!==skipped && ![undefined,skipped].includes(g.kind==="item"?g.description:g.amount))rows.push([forReview,sentence("Gift {0}: {1} to {2}.",first+g.n,description,g.recipient),false]);
    if(a["orgRequest"+g.n] && !["Leave open",skipped].includes(a["orgRequest"+g.n]))rows.push(["For local advice",a["orgRequest"+g.n],true]);
  }
  if(a.extraRequest && a.extraRequest!==skipped)rows.push(["For local advice",a.extraRequest,true]);
  for(const note of reviewNotes){
    const {title}=questionAt(note.id,note.part);
    // Retain the original context when an edit changes the gift or removes the question.
    const label=title===note.question || currentLanguage()==="en" ? note.question : note.caption || note.question;
    rows.push([label,note.text,true,note]);
  }
  return rows;
}
