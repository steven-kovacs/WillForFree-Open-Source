import { usWillGuidance } from "./us-sources.js";
import {hasPrior,alaskaOrganizationGift,transfer,canTransferPets,canGiveToOrganization} from "./planning.js";
import { sentence, wording } from "./locale.js";
import { separateRefusalPlaces, separateRefusalText, canadianGiftClause, disclaimerGiftGuide, englandWales, expressSubstitution, offersSurvival, periodClause, periodGuide, residueRefusalKey, residueRefusalText, refusalToBackup, survivalHelp } from "./survival.js";
import {appointmentPowerGuide, limitsAppointiveProperty, ownEstateClause, publisherPowerGuides, singaporeFlat, tasmanianPower, courtVenue, depositCustody, jointWillRules, estonianRevival, ontarioPartnerChange, englishPartnerChange, mainePrint, maineProperty, maineRemainder, maineSignatures, maineSpouseAmount, maineSpouseRights, maineWitnesses, territorialChildShare, procedures, texasInformalMarriage, estatePropertyGuide } from "./procedures.js";
import { formatValue, hasFamilyGift } from "./will.js";

import { item, giftCurrency, giftList, instrumentGifts, supportsGifts, needsAdvice } from "./extras.js";

function willClauses(p, a, currency, gifts) {
  const testator = a.maker + ", of " + a.town + ", " + p.label;
  const clauses = [
    [
      "Declaration",
      "I, " +
        testator +
        (jointWillRules[p.key] && hasPrior(a) ? ", declare this to be my last will. I revoke my earlier wills and codicils to the extent I am legally free to do so." : ", declare this to be my last will. I revoke every earlier will and codicil I have made."),
    ],
  ];
  if (limitsAppointiveProperty(p)) clauses.push(["What this will covers", ownEstateClause]);
  if (offersSurvival(p) && a.surviveThirty === "Yes, all apply") clauses.push(["How long a beneficiary must outlive me to inherit",periodClause]);
  if (p.country === "CA" && p.region !== "QC" && a.canadianFailedGifts === "Yes, all apply")
    clauses.push(["If a beneficiary dies too soon",canadianGiftClause]);
  if (p.country === "US" && offersSurvival(p) && a.usSubstituteGifts === "Yes, all apply") clauses.push([
    "If a beneficiary dies too soon",
    "If a named beneficiary does not survive me for the period required by this will, the gift to that person lapses. I direct that no child or other descendant of that person takes that gift in their place. The gift passes under the other provisions of this will. This does not prevent a descendant from taking a gift in their own name or inheriting under the law of intestacy.",
  ]);
  if (a.executor) {
    const role =
      p.key === "CA-QC"
        ? "liquidator"
        : p.key === "CA-ON"
          ? "estate trustee and executor"
          : "executor";
    let text = "I appoint " + a.executor + " as my " + role + ".";
    if (a.alternate !== "Leave open")
      text +=
        " If " +
        a.executor +
        " dies before me or is unable or unwilling to act or continue, I appoint " +
        a.alternate +
        " instead.";
    clauses.push([
      "Administration",
      text +
        " My representative may collect and sell estate assets, pay my enforceable debts, taxes and reasonable funeral and administration expenses, and distribute the remaining estate assets as directed below, subject to applicable law.",
    ]);
  }
  if(a.petPlan===transfer && canTransferPets(p) && a.petCarer && a.petCarer!=="Leave open") {
    const first="I give all companion animals that I own outright at my death to "+a.petCarer+" if this person survives me and is willing and able to take them.";
    const backup=a.petBackup && a.petBackup!=="Leave open" ? " Otherwise, I give them to "+a.petBackup+" if this person survives me and is willing and able to take them." : "";
    // Separate sentences allow the same translations to serve both arrangements.
    clauses.push(["Pet care",first],...(backup?[["Pet care",backup.trim()]]:[]),["Pet care","If no named carer takes my animals under these directions, they form part of the residue of my estate. No one takes the animals in a carer’s place solely because they are related to that carer."]);
  }
  if ((supportsGifts(p) || gifts.some(g=>g.organization)) && !["official","professional","planning"].includes(p.route) && !needsAdvice(a)) {
    for (const g of gifts) {
      if(g.organization){
        if(!canGiveToOrganization(p,g.type===item?"item":"cash",g.n))continue;
        clauses.push(["Separate gift "+g.n,g.type===item
          ? p.civil ? "I direct my heir to deliver the following item to "+g.recipient+" for its general purposes if I own it at my death: "+g.description+". No substitute is payable except as required by law." : "I give the following item, if it belongs to my estate at my death, to "+g.recipient+" for its general purposes: "+g.description+". No substitute is payable except as required by law."
          : p.civil ? "I direct my heir to pay "+currency+" "+g.amount+" from my estate to "+g.recipient+" for its general purposes." : "I give "+currency+" "+g.amount+" to "+g.recipient+" for its general purposes."]);
        clauses.push(["If a separate gift fails",p.key === "US-AK" ? alaskaOrganizationGift : "If the organization cannot receive the gift, it remains in the residue of my estate, subject to applicable law."]);
        continue;
      }
      if (p.civil) {
        const gift = g.type === item
          ? "deliver the following keepsake (" + g.description + ") to " + g.recipient + ". This gift takes effect only if I still own that item at my death and that person survives me"
          : "pay " + currency + " " + g.amount + " from my estate to " + g.recipient + " if they survive me";
        clauses.push(["Separate gift " + g.n, "I direct the person or persons taking my estate as heir to " + gift + ", subject to debts and rights protected by law." + (g.type===item ? " No replacement, insurance money or sale proceeds are to be provided if the item is no longer mine, except as required by law." : "") + " If that person dies before me, no substitute recipient takes this gift and it remains with the rest of my estate."]);
        continue;
      }
      clauses.push(["Separate gift " + g.n, g.type === item
        ? "If " + g.recipient + " survives me, I give them the following item if it belongs to my estate at my death: " + g.description + ". If it does not then belong to my estate, no substitute is to be paid, subject to any entitlement to proceeds protected by law. If the recipient does not survive me, the item falls into the residue of my estate."
        : "I give " + currency + " " + g.amount + " to " + g.recipient + " if they survive me. If they do not survive me, this gift falls into the residue of my estate."]);
    }
  }
  if (hasFamilyGift(a) && p.country === "GB" && gifts.some(g=>!g.organization))
    clauses.push(["If a separate gift fails","Section 33 of the Wills Act 1837 does not apply to the separate gifts above. If a named recipient does not survive me, that separate gift falls into the residue. No descendant takes that separate gift in their place."]);
  if (hasFamilyGift(a)) {
    const english = p.country === "GB";
    const childrenIncluded = english
      ? " and all my later-born or legally adopted children. In each branch the same rule applies at each generation. A person conceived before my death and later born alive is treated as surviving me."
      : " and any person who subsequently becomes my legal child. In each family branch, treat a descendant conceived before my death and later born alive as surviving me. A child or descendant conceived and born alive after my death counts as surviving me only if the conditions in section 1.1 of Ontario’s Succession Law Reform Act are met.";
    clauses.push([
      "Gifts of my remaining estate",
      (a.household === "Partner, then children"
        ? "I give the residue of my estate to my spouse or partner, " +
          a.partner +
          ", if they survive me. If they do not, I give that residue "
        : "I give the residue of my estate ") +
        "in equal shares to my children who survive me and the branches of any of my children who die before me leaving living descendants. Those descendants take their parent’s share by representation. My children include " +
        formatValue(a.children) + childrenIncluded + " If no such descendant survives me, I give the residue to " +
        a.backup +
        " if they survive me. If none of those gifts takes effect, the residue passes under the applicable law of intestacy.",
    ]);
    clauses.push([
      "Shares for beneficiaries under 18",
      (english ? "A share given to someone under 18 vests in that person at my death and is to be held separately in trust by " : "A share given to a minor alive at my death vests in that person at my death. For a qualifying descendant born later, the share vests upon live birth and satisfaction of any applicable statutory conditions. Each minor’s share is to be held separately in trust by ") +
        (english ? a.trustee + " and " + a.coTrustee + " as co-trustees" : a.trustee) +
        " until age 18. The trustee or trustees may use income and capital for that person’s care, education or benefit. Accumulate unused income. Transfer whatever remains of the share to that person at 18 or, if they die earlier, to their estate." + (english ? " Replacement trustees may be appointed in accordance with the Trustee Act 1925." : " If the named trustee cannot act, my estate trustee shall act as trustee of the share."),
    ]);
    if (a.care !== "Leave open")
      clauses.push([
        "Care of my minor children",
        english ? "I appoint " + a.care + " to be guardian of each minor child of mine for whom I have parental responsibility, when this appointment may take effect under section 5 of the Children Act 1989." : "To the extent that Ontario law permits me to make an effective appointment on my death, I appoint " +
          a.care +
          " to have decision-making responsibility for my minor children. This appointment is subject to that person’s consent, the rights of any surviving holder of decision-making responsibility and the applicable court process.",
      ]);
  } else if (p.key === "SK") {
    clauses.push(["Who inherits", "I name " + a.recipient + " as my sole heir. If this person does not inherit, my estate passes to my heirs under the law of intestacy."]);
  } else {
    const gift = p.civil
      ? "I designate " +
        a.recipient +
        " as my sole heir to the whole of the estate I am free to dispose of, subject to my separate gifts, debts, expenses and rights protected by law."
      : "I give all the residue of my estate, after payment of enforceable debts, taxes and reasonable funeral and administration expenses, to " +
        a.recipient +
        ".";
    clauses.push([
      "Who inherits",
      p.civil ? gift + " If " + a.recipient + " does not survive me, I designate " + a.backup + " instead as my sole heir on the same terms, if they survive me. If neither survives me, the remainder passes under the law of intestacy. I do not designate substitute descendants of either named heir merely because of their relationship." : gift +
        " If " +
        a.recipient +
        " does not survive me, I give that residue to " +
        a.backup +
        " if they survive me. If neither survives me, it passes under the law of intestacy.",
    ]);
  }
  if (expressSubstitution.has(p.key) && a.heirRenunciation === "Yes, all apply")
    clauses.push(["Backup beneficiary", "I appoint my substitute heir only if my first heir does not actually survive me. If my first heir survives me but renounces the inheritance, that share passes under intestacy law, subject to the other gifts in this will."]);
  if (refusalToBackup.has(p.key) && a[residueRefusalKey(p)] === "Yes, all apply")
    clauses.push(["Backup beneficiary", residueRefusalText(p)]);
  if (separateRefusalPlaces.has(p.key) && a.separateGiftRefusal === "Yes, all apply")
    clauses.push(["If a separate gift fails", separateRefusalText(p)]);
  if (p.key === "CZ" && gifts.length)
    clauses.push(["Separate gifts", "Each separate gift is subject to the heir’s right under section 1598 of the Czech Civil Code to a proportionate reduction if the legacies leave less than one quarter of the value of that heir’s inheritance free of legacies."]);
  return clauses;
}
// Render complete clauses in the selected language. All estate information is substituted
// locally after translation. Role choices and legal branches still use the original values.
export function sections(p, a, gifts = instrumentGifts(p,a)) {
  const substitutions = [];
  const token = value => {
    const index = substitutions.push(value) - 1;
    return "\uE100" + index + "\uE101";
  };
  const shadow = {...a};
  for (const key of ["maker","town","executor","alternate","recipient","backup","partner","trustee","coTrustee","care","petCarer","petBackup"]) {
    if (a[key] && a[key] !== "Leave open") shadow[key] = token(a[key]);
  }
  if (a.children) shadow.children = [token(formatValue(a.children))];
  const protectedGifts = gifts.map(gift => ({
    ...gift, recipient:token(gift.recipient),
    ...(gift.type === item ? {description:token(gift.description)} : {amount:token(gift.amount)}),
  }));
  const location = {...p, label:token(wording(p.label))};
  const clauses = willClauses(location, shadow, token(giftCurrency(p)), protectedGifts);
  function resolve(text) {
    const values = [];
    const pattern = text.replace(/\uE100(\d+)\uE101/g, (_, index) => "{"+(values.push(substitutions[index])-1)+"}");
    return values.length ? sentence(pattern, ...values) : text;
  }
  return clauses.map(([title,body]) => [
    title.startsWith("Separate gift ") ? sentence("Separate gift {0}", title.slice(14)) : title,
    resolve(body)
  ]);
}
export const ordinaryWitnesses =
  "Choose two independent adults aged 21 or over who can see, read and understand the proceedings and are mentally capable of witnessing. For this method, neither witness should be a relative of yours or of anyone who benefits, a spouse or partner of any beneficiary, a beneficiary, or someone appointed in the will. Use people who can later be found.";
