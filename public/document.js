import { sentence, wording } from "./locale.js";
import { canadianGiftClause, offersSurvival, periodClause, periodGuide, survivalHelp } from "./survival.js";
import { courtVenue, procedures } from "./procedures.js";
import { formatValue, hasFamilyGift } from "./will.js";

import { item, giftCurrency, giftList, supportsGifts, needsAdvice } from "./extras.js";

function willClauses(p, a, currency) {
  const testator = a.maker + ", of " + a.town + ", " + p.label;
  const clauses = [
    [
      "Declaration",
      "I, " +
        testator +
        ", declare this to be my last will. I revoke every earlier will and codicil I have made.",
    ],
  ];
  if (offersSurvival(p) && a.surviveThirty === "Yes, all apply") clauses.push(["Survival period for gifts",periodClause]);
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
        " My representative may collect and sell estate assets, pay my enforceable debts, taxes and reasonable funeral and administration expenses, and distribute the balance as directed below, subject to applicable law.",
    ]);
  }
  if (supportsGifts(p) && !["official","professional","planning"].includes(p.route) && !needsAdvice(a)) {
    for (const g of giftList(a)) {
      if (p.civil) {
        const what = g.type === item ? "deliver my specifically identified keepsake (" + g.description + "), only if I still own that item at my death" : "pay " + currency + " " + g.amount + " from my estate";
        clauses.push(["Separate gift " + g.n, "I direct the person or persons taking my estate as heir to " + what + " to " + g.recipient + " if they survive me, subject to debts and rights protected by law." + (g.type===item ? " No replacement, insurance money or sale proceeds are to be provided if the item is no longer mine, except as required by law." : "") + " If that person dies before me, no substitute recipient takes this gift and it remains with the rest of my estate."]);
        continue;
      }
      clauses.push(["Separate gift " + g.n, g.type === item
        ? "If " + g.recipient + " survives me, I give them the following item if it belongs to my estate at my death: " + g.description + ". If it does not then belong to my estate, no substitute is to be paid, subject to any entitlement to proceeds protected by law. If the recipient does not survive me, the item falls into the residue of my estate."
        : "I give " + currency + " " + g.amount + " to " + g.recipient + " if they survive me. If they do not survive me, this gift falls into the residue of my estate."]);
    }
  }
  if (hasFamilyGift(a) && p.country === "GB" && giftList(a).length)
    clauses.push(["If a separate gift fails","Section 33 of the Wills Act 1837 does not apply to the separate gifts above. If a named recipient does not survive me, that separate gift falls into the residue. No descendant takes that separate gift in their place."]);
  if (hasFamilyGift(a)) {
    const english = p.country === "GB";
    clauses.push([
      "Gifts of my remaining estate",
      (a.household === "Partner, then children"
        ? "I give the residue of my estate to my spouse or partner, " +
          a.partner +
          ", if they survive me. If they do not, I give that residue "
        : "I give the residue of my estate ") +
        "in equal shares to my children who survive me and the branches of any of my children who die before me leaving living descendants. Those descendants take their parent’s share by representation. My children include " +
        formatValue(a.children) + (english ? " and all my later-born or legally adopted children. In each branch the same rule applies at each generation. A person conceived before my death and later born alive is treated as surviving me." : " and any person who subsequently becomes my legal child, including a child recognized by Ontario law as my child after my death.") + " If no such descendant survives me, I give the residue to " +
        a.backup +
        " if they survive me. If none of those gifts takes effect, the residue passes under the applicable law of intestacy.",
    ]);
    clauses.push([
      "Shares for children under 18",
      "A share given to someone under 18 vests in that person at my death and is to be held separately in trust by " +
        (english ? a.trustee + " and " + a.coTrustee + " as co-trustees" : a.trustee) +
        " until age 18. The trustee or trustees may use income and capital for that person’s care, education or benefit. Accumulate unused income. Pay the balance to that person at 18 or, if they die earlier, to their estate." + (english ? " Replacement trustees may be appointed in accordance with the Trustee Act 1925." : " If the named trustee cannot act, my estate trustee shall act as trustee of the share."),
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
        " does not survive me, I give that estate to " +
        a.backup +
        " if they survive me. If neither survives me, it passes under the law of intestacy.",
    ]);
  }
  return clauses;
}
// Render complete clauses in the selected language. All estate information is substituted
// locally after translation. Role choices and legal branches still use the original values.
export function sections(p, a) {
  const substitutions = [];
  const token = value => {
    const index = substitutions.push(value) - 1;
    return "\uE100" + index + "\uE101";
  };
  const shadow = {...a};
  for (const key of ["maker","town","executor","alternate","recipient","backup","partner","trustee","coTrustee","care"]) {
    if (a[key] && a[key] !== "Leave open") shadow[key] = token(a[key]);
  }
  if (a.children) shadow.children = [token(formatValue(a.children))];
  for (const key of Object.keys(a)) {
    if (/^extra(?:Item|Amount|Recipient)\d*$/.test(key) && a[key]) shadow[key] = token(a[key]);
  }
  const location = {...p, label:token(wording(p.label))};
  const clauses = willClauses(location, shadow, token(giftCurrency(p)));
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
export function signing(p) {
  if (p.route === "deposit") return [...procedures[p.country]];
  if (p.route === "statutory" && p.key === "US-ME") return [
    "The enclosed publication contains Maine Revised Statutes Title 18-C section 2-517 and the complete Maine Statutory Will. Print all five pages. Read the notices and the full form; choose it only if its provisions express your wishes. The text and republication notice are unchanged from the Revisor of Statutes.",
    "Fill the blanks in your own handwriting or with a typewriter. Do not add, remove or change the printed words. Mark through unused sections as the form directs. You may use the sections for a spouse, children, distributions and a guardian or conservator where appropriate. Each person needs a separate will.",
    "In section 2.4, write your initials in one box only (A, B or C). For A or B, sign after the clause you chose. For C, sign after each distribution you make. Also sign wherever else the form requires your signature. Your final signature does not give effect to an unsigned provision. Check the names and your choices before signing with the witnesses.",
    "Personally execute the form in the presence of two independent witnesses. Have them sign its witness declaration during the same sitting while you and both witnesses are present. The optional self-proving acknowledgment must be completed before an officer authorized to take acknowledgments; leave it for that ceremony. A notary is not a substitute for either signing witness.",
    survivalHelp(p),
  ];
  if (p.route === "fixed") return [
    "This is a fixed blank form. Read it and decide for yourself whether it expresses your wishes. It leaves the entire residue to one named adult, then to a different backup adult. It contains no separate gifts, trust for minors or guardian nomination. If it does not express your intentions, choose a different form or make other arrangements.",
    "For a first will, a capable adult acting voluntarily for a domestic estate. Family or support claims, an existing will, a guardianship order, someone helping you sign, or property in another jurisdiction require a different assessment. Check state rules on who may inherit or serve as executor. Keep passwords, account numbers and access codes out of the form.",
    "Before the ceremony, personally complete every name and home field in ink. Name identifiable adults. The choice of executor and beneficiary is yours. Check everything. Do not sign a form with empty dispositive fields, or ask someone to select gifts for you.",
    survivalHelp(p),
    ordinaryWitnesses,
    "With both witnesses physically present together, personally declare this is your will, ask them to witness it, and date and sign the original in ink at the end. Each witness then signs with you and the other witness watching. Keep the original in a place your executor can find.",
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
      ...(p.region === "TX"
        ? [
            courtVenue[p.key],
            survivalHelp(p),
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
    ];
  const steps = [
    "Print one complete copy, check every page and every name, and arrange an in-person signing. Use the same physical document throughout.",
    ordinaryWitnesses,
    "While both witnesses are together and watching, identify this document as your will, ask them to witness it, enter the date and place, and personally sign in ink at the end. Both witnesses then sign and record their details while you and the other witness watch.",
  ];
  if (p.key === "CA-QC")
    steps.push(
      "Québec: expressly declare this document to be your will in front of both witnesses. You and both witnesses must also sign or initial every page of this computer-prepared will. A witnessed will ordinarily requires verification after death.",
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
  if (p.key === "CA-NB") steps.push("New Brunswick: complete the personal signing and use two capable, independent witnesses aged 21 or over for this ceremony. The Wills Act changes on December 1, 2026; the two witnesses must then be of the age of majority and mentally capable. Avoid witnesses or their spouses or common-law partners benefiting under the will.");
  if (p.country === "SG")
    steps.push(
      "Singapore: CPF savings are addressed through the separate CPF nomination process. Check nominations for assets passing outside your estate.",
    );
  return steps;
}
export function originalCustody(p) {
  if(p.route==="deposit")return p.country==="PT"
    ? "Follow the notary’s custody arrangements. Keep the certificate with your records and tell a trusted person where the original can be found."
    : "Keep the receipt or custody deed; tell a trusted person where the deposited original is held. Keep these instructions separately.";
  return "Keep the signed original together in a safe, accessible place. Tell your executor or a trusted person where it is. Keep the instructions and personal notes separately.";
}
// Marriage can revoke the selected domestic will in these editions. Exceptions
// and the effect of formalizing a partnership differ between jurisdictions.
const marriageReview = new Set(["GB-NIR","IE","NZ","SG","CA-MB","CA-NL","CA-NS","CA-NT","CA-NU","CA-PE"]);
const custodyDirections = {
  "US-CA":"Unless a probate petition was filed earlier, within 30 days of learning of the death the holder must deliver the original to the proper county superior court clerk and a copy to the named executor if locatable, otherwise to a locatable named beneficiary.",
  "US-CO":"The holder must lodge the original with the probate court in the Colorado county where the maker lived or was domiciled within ten days after death, or as soon afterwards as the holder learns of the death.",
  "US-FL":"Within ten days of learning of the death, the holder must lodge the original with the proper court clerk. Give the clerk the maker’s date of death or the last four digits of their Social Security number.",
  "US-WA":"Within 30 days of learning of the death, the holder must deliver the original to the proper court or the named executor. An executor holding it must deliver it to the court within 40 days of learning of the death.",
};
export function after(p) {
  return [
    ...(offersSurvival(p) ? [periodGuide] : []),
    ...(p.country === "US" && offersSurvival(p) ? ["If a named beneficiary dies too soon, their children and other descendants do not replace them for that gift. A descendant may still inherit through a gift made in their own name or under intestacy law."] : []),
    ...(p.key === "NZ" ? ["Reconsider this will if a parent or partner may be entitled to family provision or if someone was promised an inheritance in return for services."] : []),
    ...(p.route === "official"
      ? [
          "Keep a copy of the court PDF you complete. A new visit creates a fresh form, so keep any entries you make after downloading.",
        ]
      : []),
    originalCustody(p),
    ...(custodyDirections[p.key] ? [custodyDirections[p.key]] : []),
    ...(p.country === "AU" || marriageReview.has(p.key) ? ["If you plan to marry or formalize a partnership, review this will before the ceremony. Marriage can revoke it under local law."] : []),
    ...(["GB-ENG","GB-WLS"].includes(p.key) ? ["Revisit your will before marrying or forming a civil partnership. Those events normally revoke an existing will in England and Wales, with limited exceptions."] : []),
    ...(["GB-ENG","GB-WLS"].includes(p.key) ? ["If you appointed a guardian, the appointment normally takes effect only when no parent with parental responsibility survives under the circumstances covered here. A trustee manages the inheritance separately."] : []),
    ...(p.key === "CA-ON" ? ["A married surviving spouse can have an equalization election. A common-law partner can take an express gift but does not inherit automatically on Ontario intestacy. A dependant may have a support claim."] : []),
    ...(p.key === "EE" ? ["If you are still alive, this domestic will expires six months after it is made. Record the date. Arrange a timely new execution or a notarial will. Keeping this download does not extend that period."] : []),
    ...(p.key === "BE" ? ["Belgium: after your death, the person holding your handwritten will must present the original to a notary before its provisions are carried out. Tell a trusted person where the original is kept."] : []),
    ...(p.key === "CA-QC"
      ? [
          "A witnessed or holograph will in Québec normally requires verification by a notary or court after death. Tell your liquidator where to find the original.",
        ]
      : []),
    "Check beneficiary nominations and jointly owned assets with the relevant institution. Keep account credentials outside the will.",
    "After a move, marriage, separation, birth, adoption, death or change of beneficiary, reconsider the whole plan under the law that then applies. Do not hand-edit a signed will. Completing this chat again produces a new unsigned document.",
    ...(p.route === "handwriting"
      ? [
          "Keep the handwritten original. A downloaded copy is the text you used, not a substitute for the original.",
        ]
      : []),
    ["fixed","statutory"].includes(p.route) ? "Keep an unfilled copy for later. Handwritten entries are yours alone: this kit does not save or reconstruct them." : "Store your downloaded PDFs somewhere private. Your answers PDF is a personal record. Follow the signing steps for the will itself.",
  ];
}
