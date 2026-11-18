import {separateRefusalPlaces, separateRefusalText, canadianGiftChoice, courtOutrightChoice, courtSpouseInherits, expressSubstitution, offersSurvival, residueRefusalKey, residueRefusalText, refusalToBackup, texasChildlessSpouseGift} from "./survival.js";
import {giftIdentity,ordinaryGifts} from "./extras.js";
import {usWillGuidance} from "./us-sources.js";
import {hasPrior,transfer} from "./planning.js";
import {sentence, translatedList, wording} from "./locale.js";
import {limitsAppointiveProperty, priorDesignationGuide, jointWillRules, estonianRevival, appointmentInterpreter, californiaCustodianScope, californiaDescendantShares, californiaGuardianScope, europeanNetherlands, executorAgeInstruction, territorialChildShare, texasGuardianScope, texasCustody} from "./procedures.js";
export const protectedFamily = "You have no spouse, registered partner, children or later generations, living parents, grandparents or other ancestors. Nobody can claim maintenance, and no other obligation limits these gifts.";
export const backupOnDeath = "Both adults are eligible to inherit. If the first dies before you, only your named backup replaces them. The first person’s children don’t automatically get the gift.";
export const independentDecisions = "Nobody is putting pressure on you, interpreting the will or choosing for you. No court order gives someone else control of these decisions.";
// Append these checks AFTER previous questions. An old 'yes' can never answer a new rule.
export function currentChecks(p, a, check) {
  if (["planning","fixed"].includes(p.route)) return [];
  const on = p.key === "CA-ON", family = ["Partner, then children","Children first"].includes(a.household);
  const y = (id,label,prompt) => check(id,label,prompt);
  const qs = [
    y("firstInstrument","Inheritance agreements","Is there an agreement with someone else about who inherits?"),
    y("independentChoice","Your own choices",["NL","PT"].includes(p.key)
      ? translatedList(["Can you read, understand and sign the will yourself?", independentDecisions, appointmentInterpreter]," ")
      : "Are you acting on your own, able to read and understand this will and sign personally, without pressure, a guardianship or conservatorship order, or anyone interpreting or making choices for you?"),
    y("assetCheck","What this will covers","Does this cover only your own estate under the law of your permanent home? Joint property passing by survivorship, trust property, pensions, insurance and accounts with nominations may pass separately. Choose “No or unsure” for another domicile, foreign nationality with competing law, foreign property, uncertain ownership or a different legal regime."),
    y("recipientsCheck","Who can receive these gifts",p.key === "SK" && !p.legacySlovakBackup ? "Your named heir did not write, arrange or pay for this will and is not closely connected to anyone who did." : "Are all recipients legally able to take their gifts, with no gift to someone who drafted, arranged or paid for preparing this will, a paid or unrelated caregiver, care-home owner or worker, guardian, spiritual or medical adviser, or someone closely connected to them? Include backup recipients. Ordinary family care is different; choose “No or unsure” if in doubt."),
  ];
  if (p.country === "CA") qs.push(y("canadaEstates","Which estate rules apply","Have you ruled out a federally administered estate, including where Indian Act rules may apply to someone ordinarily resident on a reserve or Crown lands? Indigenous identity by itself does not decide this."));
  if (p.route !== "official") qs.push(y("supportCheck","People who may have a claim", family
    ? "Have you considered everyone you actually help with money, care or housing as well as everyone you have a duty to support? Are all your dependants included in this family plan, with adequate support, no claim from anyone else and no competing family arrangement?"
    : "Do you have no current or former spouse or partner with a possible claim, no person you treated as a child and no one you support or previously supported with money, care or housing who may have a claim? Include people who lived with you. This simple route is only for an estate with no competing family claims."));
  if (p.country === "GB" && family) qs.push(y("familyTermsGB","Children, trustees and guardian","Do you choose equal family branches, including later-born and adopted children? Each beneficiary acquires their share at your death. Trustees manage a minor’s share until age 18. If the minor dies after you but before turning 18, the balance goes to that minor’s own estate. There must be no blended families, protective trust needs or disputed parentage."),
    ...(a.care && a.care !== "Leave open" ? [y("guardianGB","Your parental responsibility","Do you hold parental responsibility for each minor child concerned, have no earlier written guardian appointment or relevant live-with or special guardianship order, and have no cross-border or disputed care arrangements? Your appointment normally starts only once no parent with parental responsibility survives.")] : []));
  if (on && family) qs.push(y("familyMeaning","How your family shares work","Do you want a deceased child’s share to go down their family branch to their descendants, not to that child’s spouse? Is legal parentage straightforward, without assisted reproduction, surrogacy or a dispute about a child? A care appointment cannot displace a surviving holder of decision-making responsibility."));
  if (on && !family) qs.push(y("residueMeaning","Your backup beneficiary","If a named beneficiary dies first, their spouse or children do not automatically take their place under these gifts. The remaining estate follows your named backup and then intestacy. Is that your choice?"));
  if (p.country === "GB" && ["ENG","WLS"].includes(p.region)) qs.push(y("englandWales","Home, family and property","Are you domiciled in England or Wales with no property elsewhere, including Scotland or Northern Ireland, no upcoming marriage or civil partnership, and no unresolved claim involving a former spouse, civil partner, a former household or other dependants? A joint tenancy normally passes to the surviving owner; only your tenant-in-common share can pass under this will."));
  if (p.key === "CA-QC") qs.push(y("quebecTerms","Making these choices in Québec","Can you personally declare this will to both witnesses if you choose the printed method? Do you intend the sale and administration powers stated for your liquidator, with no disputed support or matrimonial rights and no gift affected by a foster family or care establishment relationship?"));
  if (p.key === "EE") qs.push(y("estoniaTerm","Six months","An Estonian domestic will expires after six months if you are still living. A notarial will is the alternative for a lasting instrument. Do you intend to use this shorter route and track the date yourself?"));
  if (p.route === "deposit") qs.push(y("officialMeeting","Your official appointment",{
    NL:"Can you personally read the instrument, sign each numbered page and deposit it with a Dutch civil-law notary? Have you confirmed language and custody arrangements with that office?",
    MT:"Can you personally read, sign, seal, speak and deliver this secret will to a Maltese notary or the court? Have you confirmed the delivery procedure and language, with no applicable monastic vows or restricted recipient (including the writer or their family)?",
    PT:"Can you personally declare and sign this will, with a Portuguese notary authorized for international wills and two eligible witnesses together? Confirm the ceremony and any interpreter arrangements with the notary.",
  }[p.country]));
  if (p.key === "US-FL" || p.key === "US-NY" || p.key === "US-TX") qs.push(y("fiduciaryFit","Your executor choices","Have you checked that both your first and alternate executors qualify for appointment here, including residence, age, capacity and any rules about convictions? You do not need to tell us their private details."));
  if (p.country === "AU") qs.push(y("australianClaims","Family provision","Are there no claims involving a former or separated partner, a stepchild, a household member, someone who depended on you, or someone in a close personal relationship? Are all your estate assets governed by the law of the state or territory you selected?"));
  if (p.civil && (p.key !== "SK" || p.legacySlovakBackup)) qs.push(y("protectedShares","Protected family rights",sentence("{0} {1}",wording(protectedFamily),wording(backupOnDeath))));
  if (p.country === "NZ") qs.push(y("nzParentsPromises","Parents and promises of inheritance","Do you have no surviving parent and no promise, express or implied, to reward someone out of your estate for work, services or care? A surviving parent can sometimes bring a claim even if you never supported them."));
  if (offersSurvival(p)) qs.push(y("surviveThirty","If someone dies soon after you","Do you choose a 30-day survival period for every person receiving a gift under your will, including your backup? Someone who dies two days after you counts as having died first for these gifts. Their separate gift returns to the residue; the named backup can receive the residue only if they also survive by 30 days. Choose “No or unsure” if you want other timing."));
  if (p.country === "US" && offersSurvival(p)) qs.push(y("usSubstituteGifts", "If a beneficiary dies too soon", "If someone you name dies before you or lives less than 30 days after your death, do you want their gift to follow the backup instructions in your will, even if they leave children or other descendants? Those descendants could still inherit in their own name or under intestacy law."));
  if (p.key === "US-OK") qs.push(y("okCourtOrder", "Oklahoma guardianship or conservatorship", "Can you confirm that you are free of any guardianship or conservatorship, including a limited one? If you are subject to either, Oklahoma requires you to sign and acknowledge your will before a district judge."));
  if (p.key === "US-HI") {
    qs.push(y("hawaiiReciprocalBeneficiary", "Protected family rights", "Can you confirm that you have no current registered reciprocal beneficiary in Hawaii? Two relatives, such as siblings, can register with the Department of Health. The survivor can claim a share of the estate even if you leave everything to someone else."));
    qs.push(y("hawaiianHomeLands", "What this will covers", "If you hold a Hawaiian Home Lands homestead lease, have you kept succession to that lease out of the gifts you expect this will to make? To choose a successor, file the designation with the Department of Hawaiian Home Lands and obtain its approval before your death. If you have no such lease, choose Yes."));
  }
  if (p.key === "US-AK") qs.push(y("alaskaNativeStock", "What this will covers", "If you own inalienable Alaska Native corporation stock, have you checked your stock certificate or separate stock will with the issuing corporation and confirmed who should receive those shares? This will does not specifically dispose of them. An effective stock designation can still control them. If you have no such stock, choose Yes."));
  if (p.key === "US-TX" && a.marriage === "Single, widowed or divorced") qs.push(y("texasUnmarried", "Marital status", "Can you confirm that the statement “I am not currently married” in section 1.3 is correct, including any Texas informal marriage? If a spouse may still be living and you have no final divorce or annulment, choose “No or unsure”."));
  if (p.key === "US-TX") qs.push(y("txFamilyScope", "Family covered by the Texas form", a.descendants === "I have children or grandchildren"
    ? "Do you have a living child or a living grandchild through a deceased child, and can you list every child and every child of a deceased child in the printed tables? When a child dies before you, section 2 passes their share only to their surviving children. Choose “No or unsure” if you need a share to continue to a later generation."
    : "Can you confirm that you have never had a child, including an adopted child, and have no descendants? The Texas form you selected states that you have no children. Choose “No or unsure” if a child has died or your family history does not fit that statement."));
  if (p.key === "SK" && !p.legacySlovakBackup) qs.push(y("slovakHeir","Who inherits","Do you choose one eligible adult as your sole heir, with your legal heirs inheriting under Slovak law if that person does not inherit? This form cannot name a backup heir."));
  if (p.country === "AU" && ["ACT","NT","TAS","WA"].includes(p.region)) qs.push(y("australianParents","Family provision","Can you confirm that you have no living parent? Under local law, a parent may be able to claim even if you have never supported them."));
  if (p.key === "AU-SA") qs.push(y("saFamilyCare","Family provision","Have you ruled out a claim by a parent, sibling or stepchild who cared for or supported you, or a stepchild whose own or other parent’s assets helped build your estate?"));
  if (p.country === "CA" && p.region !== "QC") qs.push(y("canadianFailedGifts", "If a beneficiary dies too soon", canadianGiftChoice));
  if (courtSpouseInherits(p, a)) qs.push(y("courtOutright", "Who gets what’s left",
    p.key === "US-TX" && !a.txChoice ? texasChildlessSpouseGift : courtOutrightChoice));
  if (p.key === "AT") qs.push(y("austrianCare", "People who may have a claim", "Can you rule out a claim for substantial care someone close to you provided for at least six months in the past three years without full compensation?"));
  if (expressSubstitution.has(p.key)) qs.push(y("heirRenunciation", "Backup beneficiary", "If your first heir outlives you but refuses the inheritance, do you want that share to pass under intestacy law, even if your named backup is alive?"));
  if (refusalToBackup.has(p.key)) qs.push(y(residueRefusalKey(p), "Backup beneficiary", residueRefusalText(p)));
  if (separateRefusalPlaces.has(p.key) && ordinaryGifts(a).length) qs.push(y("separateGiftRefusal", "If a separate gift fails", separateRefusalText(p)));
  if (p.key === "US-TX" && p.route === "official") {
    qs.push(y("txCustodyTerms", "Custodian", texasCustody));
    if (a.familyGuardian && a.familyGuardian !== "Leave open") qs.push(y("txGuardianScope", "Guardian nomination", texasGuardianScope));
  }
  if (p.key === "CA-QC") qs.push(y("quebecCareRecipients", "Who can receive these gifts", "Have you checked that article 761 does not affect any gift you plan to make? It covers even volunteers at a facility where you receive care or services, except a spouse or close relative. It also covers members of a foster family you live with."));
  if (executorAgeInstruction(p)) qs.push(y("executorAgeFit","Your executor choices",executorAgeInstruction(p)));
  if (territorialChildShare[p.key]) qs.push(y("territorialChildShare","Protected family rights",territorialChildShare[p.key]));
  if (p.key === "NL") qs.push(y("dutchEuropeanHome","What this will covers",europeanNetherlands));
  if (p.key === "DE") qs.push(y("germanBindingWill","An earlier joint will","Can you rule out a binding gift in an earlier joint will or inheritance contract? A joint will with a spouse who has since died can still bind you. Making a new handwritten will does not by itself cancel a binding gift."));
  if (["FI","SE"].includes(p.key)) qs.push(y("priorSpouseHeirs","Property from a deceased spouse","Can you confirm that no share is due to a deceased spouse’s heirs when you die? If you inherited from a spouse, you may be free to use the property during your life but unable to leave their heirs’ share by will. If you never inherited from a spouse, choose Yes."));
  if (["DK","IS","NO"].includes(p.key)) qs.push(y("undividedEstate","A deceased partner’s estate","Can you confirm you are not holding a deceased partner’s estate undivided with their heirs? Managing that property does not give you the right to leave all of it by will. If you hold an undivided estate or are unsure, choose No or unsure."));
  if (p.key === "AU-SA") qs.push(y("saVulnerableStepchild","Family provision","Can you rule out a claim by a stepchild who is significantly vulnerable because of disability? This includes a child of a former spouse or domestic partner. They can qualify to apply even if they never depended on you or cared for you."));
  if (p.parentPlan && a.household === "Partner, then children" && Array.isArray(a.children)) {
    const children = new Set(a.children.map(giftIdentity));
    const recipients = ordinaryGifts(a).map(g=>g.recipient);
    if (a.petPlan === transfer) recipients.push(a.petCarer,a.petBackup);
    if (recipients.some(name=>name && children.has(giftIdentity(name))))
      qs.push(y("childSeparateGift","Your child’s separate gift","You named a child for a separate gift as well as in your family plan. Should that gift still go to them on its own terms even if your partner takes the whole residue?"));
  }
  if (["GB-ENG","GB-WLS"].includes(p.key)) qs.push(y("declinedGiftGB","If a beneficiary cannot take a gift", "If someone validly refuses a gift, or the law bars them from taking it under the forfeiture rule, do you want that gift to pass as if they had died before you? A court order can change the effect of forfeiture."));
  // Civil-law routes already confirm eligible adult heirs, including Slovakia's single heir.
  if (!p.civil && !family && ["paper","handwriting"].includes(p.route))
    qs.push(y("adultResidueRecipients","Who can receive these gifts","Are you free to leave what you own to the two adults you named?"));
  if (p.key === "US-CA" && p.route === "official") {
    if (/^[12]/.test(a.caBalance)) qs.push(y("caDescendantShares","Who gets what’s left",californiaDescendantShares));
    if (a.familyGuardian && a.familyGuardian !== "Leave open") qs.push(y("caGuardianScope","Guardian nomination",californiaGuardianScope));
    if (a.custodian && a.custodian !== "Leave open") qs.push(y("caCustodyScope","Custodian",californiaCustodianScope));
  }
  if (usWillGuidance[p.key]?.executor) qs.push(y("usExecutorQualification", "Your executor choices", usWillGuidance[p.key].executor));
  if (p.country === "CA" && hasPrior(a)) qs.push(y("priorDesignation", "Beneficiaries named in an earlier will",
    translatedList([priorDesignationGuide(p), "Have you checked that signing this will gives you the result you want for those benefits?"], " ")));
  if (jointWillRules[p.key] && hasPrior(a)) qs.push(y("priorJointWill", "An earlier joint or mutual will",
    translatedList([jointWillRules[p.key], "If you made a joint or mutual will, have you confirmed that the new gifts can take effect as you intend, including any effect on your own inheritance? If you never made one, choose Yes."], " ")));
  if (p.key === "EE" && hasPrior(a)) qs.push(y("estonianPriorNotarial", "An earlier notarial will",
    translatedList([estonianRevival, "Do you understand what will happen to any earlier notarial will if this one expires?"], " ")));
  if (on && family) qs.push(y("ontarioLaterBirth", "Your children’s family branches",
    "Should a descendant conceived before your death and later born alive count as surviving you? A descendant conceived after your death will count only if Ontario’s statutory conditions for inheritance are met. A later-born beneficiary’s share vests once they are born alive and the applicable conditions are met."));
  if (p.key === "AU-TAS") {
    qs.push(y("tasmanianPowerOfAppointment", "What this will covers", "Can you confirm you have no general power to choose by will who receives property held under a trust, will or deed? Section 50 of Tasmania’s Wills Act includes such property in a general gift of the residue. If you hold such a power or are unsure, choose “No or unsure”."));
  }
  if (limitsAppointiveProperty(p) && hasPrior(a)) {
    qs.push(y("earlierPowerOfAppointment", "What this will covers", "If an earlier will chose who would receive property held under a trust, will or deed, revoking that will can cancel that choice. This new will leaves any power of appointment over property unused. Have you checked that this gives the result you want? If your earlier will made no such choice, choose Yes."));
  } else if (p.route === "official") {
    qs.push(y("courtPowerOfAppointment", "What this will covers", "If a trust, will or deed gives you the power to choose who receives its property, have you checked how the court form and revocation of any earlier will affect that choice? The form has no separate box for exercising that power. If you hold no such power and have never used one, choose Yes."));
  }
  return qs;
}