const stateWitnessDirections = {
  "US-AK": "Choose two independent adults who can watch you sign and later describe what happened. Alaska allows anyone generally competent to testify to witness a will. A witness who receives a gift can still inherit it.",
  "US-AR": "Choose two independent witnesses who are at least 18, competent to testify and able to watch you sign. A beneficiary who witnesses your will can lose the part of their gift above what they would inherit without a will, unless two other qualified, disinterested witnesses also sign.",
  "US-TN": "Choose two independent witnesses who are competent to testify. Each must watch you and the other witness sign. A beneficiary who witnesses your will can lose the part of their gift above what they would inherit without a will, unless two other disinterested witnesses also sign.",
};
export const fixedSigning = "With both witnesses physically present together, personally declare this is your will, ask them to witness it, and date and sign the original in ink at the end. Each witness then signs with you and the other witness watching. Keep the original in a place your executor can find.";
const restrictedUSProperty = "If you own an interest in Indian trust or restricted land, or the federal government holds funds in trust for you, check the applicable federal and Tribal inheritance rules before using this state form. The property can be in this state and still follow different rules about who may receive it.";
export function signing(p) {
  if (p.route === "deposit") return [...procedures[p.country]];
  if (p.route === "statutory" && p.key === "US-ME") return [
    mainePrint,
    restrictedUSProperty,
    publisherPowerGuides[p.key],
    "Fill the blanks in your own handwriting or with a typewriter. Do not add, remove or change the printed words. Mark through unused sections as the form directs. You may use the sections for a spouse, children, distributions and a guardian or conservator where appropriate. Each person needs a separate will.",
    maineProperty, maineSpouseAmount, maineRemainder, maineSpouseRights,
    "Initial only one box. For choice A in section 2.4, initial A and sign after its clause. For choice C, initial C and sign after each distribution you make. Also sign wherever else the form requires your signature. Your final signature does not give effect to an unsigned provision. Check the names and your choices before signing with the witnesses.",
    maineSignatures,
    maineWitnesses,
    survivalHelp(p),
  ];
  if (p.route === "fixed") return [
    "This is a fixed blank form. Read it and decide for yourself whether it expresses your wishes. It leaves the entire residue to one named adult, then to a different backup adult. It contains no separate gifts, trust for minors or guardian nomination. If it does not express your intentions, choose a different form or make other arrangements.",
    "For a first will, a capable adult acting voluntarily for a domestic estate. Family or support claims, an existing will, a guardianship order, someone helping you sign, or property in another jurisdiction require a different assessment. Check state rules on who may inherit or serve as executor. Keep passwords, account numbers and access codes out of the form.",
    restrictedUSProperty,
    "Before the ceremony, personally complete every name and home field in ink. Name identifiable adults. The choice of executor and beneficiary is yours. Check everything. Do not sign a form with empty dispositive fields, or ask someone to select gifts for you.",
    survivalHelp(p),
    ordinaryWitnesses,
    fixedSigning,
    ...(p.key === "US-FL" ? ["Florida: check your proposed executor against Probate Code sections 733.302–304, including age, criminal disqualification and nonresident restrictions. A surviving spouse or minor child can restrict the disposition of homestead. This basic form is not designed for those cases."] : []),
    ...(p.key === "US-MN" ? ["Minnesota: consider your spouse’s statutory rights, homestead restrictions, and any children’s or dependants’ rights before selecting this form."] : []),
  ];

  if (p.route === "planning")
    return [
      "Keep these private notes for a future will. There is no will to sign in this kit.",
      "When you arrange a will, confirm the applicable law, language, document form and execution steps with a qualified local professional. Mention other countries where you have a permanent home, nationality, family interests or property.",
    ];
  if (p.route === "professional") {
    const procedures = {
      NL: "For an ordinary Dutch will, discuss a notarial deed or a qualifying privately written will deposited with a notary. Arrange the appointment before signing.",
      PT: "For a Portuguese public will the notary draws up the instrument. A closed will requires notarial approval. Ask which form, language and execution steps apply before signing anything.",
      MT: "A Maltese public will is received by a notary with the required witnesses. A secret will follows the prescribed delivery procedure through the court or a notary. Ask which procedure applies to you.",
    };
    return [
      procedures[p.country],
      "Take these notes to the appointed professional. Ask what identification, information about your family and property, and documents to bring. Have them explain how you will receive, sign and store the completed will.",
    ];
  }
  if (p.key === "CA-ON") {
    const instructions =
      p.route === "handwriting"
        ? [
            "Read the wording first. Personally write out the whole will on blank paper, including your name, declarations, gifts, appointments and all the provisions. Only your own handwriting belongs in the will. Do not sign the printed reference.",
            "Add the date and place to help identify the will. Personally sign in ink at the end, below all the dispositions. Ontario’s holograph procedure does not require any witnesses. Keep the original handwritten sheets together.",
            "For probate, someone familiar with your handwriting may be asked to identify your writing and signature in Form 74F. Tell your estate trustee where you keep the handwritten original.",
          ]
        : [
            "Print one complete copy and read every page. Check all names, gifts and appointments. Resolve anything you do not understand before signing.",
            "Choose two independent adults who can observe the signing. Use people who receive nothing under the will and whose spouses receive nothing. Ask both to be in the same room with you at the same time.",
            "With both witnesses watching, say this is your will and personally sign in ink at the end. For this ceremony, all three of you stay together until both witnesses have signed the same original, in your presence and in each other’s sight. Record the date, place and witness details. Keep every page of the signed original together.",
            "A witness can give an affidavit of execution using Ontario Form 74D. It can help your estate trustee prove the will for probate. It is separate from signing the will.",
          ];
    instructions.push(
      "A child-care appointment needs the appointee’s consent. It can take effect if you were the sole holder of decision-making responsibility immediately before it takes effect, or the holders die together or in uncertain order. Where multiple holders then made appointments, only appointees they chose in common take office. Another surviving holder keeps their rights. The appointment ends after 90 days unless the appointee applies to court within that period, when it continues until the court disposes of the application. Managing an inheritance is a separate role.",
    );
    return instructions;
  }
  if (p.route === "official")
    return [
      "Open the official PDF in a PDF reader. Read its first page and every option. Fields entered during the chat are the starting entries. Finish all applicable gifts, alternates and family details on the form. Resolve any part you do not understand before signing.",
      publisherPowerGuides[p.key],
      ...(p.region === "TX"
        ? [
            courtVenue[p.key],
            survivalHelp(p),
            texasInformalMarriage,
            "Follow the Texas court form’s directions on crossing out unused boxes. For this form’s signing ceremony, bring two eligible witnesses and a notary together in the same room. Give the notary the instructions on the last page. Nobody should sign early or leave until everyone has signed.",
          ]
        : [
            courtVenue[p.key],
            survivalHelp(p),
            "For choices requiring a signature in a box, make your choice exactly as the California form instructs. Do not change its printed words. Read the Notice to Witnesses.",
            "With both adult witnesses present, first read aloud the sentence on the California form declaring this is your will and asking them to witness. Sign in front of both. Each witness reads the declaration and signs while you and the other witness are present.",
          ]),
      "Print the official form and follow its own instructions for everyone who must attend. Leave all signature and witness fields for the signing itself. Only the official will form is to be signed.",
    ];
  if (["GB-ENG","GB-WLS"].includes(p.key)) return [
    "Read the complete printed original. Choose two independent witnesses over 18 who can see you sign. If a beneficiary or their spouse or civil partner witnesses the will, the beneficiary could lose their gift. Choose someone else. Someone named as executor can be a witness if they meet the other requirements.",
    "With both witnesses physically present together and able to see you, declare that this is your will, and personally sign it in ink intending to give it effect. Each witness signs that same original where you can see them. For this ceremony all three stay together until both have signed.",
    "Write the day, month and year of signing. Dating is essential if you appoint a guardian. Record each witness’s full name and address. Keep the original safe and tell your executor where to find it.",
  ];
  if (p.route === "handwriting")
    return [
      sentence("This kit uses the handwritten will procedure for {0}. The printed reference is not the will to sign. Read it all in a language you understand.", wording(p.name)),
      "On blank paper personally write the entire will, including your full name, the declaration and every disposition. Do not print, trace, paste in text, have another person write any part, or fill out the printed reference.",
      "In your own handwriting add the place, day, month (in words) and four-digit year. Sign your usual full signature personally at the end. Keep this handwritten original. Review the local authority linked below before making any amendments.",
      ...(p.key === "US-LA" ? [
        "Louisiana: your personally handwritten, dated and signed original is the testament. No signing witnesses or notary are needed for this method; probate ordinarily requires two credible witnesses to prove your handwriting and signature. Tell someone who knows your handwriting where the original is kept.",
        "The executor you name must qualify with the Louisiana court. In an ordinary administration, selling succession property requires court authorization. This will does not request independent administration.",
      ] : []),
      ...(p.country === "SK" ? ["Slovakia: you must personally write the exact day, month and year of SIGNING on your will. An undated will is invalid."] : []),
      ...(p.key === "CH" ? ["When you copy the identification paragraph, include your date of birth and, if applicable, your Swiss place of origin in your own handwriting. These details help identify you. Do not enter them in the chat."] : []),
    ];
  if (p.key === "US-PA")
    return [
      "Print the whole will. Check every page and resolve any question about a gift before signing.",
      "Pennsylvania’s ordinary paper will for a person who can sign their own name must be signed at the end. Write the date and personally sign on the last line. Execution witnesses are not required for this method.",
      "Keep the signed original. To prove this will at probate, two competent witnesses must give an oath or affirmation. They need not have watched you sign.",
    ];
  if (p.key === "GB-SCT")
    return [
      "Print and read the will. Scotland’s self-proving procedure uses one suitable independent witness. For this kit choose an unrelated adult aged 21 or over who receives nothing under the will.",
      "Sign each sheet, signing at the bottom of the final page while your witness watches. The witness signs the last page and records their full name, address, place and date. Review mygov.scot’s procedure before signing.",
      scottishWitnessIdentity,
    ];
  const steps = [
    "Print one complete copy, check every page and every name, and arrange an in-person signing. Use the same physical document throughout.",
    stateWitnessDirections[p.key] || ordinaryWitnesses,
    "While both witnesses are together and watching, identify this document as your will, ask them to witness it, enter the date and place, and personally sign in ink at the end. Both witnesses then sign and record their details while you and the other witness watch.",
  ];
  if (p.key === "CA-QC")
    steps.push(
      "Québec: expressly declare this document to be your will in front of both witnesses. You and both witnesses must also sign or initial every page of this computer-prepared will. A witnessed will ordinarily requires verification after death.",
      "These ordinary steps assume you can personally read the paper and make the declaration. If you cannot read the original or cannot make the spoken declaration, do not use this ceremony as written. Articles 729–730.1 of the Civil Code provide different steps, including a reading by one witness before the other for someone unable to read.",
    );
  if (p.key === "US-AR")
    steps.push(
      "Arkansas: declare to the two witnesses at signing that this instrument is your will. Both must sign at your request and in your presence.",
    );
  if (p.key === "US-NY")
    steps.push(
      "New York: declare the document to be your will and ask both witnesses to sign. Each witness should give their residential address. Complete all signatures in the same sitting.",
    );
  if (p.key === "AU-VIC")
    steps.push(
      "Victoria Legal Aid recommends that the maker and witnesses sign at the bottom of each page in the physical ceremony.",
    );
  if (p.country === "EE")
    steps.push(
      "Estonia: a domestic will expires six months after it is made if you are still living. Enter the full date, and make arrangements for a notarial will or timely re-execution.",
    );
  if (p.country === "IS")
    steps.push(
      "Iceland: complete the testamentary certificate, including the witnesses’ identification numbers, addresses, date and place, and any other relevant circumstances affecting validity, while everyone is present. Consult the official instructions before signing.",
      "The witnesses must also record the exact time the will-maker signed.",
    );
  if (
    p.country === "SE" ||
    p.country === "FI" ||
    p.country === "NO" ||
    p.country === "DK"
  )
    steps.push(
      "All participants should know this is a will. The witnesses should enter their full details, occupation, residence, and the date and place of signing and should confirm their observations on the instrument.",
    );
  if (p.country === "FI" || p.country === "SE" || p.country === "NO" || p.country === "DK") steps.push("Use independent witnesses with no family, financial, management, guardianship or representative connection to a recipient, and no interest in a gift. Neither witness should be someone whose spouse, cohabitant or close relative receives a gift.");
  if (p.country === "IS" || p.country === "NO") steps.push("Choose witnesses who do not work for anyone with a financial interest in this will, including a beneficiary or an organization receiving a gift.");
  if (p.country === "DK") steps.push("Summon both witnesses specifically to witness your will; both should sign immediately in the same sitting. They should record the exact time and place and their relationship, if any, to the maker.");
  if (p.key === "US-NY") steps.push("Both witnesses must attest within a single 30-day period; use one sitting. Record residential addresses on the original.");
  if (p.key === "US-OR") steps.push("Oregon: complete both witness signatures during your lifetime. This kit uses a physical original and the same sitting.");
  if (p.key === "US-OK") steps.push("If you are subject to a guardianship or conservatorship, including a limited one, Oklahoma requires you to sign and acknowledge the will before a district judge. The judge must attest to its execution. Contact the district court for that procedure.");
  if (p.key === "CA-NB") steps.push("For this kit choose two independent, mentally capable witnesses aged 21 or older. For signing in New Brunswick on or after December 1, 2026, the legal minimum age for witnesses is 19. A gift to a witness, their spouse or their common-law partner can fail under the new rules.");
  if (p.country === "SG")
    steps.push(
      "Singapore: CPF savings are addressed through the separate CPF nomination process. Check nominations for assets passing outside your estate.",
    );
  return steps;
}
export function originalCustody(p) {
  if(p.route==="deposit")return depositCustody[p.country];
  return "Keep the signed original together in a safe, accessible place. Tell your executor or a trusted person where it is. Keep the instructions and personal notes separately.";
}
// Marriage can revoke the selected domestic will in these editions. Exceptions
// and the effect of formalizing a partnership differ between jurisdictions.
const marriageReview = new Set(["GB-NIR","IE","NZ","SG","CA-MB","CA-NL","CA-NS","CA-NT","CA-NU","CA-PE"]);
export const scottishWitnessIdentity = "The witness must know who you are or have credible information about your identity when you sign.";
// Section numbers refer to the local Act linked in the kit. WA has a different probate-access procedure.
const inspectionSections = {ACT:"126", NSW:"54", NT:"54", QLD:"33Z", SA:"48", TAS:"63", VIC:"50"};
const deliverOnRequest = "After your death, if an interested person requests the will, whoever holds the original must promptly deliver it to someone who can submit it for probate. If the holder knows of no such person, they must deliver it to the appropriate court.";
const custodyDirections = {
  AT:"After learning of your death, anyone holding your will must send it without delay to the notary acting for the probate court (Gerichtskommissär), even if they think it was revoked or is invalid.",
  CH:"After death, anyone who holds or finds the will must deliver it without delay to the competent cantonal succession authority, even if they think it is invalid.",
  DE:"If the will is not in official custody, its holder must deliver it to the probate court (Nachlassgericht) without delay after learning of the death.",
  EE:"If you entrust the domestic will to someone, tell them to submit it promptly to a notary on learning of your death. The same duty applies to anyone else who holds it.",
  HR:"After death, anyone holding a document that could be the will must deliver it without delay to the nearest municipal court. Someone who knows you made a will and where it is must tell a municipal court.",
  PL:"After learning of your death, whoever holds the will must submit it to the succession court unless they have deposited it with a notary.",
  LU:"After death, whoever finds the handwritten will must present it to the president of the district court for the deceased’s last domicile. The court records its opening and orders deposit with a designated notary.",
  "CA-QC":"After death, search the will registers of both the Barreau du Québec and the Chambre des notaires du Québec, even if you have the original. Obtain both search certificates.",
  IS:"If heirs rely on this will to apply for private administration, they must submit the original to the District Commissioner unless that office already holds it. The Commissioner can require the applicants to show the will to people who could inherit under intestacy before deciding the application.",
  FI:"After death, a beneficiary must serve the statutory heirs with a certified copy in a verifiable way. If there are no statutory heirs, serve the Finnish State Treasury.",
  SE:"After death, give each statutory heir a certified copy unless they have approved the will. If the Swedish Inheritance Fund is the statutory heir, serve Kammarkollegiet.",
  NO:"At least one beneficiary must notify the district court of their claim in writing within six months of learning both of the death and of the will’s contents. Section 65 provides exceptions if the court or a person who would otherwise inherit that share learns of the will in time.",
  "US-AL":deliverOnRequest,
  "US-GA":"After your death, whoever holds the original will must promptly file it with the probate court responsible for your estate, even if no one plans to start probate proceedings.",
  "US-HI":deliverOnRequest,
  "US-IN":"After your death, whoever holds the original may deliver it to the court responsible for your estate. They must do so if your personal representative demands it in writing or the court orders it.",
  "US-LA":"After your death, whoever holds a document that appears to be your will must present it to the court with a petition asking that it be filed in your succession proceeding, even if they think it is invalid.",
  "US-NE":deliverOnRequest,
  "US-NM":"As soon as the person holding your original will learns of your death, they must deliver it to someone who can submit it for probate. If they know of no such person, they must deliver it to the appropriate court.",
  "US-ND":deliverOnRequest,
  "US-OK":"Within 30 days of learning of your death, whoever holds the original will must deliver it to the district court responsible for your estate or to the executor named in the will.",
  "US-TN":"Anyone who holds or finds your will must send or deliver the original to your named personal representative as soon as they learn of your death and send a photocopy to the clerk of the court that handles probate in the county where you lived. Send the original to that clerk instead if the representative or their address is unknown, no representative is named, the representative has died, is ineligible or declines to serve, or there appears to be no estate to administer.",
  "US-CA":"Unless a probate petition was filed earlier, within 30 days of learning of the death the holder must deliver the original to the proper county superior court clerk and a copy to the named executor if locatable, otherwise to a locatable named beneficiary.",
  "US-CO":"The holder must lodge the original with the probate court in the Colorado county where the maker lived or was domiciled within ten days after death, or as soon afterwards as the holder learns of the death.",
  "US-FL":"Within ten days of learning of the death, the holder must lodge the original with the proper court clerk. Give the clerk the maker’s date of death or the last four digits of their Social Security number.",
  "US-IL":"In Illinois, the person holding the will must file it with the clerk of the circuit court in the proper county immediately after the maker’s death.",
  "US-MA":"Within 30 days after notice of the death, the holder must deliver the will to a person able to secure its probate, or to the appropriate court if the holder knows of no such person.",
  "US-SC":"Within 30 days after actual notice or knowledge of the death, the holder must deliver the will to the probate judge with jurisdiction or to the named personal representative, who must deliver it to that judge.",
  "US-WI":"A holder who is not the named personal representative must deliver the will to the court or that representative within 30 days of learning of the death. Unless it is already on deposit with the court, the named representative must file it within 30 days of learning both of the death and of being named.",
  "US-WY":"Within ten days after receiving information of the death, the holder must deliver the will to the clerk of the district court with jurisdiction or to the executor named in the will.",
  "US-WA":"Within 30 days of learning of the death, the holder must deliver the original to the proper court or the named executor. An executor holding it must deliver it to the court within 40 days of learning of the death.",
};
export function estateNotice(p) {
  if (p.country === "AU" && inspectionSections[p.region])
    return sentence("After death, eligible people can ask to see or obtain a copy of the will. The holder must follow the access rules in section {0}.", inspectionSections[p.region]);
  return custodyDirections[p.key];
}
const uncertainDeaths = {
  "GB-SCT": "If it is uncertain whether your first beneficiary outlived you, section 9 of the Succession (Scotland) Act 2016 treats them as having failed to survive you for this gift. The backup inherits if they survive you.",
  "GB-NIR": "If there is no proof that your first beneficiary outlived you, their estate cannot claim merely because they were younger. A surviving backup can take the residue under this will. If the order of death of you and your first executor is uncertain, article 30 gives effect to an appointment of a substitute executor that applies on the first executor’s earlier death.",
  IE: "If the order of your death and a beneficiary’s death cannot be established, Irish law treats the deaths as simultaneous. Under this will the surviving backup can take the residue. Where two joint tenants die simultaneously or are deemed to do so, section 5 treats them as having held equal shares as tenants in common immediately before death.",
  NZ: "If you and your first beneficiary die together, or there is reasonable doubt about who survived, apply this will to your estate as if you survived them. Your surviving backup can inherit. Section 3 of the Simultaneous Deaths Act 1958 has separate rules for other property, including joint property.",
  SG: "If it is uncertain who died first, section 30 of the Civil Law Act generally treats the younger person as having survived the older for property purposes, subject to a court order. If the younger person is your first beneficiary, the residue can pass to their estate instead of your backup.",
};
export function after(p, a = {}) {
  const notice = estateNotice(p);
  return [
    ...(offersSurvival(p) ? [periodGuide] : []),
    ...(p.key === "EE" ? [estonianRevival] : []),
    ...(a.household === "Partner, then children" && p.parentPlan ? [p.key === "CA-ON" ? ontarioPartnerChange : englishPartnerChange] : []),
    ...[usWillGuidance[p.key]?.familyChange, usWillGuidance[p.key]?.afterDeath].filter(Boolean),
    ...(p.country === "US" && offersSurvival(p) ? ["If a named beneficiary dies too soon, their children and other descendants do not replace them for that gift. A descendant may still inherit through a gift made in their own name or under intestacy law."] : []),
    ...(p.country === "US" && refusalToBackup.has(p.key) ? ["If your first beneficiary validly refuses part or all of the residue, your backup takes the refused share if they meet the 30-day condition. Any share the backup also refuses or fails to qualify for passes under intestacy law. If your will makes a separate gift to a person, only the part they validly refuse goes into the residue."] : []),
    ...(p.key === "NZ" ? ["Reconsider this will if a parent or partner may be entitled to family provision or if someone was promised an inheritance in return for services."] : []),
    ...(p.route === "official"
      ? [
          "Keep a copy of the court PDF you complete. A new visit creates a fresh form, so keep any entries you make after downloading.",
        ]
      : []),
    ...(limitsAppointiveProperty(p) ? [p.key === "AU-TAS" ? tasmanianPower : appointmentPowerGuide] : []),
    ...(p.key === "SG" ? [singaporeFlat] : []),
    ...(p.key === "DK" ? ["The central wills register does not receive a copy of this privately witnessed will. Tell someone where to find the original for the probate court. If the will is challenged, the person relying on it must establish valid execution. The signed witness statement is evidence of the section 64(1) ceremony unless there is a special reason to doubt it."] : []),
    originalCustody(p),
    ...[estatePropertyGuide(p), uncertainDeaths[p.key]].filter(Boolean),
    ...(p.key === "CA-ON" && hasFamilyGift(a) ? ["A descendant conceived before you die and later born alive can take their family share. For a child conceived after your death, section 1.1 requires your surviving spouse’s written notice to the Estate Registrar for Ontario within six months, a live birth by the third anniversary of death unless the Superior Court extends the time, and a court declaration of parentage under section 12 of the Children’s Law Reform Act. Tell your estate trustee promptly if this may apply before distributing the estate."] : []),
    ...(p.key === "CZ" && giftList(a).length ? ["If the estate shrinks, the heir can ask to reduce the separate gifts proportionately to preserve one quarter of the value of their inheritance free of legacies. Under section 1633, if no heir takes under the will or by statutory succession, legatees can themselves become heirs in proportion to the value of their legacies."] : []),
    ...(p.key === "CA-QC" || p.key === "PL" ? ["The first heir takes or renounces the entire inheritance offered to them as residuary heir under this will. Renunciation passes it to the surviving backup. A separate entitlement that local law allows the beneficiary to accept independently has its own rules."] : []),
    ...(notice ? [notice] : []),
    ...(territorialChildShare[p.key] ? [territorialChildShare[p.key]] : []),
    ...(p.key === "CA-NB" ? ["If you made your will and then married before December 1, 2026, your estate can pass under intestacy law. Former sections 15.1 and 16 provide exceptions and a court remedy. Marriage on or after that date alone leaves your will in place. Under section 15.02, divorce, annulment, qualifying separation or the end of a common-law relationship can cancel gifts and appointments for that person."] : []),
    ...(p.key === "CA-YT" ? ["For a new Yukon will made now, a later marriage alone does not revoke it. Review your gifts and appointments if a relationship changes. Different rules can apply to a will made before May 1, 2021."] : []),
    ...(englandWales(p) ? [disclaimerGiftGuide,"This will has no minimum survival period. If the order of two deaths cannot be established, the younger person is generally presumed to have survived the older for property purposes, subject to a court order. If a beneficiary takes a gift and dies shortly afterwards, it passes through their estate. Intestacy has its own rules."] : []),
    ...(p.country === "AU" || marriageReview.has(p.key) ? ["If you plan to marry or formalize a partnership, review this will before the ceremony. Marriage can revoke it under local law."] : []),
    ...(["GB-ENG","GB-WLS"].includes(p.key) ? ["Revisit your will before marrying or forming a civil partnership. Those events normally revoke an existing will in England and Wales, with limited exceptions."] : []),
    ...(["GB-ENG","GB-WLS"].includes(p.key) ? ["If you appointed a guardian, the appointment normally takes effect only when no parent with parental responsibility survives under the circumstances covered here. A trustee manages the inheritance separately."] : []),
    ...(p.key === "CA-ON" ? ["A married surviving spouse can have an equalization election. A common-law partner can take an express gift but does not inherit automatically on Ontario intestacy. A dependant may have a support claim."] : []),
    ...(p.key === "EE" ? ["If you are still alive, this domestic will expires six months after it is made. Record the date. Make a new will in time with the required formalities, or arrange a notarial will. Keeping this download does not extend that period."] : []),
    ...(p.key === "BE" ? ["Belgium: after your death, the person holding your handwritten will must present the original to a notary before its provisions are carried out. Tell a trusted person where the original is kept."] : []),
    ...(p.key === "CA-QC"
      ? [
          "A witnessed or holograph will in Québec normally requires verification by a notary or court after death. Tell your liquidator where to find the original.",
        ]
      : []),
    "Check beneficiary nominations and jointly owned assets with the relevant institution. Keep account credentials outside the will.",
    ...(p.key === "US-AK" ? ["Check the title to any Alaska vehicle or boat. If it names a transfer-on-death beneficiary, signing this will does not change that designation. To change the beneficiary on the title, apply to the Alaska Division of Motor Vehicles."] : []),
    ...(p.key === "US-AK" ? ["For inalienable Alaska Native corporation stock, the issuing corporation or its agent determines who receives the shares outside probate. An effective stock certificate designation or separate stock will can govern despite this will’s general revocation and residue clauses. Without an effective stock designation, the shares pass by will or intestacy. Contact the issuing corporation to check or change your stock disposition."] : []),
    ...(p.key === "US-HI" ? ["A surviving registered reciprocal beneficiary, including a relative, may elect a statutory share of your estate. Revisit the will if you enter or end a registered reciprocal beneficiary relationship.", "A will does not designate a successor to a Hawaiian Home Lands homestead lease. File your choice of an eligible successor with the Department of Hawaiian Home Lands and obtain its approval before your death. If there is no effective designation, the Department applies the succession rules in section 209 of the Hawaiian Homes Commission Act."] : []),
    "After a move, marriage, separation, birth, adoption, death or change of beneficiary, reconsider the whole plan under the law that then applies. Do not hand-edit a signed will. Completing this chat again produces a new unsigned document.",
    ...(usWillGuidance[p.key]?.replacement ? [usWillGuidance[p.key].replacement] : []),
    ...(p.route === "handwriting"
      ? [
          "Keep the handwritten original. A downloaded copy is the text you used, not a substitute for the original.",
        ]
      : []),
    ["fixed","statutory"].includes(p.route) ? "Keep an unfilled copy for later. Handwritten entries are yours alone: this kit does not save or reconstruct them." : "Store your downloaded PDFs somewhere private. Your answers PDF is a personal record. Follow the signing steps for the will itself.",
  ];
}
