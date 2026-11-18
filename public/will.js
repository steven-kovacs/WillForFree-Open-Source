import {earlierQuestions, careQuestions, organizationQuestions, skipped, deferred, orgAdvice} from "./planning.js";
import {localWordingIssue} from "./local-wording.js";
import {looksLikeQuestion,localControl} from "./help-language.js";
import { currentLanguage, parseWholeAmount, display, sentence, translatedList, wording } from "./locale.js";
import { partnerResidue, refusalToBackup, residueRefusalKey, survivalHelp, texasResidueChoices } from "./survival.js";
import { noBusiness, ownsBusiness, soleHeirBusiness } from "./business.js";
import { currentChecks } from "./suitability.js";
import { maineChoicePrompt, maineEarlierChoice, mainePaperChoices } from "./procedures.js";
import { printableName } from "./characters.js";
import { ordinaryGifts, giftCurrency, confirmCash, giftIdentity, extraQuestions, needsAdvice, giftList, itemIdentity, itemOwnershipIssue, doneGifts, finishNotes, bespoke, differentTerms, noExtra, item, cash, adviceOption, correctCash, cancelAdvice } from "./extras.js";
import { hasSensitive } from "./flow.js";
import { profile, validPlace, copyByHand } from "./markets.js";

const yes = ["Yes, all apply", "No or unsure"];
const options = (id, label, prompt, values) => ({ id, label, prompt, values });
const name = (id, label, prompt, optional = false) => ({
  id,
  label,
  prompt,
  kind: "name",
  optional,
  values: optional ? ["Leave open"] : [],
});
const familyYes = "I have children or grandchildren";
const texasAlternateCapacityError = "The bilingual Texas form has room for eight alternate beneficiaries. Your names have been kept. Choose English for ten spaces, or review your list.";
const check = (id, label, prompt) => options(id, label, prompt, yes);
const relativeChecks =
  "I have no spouse or partner, descendants of any generation, living parents or other surviving ancestors, dependants or outstanding family support obligations. My property and permanent home are here.";
export function hasFamilyGift(answers) {
  return ["Partner, then children", "Children first"].includes(
    answers.household,
  );
}
export function questions(p, answers = {}) {
  const list = baseQuestions(p, answers);
  if (p.legacy && !["professional", "planning"].includes(p.route)) {
    // A previous affirmative belongs to the prompt the user actually saw. Read back all current eligibility and fit statements.
    const assertions = list
      .filter((q) => q.values === yes && q.id !== "legacyConsent")
      .map((q) => q.prompt);
    list.push(
      check(
        "legacyConsent",
        "Updated interview",
        sentence("This file comes from an earlier interview. Confirm each current statement again before using your saved choices. {0}", wording(assertions.join(" "))),
      ),
    );
  }
  const blank=["fixed","statutory"].includes(p.route);
  const wishes=[...careQuestions(p,answers),...(blank?[]:extraQuestions(p,answers)),...organizationQuestions(p,answers,ordinaryGifts(answers),giftCurrency(p),confirmCash,giftIdentity)];
  if (blank) {
    const planningQuestions = [...earlierQuestions(answers), ...wishes];
    if (p.key === "US-ME" && p.route === "statutory") {
      const choices = [...mainePaperChoices];
      if (answers.mainePaperChoice === maineEarlierChoice) choices.push(maineEarlierChoice);
      choices.push("No or unsure");
      planningQuestions.unshift({
        ...options("mainePaperChoice", "Maine statutory family will", maineChoicePrompt, choices),
        planStep: true,
      });
    }
    return planningQuestions;
  }
  // These end-of-interview checks do not select other questions. An earlier
  // saved interview can keep later answers, but no kit may skip a new check.
  const confirmations = currentChecks(p, answers, check).map(q=>({...q,supplementalCheck:true}));
  return [...earlierQuestions(answers), ...list, ...wishes, ...(needsAdvice(answers) ? confirmations.filter(q => Object.hasOwn(answers,q.id)) : confirmations)];
}
function baseQuestions(p, answers) {
  if (["fixed","statutory"].includes(p.route)) return [];
  if (p.route === "professional" || p.route === "planning") {
    const appointment = p.route === "professional";
    return [
      check(
        "appointment",
        "Your download",
        appointment
          ? "This kit contains notes for your local will appointment. Your will is completed through the local procedure. Would you like to prepare those notes?"
          : "This location has a planning kit. It records your wishes for a future will. There is no will to sign in this kit. Would you like to prepare your notes?",
      ),
      {
        id: "maker",
        label: "Your name",
        kind: "noteName",
        values: [],
        prompt:
          "What name would you like on your private notes? You can use your own script.",
      },
      {
        id: "wishes",
        label: "What matters to you",
        kind: "notes",
        values: [],
        prompt:
          "What would you like to arrange or ask about? You can describe beneficiaries, family, property or anything you want to remember. Leave out passwords and account numbers.",
      },
    ];
  }
  const list = [
    check(
      "eligible",
      "Making this will",
      translatedList(["Are you making this will for yourself?",sentence("Is {0} your permanent home, and are you at least {1}?",wording(p.name),p.minimum),"You understand what you own and who depends on you. You can read and understand the whole will in the language in which you will sign it, and you can sign it yourself."]," "),
    ),
    options("businessOwnership", "Business ownership", "Do you own all or part of a business?", [noBusiness, ownsBusiness, "I’m unsure"]),
    ...(answers.businessOwnership === ownsBusiness ? [
      check("businessTransfer", "What can pass through your estate",
        "Have you checked who owns the business assets and what can pass through your estate, including any sale proceeds, under local rules and any business agreements?"),
      check("businessWishes", "Who inherits your business interest",
        p.key === "SK" && !p.legacySlovakBackup ? soleHeirBusiness : "Do you want whatever your estate receives from the business to follow the same beneficiaries, shares and backup choices as the rest of your estate, with no separate business will, gift or management instruction?"),
    ] : []),
    check(
      "estateScope",
      "Estate",
      translatedList([sentence("Do you own any assets outside {0}?",wording(p.name)),"There is an agreement with someone else about who inherits.","There’s a disagreement about who you must support.","A gift could affect someone’s benefits, or someone else needs to sign for you."]," "),
    ),
  ];
  if (p.country === "CA")
    list.push(
      check(
        "localLaw",
        "Applicable law",
        "Does ordinary provincial or territorial law apply to your estate? Choose “No or unsure” if your estate may include property on a First Nations reserve or fall under a different legal system.",
      ),
    );
  if (p.country === "SG")
    list.push(
      check(
        "localLaw",
        "Applicable law",
        "Is this a non-Muslim estate dealt with under Singapore civil law, with CPF nominations addressed separately?",
      ),
    );
  if (p.country === "US")
    list.push(
      check(
        "localLaw",
        "Applicable law",
        "Will ordinary state law govern all the property covered here, with no land held in trust by the United States for a Tribe or an individual Native American and no other special inheritance rules?",
      ),
    );
  if (p.route === "official") {
    if (p.region === "TX") {
      list.push(
        options("marriage", "Marital status", "Which describes you today?", [
          "Married, spouse living",
          "Single, widowed or divorced",
          "None of these",
        ]),
      );
      list.push(
        options(
          "descendants",
          "Children or grandchildren",
          "Do you have children or grandchildren? Include adopted children and grandchildren through a child who died. If your only living descendants are great-grandchildren or a later generation, choose “I’m not sure”.",
          [familyYes, "No children or grandchildren", "I’m unsure"],
        ),
      );
      const married = answers.marriage === "Married, spouse living",
        children = answers.descendants === familyYes;
      if (married || children) {
        const target =
          married && children
            ? "your spouse, children or grandchildren"
            : married
              ? "your spouse"
              : "your children or grandchildren";
        list.push(
          check(
            "giftFit",
            "Court form fit",
            sentence("The court designed this form for people who want their property and money to go to {0}. Is that what you want? The court form itself sets out the available choices.", wording(target)),
          ),
        );
      }
    }
    list.push(
      name(
        "maker",
        "Your legal name",
        "What is your full legal name, exactly as you want it on the court form?",
      ),
      name(
        "executor",
        "First choice of executor",
        "Who is your first choice of executor? Enter their full legal name.",
      ),
      name(
        "alternate",
        "Backup executor",
        "Who is your backup executor? You may leave this blank.",
        true,
      ),
    );
    if (p.region === "TX" && answers.marriage === "Married, spouse living")
      list.push(
        name(
          "spouse",
          "Spouse",
          "What is your living spouse’s full legal name?",
        ),
      );
    if (
      p.region === "TX" &&
      answers.marriage === "Single, widowed or divorced" &&
      answers.descendants === "No children or grandchildren"
    )
      list.push(
        name(
          "recipient",
          "First residue beneficiary",
          "Who is the first person you want to name in section 2, which divides the residue equally among the listed survivors? You can name further beneficiaries in the chat.",
        ),
      );
    if (p.key === "US-CA") {
      list.push(
        options(
          "caBalance",
          "Balance of your estate",
          "Which paragraph 5 choice should receive the balance of your estate? You must sign exactly one corresponding box on the printed will.",
          [
            "1 · Registered spouse or partner, then descendants",
            "2 · Descendants only",
            "3 · One named person",
            "4 · Two to four named people",
          ],
        ),
      );
      if (answers.caBalance?.startsWith("3"))
        list.push(
          name(
            "oneAdult",
            "Residue beneficiary",
            "What is the full name of the person for paragraph 5, choice three?",
          ),
        );
      if (answers.caBalance?.startsWith("4"))
        list.push({
          id: "multiple",
          label: "People sharing the residue",
          prompt:
            "Who should share equally? Enter two to four distinct full names, separated by commas.",
          kind: "names",
          min: 2,
          max: 4,
          values: [],
        });
      if (answers.caBalance?.startsWith("1"))
        list.push(
          check(
            "caRegistered",
            "Registered relationship",
            "Is this your spouse or a domestic partner registered with the California Secretary of State?",
          ),
        );
      if (answers.caBalance?.startsWith("2"))
        list.push(
          check(
            "caDescendants",
            "Descendants",
            "Do you have descendants whom you intend this choice to benefit?",
          ),
        );
      list.push(
        name(
          "familyGuardian",
          "Guardian for minor children",
          "If you have a minor child, whom would you nominate if no parent is living? Enter their full name or leave open.",
          true,
        ),
        name(
          "custodian",
          "Custodian for younger beneficiaries",
          "Do you want to name a custodian under paragraph 7? Enter their full name, or leave this open.",
          true,
        ),
      );
      if (answers.custodian && answers.custodian !== "Leave open")
        list.push(
          options(
            "custodyAge",
            "Age to receive property",
            "At what age, from 18 to 25, should the recipient receive the property?",
            Array.from({ length: 8 }, (_, i) => String(i + 18)),
          ),
        );
    }
    if (p.key === "US-TX" && answers.descendants === familyYes) {
      list.push(
        options(
          "txLiving",
          "Identifying descendants",
          "Are all of your children living, and do you have one to seven living children?",
          [
            "Yes, list them now",
            "I will complete the descendant details on the court form",
          ],
        ),
      );
      if (answers.txLiving === "Yes, list them now")
        list.push({
          id: "formChildren",
          label: "Living children",
          kind: "names",
          max: 7,
          values: [],
          prompt:
            "Enter each living child’s full name, separated by commas. Include children born to or adopted by you.",
        });
      list.push(
        name(
          "familyGuardian",
          "Guardian nomination",
          "Who would you choose to look after your children if a guardian is needed?",
          true,
        ),
      );
    }
    list.push(
      check(
        "formFinish",
        "Completing the form",
        "Will you read the complete court form and follow its signing instructions? You can make your remaining simple choices in this chat or explicitly choose to finish optional provisions in the PDF.",
      ),
    );
    if (p.key === "US-CA") {
      list.push(
        options(
          "caExtras",
          "Specific gifts",
          "For now, should your residence, personal effects and cash follow the balance in paragraph 5, or will you fill other gift boxes yourself? Later, you can add up to five cash gifts in this chat.",
          [
            "Use my balance choice for everything",
            "I will add specific gifts in the court PDF",
          ],
        ),
        options(
          "caBond",
          "Executor bond",
          "Paragraph 9 lets you sign a box to waive an executor’s bond. Which instruction should your signing checklist include?",
          ["Leave the bond box unsigned", "Sign the box to waive bond"],
        ),
      );
    } else {
      list.push(
        name(
          "alsoKnown",
          "Other legal name",
          "What other name, if any, do you regularly use? Choose Leave open if you do not use one.",
          true,
        ),
      );
      if (
        answers.marriage === "Married, spouse living" &&
        answers.descendants === "No children or grandchildren"
      ) {
        const bilingual = currentLanguage() === "es";
        list.push({
          id: "txAlternates",
          kind: "names",
          max: bilingual ? 8 : 10,
          label: "Who inherits as a backup",
          prompt: sentence("If your spouse does not live 30 days after you, who should share the residue equally? Enter up to {0} full names.", bilingual ? 8 : 10),
          values: [],
        });
      }
      if (answers.recipient) {
        list.push(
          options(
            "txAdditional",
            "Other residue beneficiaries",
            "Should anyone share the residue equally with the person you named?",
            ["Only the person I named", "Add more names"],
          ),
        );
        if (answers.txAdditional === "Add more names")
          list.push({
            id: "txOthers",
            kind: "names",
            max: 7,
            label: "Additional residue beneficiaries",
            prompt:
              "Give up to seven other full names, separated by commas. The surviving people listed share equally.",
            values: [],
          });
      }
      if (
        answers.marriage === "Married, spouse living" &&
        answers.descendants === familyYes
      )
        list.push(
          options(
            "txChoice",
            "Residue instruction to sign",
            texasResidueChoices,
            ["Choice 1 · Spouse first", "Choice 2 · Children first"],
          ),
        );
      list.push(
        options(
          "txSpecific",
          "Specific gifts",
          "For now, should section 2 cover everything, or do you want to fill additional section 3 gift boxes yourself? Later, you can add up to eight gifts in this chat.",
          [
            "Use section 2 for everything",
            "I will enter separate gifts in the court PDF",
          ],
        ),
      );
    }
    return list;
  }
  if (p.parentPlan) {
    const english = p.country === "GB";
    list.push(
      options(
        "household",
        "Family plan",
        "Who should inherit what remains? For children, this plan uses equal family shares and holds a minor’s share to 18.",
        [
          "One adult beneficiary",
          "Partner, then children",
          "Children first",
          "Another situation",
        ],
      ),
    );
    if (hasFamilyGift(answers)) {
      const partnerFirst = answers.household === "Partner, then children";
      list.push(
        check(
          "familyFit",
          "Family circumstances",
          partnerFirst
            ? (english ? "Are you together with your named spouse or registered civil partner, all your living children are shared and none have died, and there are no competing support or property claims? All must apply." : "Are you together with your spouse or partner, are all your children living and shared between you, and do you have no former partner, other dependant or competing support claim? A minor child’s share is held to age 18.")
            : "Do you have no spouse or partner, all your children are living, and there are no other dependants, outstanding support obligations or disputed family arrangements? This option gives the residue directly to your children’s family branches.",
        ),
        ...(partnerFirst
          ? [
              name(
                "partner",
                "Spouse or partner",
                "What is your spouse or partner’s full legal name?",
              ),
            ]
          : []),
        {
          id: "children",
          label: "Your children",
          prompt:
            "Enter the full names of all your living children, one per line or separated by commas.",
          kind: "names",
          values: [],
        },
        name(
          "care",
          "Person to care for the children",
          "Who would you appoint to look after any minor children if your appointment can take effect? Enter a full legal name or leave this open.",
          true,
        ),
        name(
          "trustee",
          english ? "First children’s trustee" : "Children’s trustee",
          "Who should manage any child’s share until age 18? Enter a trusted adult’s full name. This can be a different person from the caregiver.",
        ),
      );
      if (english) list.push(name("coTrustee","Second children’s trustee","Name a different adult to serve as co-trustee of a minor’s share. Your chosen trustees will manage the inheritance together. A guardian’s role is separate."));
    } else
      list.push(
        check(
          "familyFit",
          "Family circumstances",
          "Do you have no spouse or partner or descendants of any generation, and nobody entitled to depend on you for support? This route leaves the whole residue to one adult.",
        ),
      );
  } else
    list.push(
      check(
        "familyFit",
        "Family circumstances",
        sentence("This simple gift is available if all of these are true: {0} Is that accurate for you?", wording(p.civil ? relativeChecks : "I have no spouse or partner, descendants of any generation, dependants or outstanding family support obligations. My property and permanent home are here.")),
      ),
    );
  list.push(
    name(
      "maker",
      "Your legal name",
      "What is your full legal name? Use the name you want on your will.",
    ),
    {
      id: "town",
      label: "Home municipality",
      kind: "town",
      prompt:
        "In which town, city or municipality do you live? A street address is unnecessary.",
      values: [],
    },
  );
  if (!p.civil)
    list.push(
      name(
        "executor",
        p.key === "CA-QC" ? "Liquidator" : "Executor",
        "Which eligible adult living in your jurisdiction should settle your estate? Enter their full legal name.",
      ),
      name(
        "alternate",
        "Backup executor",
        "Who should take over if your first choice cannot serve? Enter a different adult’s name, or leave open.",
        true,
      ),
    );
  if (!hasFamilyGift(answers))
    list.push(
      name(
        "recipient",
        "First beneficiary",
        "Which adult should receive the rest of your estate after debts, expenses and any separate gifts? Enter their full legal name.",
      ),
    );
  // Earlier Slovak interviews offered a named substitute. Keep that field readable only when migrating those answers to notes.
  if (p.key !== "SK" || p.legacySlovakBackup) list.push(
    name(
      "backup",
      "Backup beneficiary",
      answers.household === "Partner, then children"
        ? "Which adult should inherit if neither your partner nor any of your children or their descendants survives you?"
        : answers.household === "Children first"
          ? "Which adult should inherit if none of your children or their descendants survives you?"
          : refusalToBackup.has(p.key) ? "Who inherits as a backup"
          : "Which different adult should inherit if your first beneficiary dies before you? Enter their full legal name.",
    ),
  );
  list.push(
    check(
      "intent",
      "Final choices",
      sentence("Are you satisfied with those gifts, and do you understand that if no one entitled to the residue survives, local intestacy law applies to that residue? {0}", wording(survivalHelp(p))),
    ),
  );
  if (p.country === "NZ")
    list.push(
      check(
        "localLaw",
        "Applicable law",
        "Is all the property covered here outside Māori freehold land, with no special succession or land rules affecting your estate?",
      ),
    );
  if (p.handOption) {
    list.push(
      options(
        "execution",
        "How you will make the will",
        sentence("How would you like to complete your will in {0}? This printed route uses two witnesses together. For a handwritten will, you personally write every word and sign it at the end.", wording(p.name)),
        ["Print and sign with two witnesses", copyByHand],
      ),
    );
  }
  if (answers.household === "Partner, then children") {
    list.push(
      check(
        "partnerOutright",
        "Your partner’s gift",
        sentence("{0} Is that the result you want?", wording(partnerResidue)),
      ),
    );
  }
  return list;
}
const normalize = (s) =>
  s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
// Compare equivalent printed punctuation while retaining the visitor’s spelling in the will.
const nameIdentity = value => normalize(value).replace(/[‘’]/gu, "'").replace(/[‐‑]/gu, "-");
const undecided =
  /^(?:no(?: one)?|none|skip|help|yes|unknown|undecided|not sure|nobody|myself|my (?:sister|brother|spouse|wife|husband)|leave open|i don[’']t know)$/i;
export function sensitive(s) {
  return typeof s === "string" && hasSensitive(s);
}
function cleanName(value) {
  const v = value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /^(?:my name is|i choose|i nominate|my sister is|my brother is)\s+/i,
      "",
    );
  if (
    !v ||
    v.length > 64 ||
    undecided.test(v) ||
    !/^[\p{L}][\p{L}\p{M} .’'\p{Pd}]*$/u.test(v) ||
    /\b(?:and|or|not sure|someone|everyone|want|would|give|leave|i have|do not|i am)\b/i.test(
      v,
    )
  )
    return null;
  if (/^(?:my|our|their|the|his|her)\s/i.test(v) || /^(?:(?:eldest|oldest|youngest|older|younger|step|grand|only|adult|first|second)[ -]*)*(?:sister|brother|daughter|son|mother|father|mom|mum|dad|spouse|partner|wife|husband|aunt|uncle|niece|nephew|cousin|friend|children|child|beneficiary|executor|trustee|guardian)(?:\b|$)/i.test(v) ||
      /\b(?:if|unless|when|whenever|until|after|before|provided|otherwise|conditional|subject to|on condition|only for|as (?:a |the )?(?:trustee|guardian|executor|custodian|agent)|in trust|on behalf of|for the benefit of|turns|at age|graduat(?:es?|ing|ion)|equally|instead|must|shall|should)\b/i.test(v)) return null;
  return v;
}
export function readAnswer(q, raw, answers = {}, seenItems = null, compareName = nameIdentity) {
  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    raw.length > 650 ||
    sensitive(raw)
  )
    return {
      error:
        "Enter a brief answer without account numbers, passwords or contact details.",
    };
  const v = raw.trim();
  if(q.optional && normalize(v)==="leave open")return {value:"Leave open"};
  if(v===skipped || (v===deferred && !q.values?.includes(deferred)))return {error:"Please check the answers in the chat."};
  const issue=localWordingIssue(v,q.kind);
  if (issue==="pressure") return { stop:true, reason:"A will must express your own free choice. If someone is pressuring you, stop here and speak privately with someone you trust or a local legal service." };
  if(["name","names","town","noteName"].includes(q.kind) && v.split(/[,;，、；\n]+/u).some(part=>looksLikeQuestion(part,q.kind) || localControl(part)))
    return {error:"Choose the answer that fits. You can also ask a question."};
  if (issue==="name") return {error:"Enter a full legal name only. If you want to set a condition, use local advice."};
  if (issue==="item") return {advice:v,error:"This gift is for one personal item you own outright. For conditions, shared property or other arrangements, use local advice."};
  if (q.giftField === "extraRecipient" || /^orgName\d+$/.test(q.id) && q.kind==="charity") {
    const phrase = v.normalize("NFKC").replace(/\s+/g," ");
    const terms = /\b(?:if|unless|when|whenever|until|after|before|provided|providing|otherwise|conditional|subject to|on condition|only (?:for|at|when|on)|as (?:a |the )?(?:trustee|guardian|executor|custodian|agent)|in trust|on behalf of|for the benefit of|turns|at age|graduates?|graduating|divid(?:e|ed)|equally|instead|must|shall|should)\b/i;
    if (terms.test(phrase))
      return { advice:v, error:"Enter just the recipient’s name. If the timing, role or condition matters, keep the exact request for local advice." };
    const relative = /^(?:my|our|the|his|her|their)\b|^(?:(?:eldest|oldest|youngest|older|younger|step|grand|only|adult|first|second)[ -]*)*(?:sister|brother|daughter|son|mother|father|mom|mum|dad|spouse|partner|wife|husband|aunt|uncle|niece|nephew|cousin|friend|children|child|beneficiary|executor|trustee|guardian)(?:\b|$)/i;
    if (q.kind==="name" && relative.test(phrase))
      return { error:"Use the person’s actual name. A relationship such as “my sister” alone does not identify the recipient." };
  }
  if (q.giftField === "extraRecipient" && !printableName(v.normalize("NFC")))
    return { advice: v, error: "The will PDF cannot print that spelling faithfully. Keep the exact name for local advice, or change the gift choice." };
  if (
    ["name", "names", "town"].includes(q.kind) &&
    !printableName(v.replace(/[,;，、；\n]/g, " ").normalize("NFC"))
  )
    return {
      stop: true,
      reason:
        "Our PDF cannot print that spelling faithfully. Keep your legal name exactly as written and use the local will route below; do not change the spelling to fit this tool.",
    };
  if (q.kind === "amount") {
    const amount=parseWholeAmount(v);
    if (!amount)
      return { error: "Enter a positive whole amount up to 999,999, without a currency sign." };
    return { value: amount };
  }
  if (q.kind === "item" || q.kind === "charity") {
    const label = v.normalize("NFC").replace(/\s+/gu, " ");
    if (q.kind === "item" && answers.businessOwnership === ownsBusiness && /\b(?:business|company|firm|partnership|enterprise|work (?:van|tools?|equipment))\b/i.test(label))
      return {advice:v,error:"You chose to leave your interest in the business with the rest of your estate. Choose a personal keepsake here. If you want a business asset to go to someone else, save that request for separate advice."};
    if (q.kind === "item" && itemOwnershipIssue(label))
      return {advice:v,error:"This sounds like an item with a loan, a lease or another owner. This gift is only for an item you own outright. You can save the exact wording as a note or choose a different gift."};
    const allowed = q.kind === "charity" ? /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &’'.,()\p{Pd}]*$/u : /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ’'\p{Pd}]*$/u;
    if (q.kind === "item" && /\b(?:if|unless|when|whenever|until|after|before|upon|once|provided|providing|condition(?:al)?|contingent|subject to|only (?:at|on|for)|at age|turns|graduate[sd]?|graduating|inherits?|receives?|gets?|give|instead|otherwise|divid(?:e|ed)|share(?:d|s)?|split|equally|respectively|must|shall|should|then|to my|to be|and|or|but|except|pay|leave)\b/i.test(label))
      return { advice: v, error: "This sounds like terms or more than one thing. The keepsake gift accepts one item description only. Reword it, or save this request for local advice." };
    if (q.kind === "item" && /\b(?:home|farm|building|company|corporation|stock|stocks|securities|crypto|bitcoin|bank|wallet|estate|retirement|pension|insurance|trust|animals?|pets?|dogs?|cats?|horse|parrot)\b/i.test(label))
      return { advice: v, error: "This gift is for a personal keepsake only. Choose local advice for land, animals, finances or conditions." };
    if (label.length < 3 || label.length > (q.kind === "item" ? 75 : 80) || !allowed.test(label) || !printableName(label) || undecided.test(label) ||
        (q.kind === "item" && /\b(?:if|unless|provided|except|shall|must|give|leave|pay|estate|account|cash|money|pet|dog|cat|land|house|shares|property|joint)\b/i.test(label)))
      return { advice: v, error: q.kind === "item" ? "Give just the identifying words for one physical keepsake. Use local advice for property, instructions or conditions." : /^orgName\d+$/.test(q.id) ? orgAdvice : "Enter the verified charity name as it must appear. If it cannot be entered exactly, use the court PDF or local advice." };
    const orgNumber=/^orgItem(\d+)$/.exec(q.id || "");
    if (q.kind==="item" && orgNumber && (seenItems?seenItems.has(itemIdentity(label)):giftList(answers).some(g=>g.type===item && !(g.organization && g.n===ordinaryGifts(answers).length+Number(orgNumber[1])) && itemIdentity(g.description)===itemIdentity(label))))return {error:"That keepsake is already in your list. For two different items, describe what distinguishes this one. To change the original gift, edit it on the review screen."};
    const duplicate = q.kind === "item" && q.giftNumber && (seenItems ? seenItems.has(itemIdentity(label))
      : giftList(answers).some(g => g.type === item && g.n !== q.giftNumber && itemIdentity(g.description) === itemIdentity(label)));
    if (duplicate)
      return { error: "That keepsake is already in your list. For two different items, describe what distinguishes this one. To change the original gift, edit it on the review screen." };
    return { value: label };
  }
  if (q.kind === "name" || q.kind === "names") {
    if (q.optional && ["leave open", "skip", "none"].includes(normalize(v)))
      return { value: "Leave open" };
    const list =
      q.kind === "names" ? v.split(/[,;，、；\n]+/).map((s) => s.trim()) : [v];
    const names = list.map(cleanName);
    if (
      names.length < (q.min || 1) ||
      names.length > (q.max || 8) ||
      names.some((x) => !x) ||
      new Set(names.map(compareName)).size !== names.length
    )
      return {
        error:
          q.kind === "names"
            ? sentence("Enter {0} to {1} distinct full names, separated by commas.", q.min || 1, q.max || 8)
            : "Enter one person’s full name so the will clearly identifies them.",
      };
    const n = compareName(names[0]);
    if (
      q.id === "txOthers" &&
      names.some((x) => compareName(x) === compareName(answers.recipient || ""))
    )
      return {
        error:
          "Only add people who are different from your first residue beneficiary.",
      };
    if (
      q.id === "txAlternates" &&
      names.some((x) => compareName(x) === compareName(answers.spouse || ""))
    )
      return {
        error: "Choose a different backup beneficiary.",
      };
    if (q.id === "coTrustee" && n === compareName(answers.trustee || "")) return {error:"Choose two different people as co-trustees."};
    if ((q.id==="petBackup" && n===compareName(answers.petCarer || "")) || (q.id==="petCarer" && n===compareName(answers.petBackup || "")))return {error:"Choose a different backup for pet care."};
    if (["petCarer","petBackup"].includes(q.id) && n===compareName(answers.maker || ""))return {error:"Enter one person’s full name so the will clearly identifies them."};
    if (q.id === "alternate" && n === compareName(answers.executor || ""))
      return { error: "Choose a different backup executor, or leave it open." };
    if (
      q.id === "backup" &&
      [answers.recipient, answers.partner, ...(answers.children || [])]
        .filter(Boolean)
        .some((x) => compareName(x) === n)
    )
      return { error: "Choose a different backup beneficiary." };
    if (
      q.id === "maker" &&
      [
        answers.partner,
        ...(answers.children || []),
        answers.care,
        answers.trustee,
        answers.coTrustee,
      ]
        .filter(Boolean)
        .some((x) => compareName(x) === n)
    )
      return {
        error:
          "The will-maker and that family member must be distinguishable. Use full identifying names or get local help if names match.",
      };
    if (
      q.id !== "maker" &&
      answers.maker &&
      names.some((x) => compareName(x) === compareName(answers.maker))
    )
      return {
        error:
          "The will-maker cannot be named for this role in their own will.",
      };
    const parentPartner = q.id === "formChildren" ? answers.spouse : q.id === "children" ? answers.partner : undefined;
    if (parentPartner && names.some((x) => compareName(x) === compareName(parentPartner)))
      return {
        error:
          "Make sure each child is identified separately from the partner.",
      };
    return { value: q.kind === "names" ? names : names[0] };
  }
  if (q.kind === "notes" || q.kind === "noteName") {
    const nameField = q.kind === "noteName";
    const limit = nameField ? 100 : 600;
    if (
      v.length > limit ||
      /[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v)
    )
      return {
        error: sentence("Please use up to {0} characters of ordinary text.", limit),
      };
    return { value: v.normalize("NFC").replace(/\s+/g, " ") };
  }
  if (q.kind === "town") {
    if (
      v.length > 75 ||
      !/^\p{L}[\p{L}\p{M}\p{N} ’'.\p{Pd}]*$/u.test(v) ||
      undecided.test(v)
    )
      return { error: "Enter just the name of your municipality." };
    return { value: v.normalize("NFC") };
  }
  const lookup = normalize(v).replace(/[.!]$/, "");
  let choice = q.values.find((s) => normalize(s) === lookup);
  // Older saved kits used the one-gift labels. They still mean finish or seek advice, never add a gift.
  if (q.giftField === "extraFit" && v === bespoke) choice = differentTerms;
  if (q.giftMenu && q.id!=="extra") {
    if (v === finishNotes || /^(?:i(?:['’]m| am) done|done|finished|no(?: thanks)?|no more(?: gifts)?|nothing else|that['’]s (?:all|it))$/i.test(lookup)) choice = doneGifts;
    if (v === bespoke) choice = adviceOption;
  }
  if (q.id === "extra" && /^(?:i(?:['’]m| am) done|done|no more(?: gifts)?|no thanks)$/i.test(lookup)) choice = noExtra;
  if (q.giftMenu && !choice) {
    const alias = /^(?:a |another (?:a |an )?)?(?:keepsake|item|ring|item gift)$/.test(lookup) ? item
      : /^(?:a |another )?(?:cash|money|cash gift|gift of money)$/.test(lookup) ? cash : null;
    if (q.values.includes(alias)) choice = alias;
  }
  if(q.id==="priorContinue" && choice==="Back to this question")return {error:"Please check the answers in the chat."};
  if (q.id==="adviceOverride" && choice===cancelAdvice) return {cancelAdvice:true};
  if (q.giftField === "extraTotal" && /^(yes|correct|that is correct)$/.test(lookup)) choice=q.values[0];
  if (q.giftField === "extraTotal" && choice === correctCash) return { reviseGift: true };
  if (q.values === yes || q.values[0] === yes[0]) {
    if (/^(?:yes|yes,? all (?:apply|true)|all apply)$/.test(lookup))
      choice = yes[0];
    if (/^(?:no|not sure|unsure|no or unsure)$/.test(lookup)) choice = yes[1];
  }
  if (!choice)
    return {
      error: "Choose the answer that fits. You can also ask a question.",
    };
  if (
    [yes[1], "Another situation", "None of these", "I’m unsure"].includes(
      choice,
    )
  )
    return { stop: true };
  return { value: choice };
}
// An earlier-choice transcript is inert, human-readable data. Only a planning
// state may carry it. Do not ever dispatch these entries into a will renderer.
function checkedRecord(record) {
  if (!Array.isArray(record) || record.length>25000) throw Error("Invalid private notes record.");
  return record.map(entry=>{
    if (!Array.isArray(entry) || entry.length!==2) throw Error("Invalid private notes entry.");
    const [label,value]=entry;
    if (typeof label!=="string" || !label.length || label.length>140 || typeof value!=="string" || !value.length || value.length>1000 ||
        /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(label+value) || sensitive(value)) throw Error("Invalid private notes text.");
    return [label,value];
  });
}
const earlierChoicesNotice = "My earlier choices are listed separately below.";
export function usesEarlierChoicesNotice(state) {
  return Boolean(state.record?.length) && state.answers.wishes===earlierChoicesNotice;
}
// Saved notes store a readable transcript. Only translate values identifiable as
// choices on their original question. Names, wishes and unknown older rows stay verbatim.
export function planningEntries(place,record=[]) {
  if(!record.length)return [];
  const p=profile(place), answers={};
  let byLabel=new Map(), changed=true;
  return record.map(([label,value])=>{
    if(changed && !byLabel.has(label)){
      byLabel=new Map(questions(p,answers).map(q=>[q.label,q]));
      changed=false;
    }
    const q=byLabel.get(label);
    if(!q)return [label,value,false];
    const preset=Boolean(q.values?.includes(value));
    if(preset || q.kind){
      answers[q.id]=q.kind==="names" && !preset ? value.split(", ") : value;
      changed=true;
    }
    return [label,value,preset];
  });
}
export function preserveAsNotes(p,state,unresolvedLabel="") {
  const record = [...(state.record || []),...questions(p,state.answers).filter(q=>Object.hasOwn(state.answers,q.id) && state.answers[q.id]!==skipped)
    .map(q=>[q.label,formatValue(state.answers[q.id])])];
  for(const [id,[part,answer,note]] of Object.entries(state.issues || {})){
    const q=questions(p,state.answers).find(q=>q.id===id);
    record.push(["Question to discuss",q?display(q.label)+": "+display(answer):display(answer)]);
    if(note)record.push(["Question to discuss",note]);
  }
  if (unresolvedLabel) record.push(["Question to discuss",unresolvedLabel]);
  const answers={appointment:"Yes, all apply"};
  if (state.answers.maker) Object.assign(answers,{maker:state.answers.maker,wishes:earlierChoicesNotice,extra:"Nothing else"});
  for(const q of questions({...p,route:"planning"},state.answers)){
    if (!q.planStep || /^org/.test(q.id) || !state.answers[q.id] || state.answers[q.id] === skipped) continue;
    const value = state.answers[q.id];
    // Keep both original spellings in the transcript. Do not repeat an ambiguous carer as an appointment.
    answers[q.id] = q.optional && q.kind === "name" && !readAnswer(q, value, answers).value ? "Leave open" : value;
  }
  if(state.answers.orgGift1==="I’m done")answers.orgGift1=state.answers.orgGift1;
  return validateState({version:2,purpose:"planning",place:state.place,answers,record,reviewNotes:state.reviewNotes,...(state.issues?.opening?{issues:{opening:state.issues.opening}}:{})});
}
function checkedReviewNotes(notes, p) {
  if(notes===undefined)return [];
  if(!Array.isArray(notes))throw Error("Invalid review notes.");
  const seen=new Set();
  const validText=(value,limit)=>typeof value==="string" && value.trim().length>0 && value.length<=limit && !/[\p{Cc}\p{Cf}]/u.test(value);
  return notes.map(note=>{
    if(!note || typeof note.id!=="string" || !/^[a-zA-Z][a-zA-Z0-9]{0,55}$/.test(note.id) || Object.hasOwn(Object.prototype,note.id) ||
      !Number.isInteger(note.part) || note.part<0 || note.part>150 || !validText(note.question,3000) ||
      note.caption!==undefined && !validText(note.caption,3000) || !validText(note.text,600) || sensitive(note.text))throw Error("Invalid review notes.");
    const id=note.id === "residueRefusal" && p.route !== "planning" ? residueRefusalKey(p) : note.id;
    const key=id+"/"+note.part;
    if(seen.has(key))throw Error("Duplicate review note.");
    seen.add(key);
    return {id,part:note.part,question:note.question,...(note.caption?{caption:note.caption}:{}),text:note.text};
  });
}
export function validateState(state, complete = false, importing = false) {
  if (
    !state ||
    ![1, 2].includes(state.version) ||
    !validPlace(state.place) ||
    !state.answers ||
    typeof state.answers !== "object" ||
    Array.isArray(state.answers)
  )
    throw Error("Invalid continuation file.");
  const selected = profile(state.place);
  // Old appointment files contain wishes only. Keep their purpose on import.
  // Never turn an old collection of notes into a dispositive instrument.
  const legacyNotes = !state.purpose && selected.route === "deposit" && Object.hasOwn(state.answers,"appointment");
  const purpose = legacyNotes ? "planning" : state.purpose;
  if (state.purpose !== undefined && state.purpose !== "planning" && !(state.purpose==="statutory" && selected.key==="US-ME"))
    throw Error("Unrecognized type of kit.");
  if (state.record !== undefined && purpose!=="planning") throw Error("A private notes record cannot be used in a will.");
  const record = state.record === undefined ? [] : checkedRecord(state.record);
  const p =
    purpose === "planning"
      ? { ...selected, route: "planning" }
      : purpose==="statutory" ? {...selected,route:"statutory"} : selected;
  if (state.version === 1) p.legacy = true;
  const reviewNotes=checkedReviewNotes(state.reviewNotes,p);
  const issues={};
  if(state.issues!==undefined){
    if(!state.issues || typeof state.issues!=="object" || Array.isArray(state.issues))throw Error("Invalid review details.");
    for(const [id,row] of Object.entries(state.issues)){
      if(!/^(?:[a-zA-Z][a-zA-Z0-9]{0,55})$/.test(id) || Object.hasOwn(Object.prototype,id) || !Array.isArray(row) || ![2,3].includes(row.length) || row.length===3 && (typeof row[2]!=="string" || !row[2].trim() || row[2].length>600 || /[\p{Cc}\p{Cf}]/u.test(row[2]) || sensitive(row[2])) || !Number.isInteger(row[0]) || row[0]<0 || row[0]>150 || typeof row[1]!=="string" || !row[1].trim() || row[1].length>650 || /[\p{Cc}\p{Cf}]/u.test(row[1]) || sensitive(row[1]) || id!=="opening" && state.answers[id]!==skipped)throw Error("Invalid review details.");
      issues[id]=[...row];
    }
  }
  const answers = {};
  const incoming = {...state.answers};
  if (p.route !== "planning" && residueRefusalKey(p) === "wholeInheritanceRefusal") {
    // An earlier answer about refusing a share cannot confirm renunciation of the entire inheritance.
    if (Object.hasOwn(incoming, "residueRefusal")) {
      if (Object.hasOwn(incoming, "wholeInheritanceRefusal")) throw Error("Please check the answers in the chat.");
      if (incoming.residueRefusal === skipped && issues.residueRefusal) {
        incoming.wholeInheritanceRefusal = skipped;
        issues.wholeInheritanceRefusal = issues.residueRefusal;
        delete issues.residueRefusal;
      } else if (incoming.residueRefusal !== yes[0]) {
        throw Error("Please check the answers in the chat.");
      }
      delete incoming.residueRefusal;
    }
  }
  if (p.route === "statutory" && Object.hasOwn(incoming, "maineResidueChoice")) {
    if (Object.hasOwn(incoming, "mainePaperChoice")) throw Error("Please check the answers in the chat.");
    const previous = incoming.maineResidueChoice;
    if (previous === yes[0]) {
      // That maker elected not to use B on the earlier Revisor publication. No A or C was selected.
      incoming.mainePaperChoice = maineEarlierChoice;
    } else {
      const refusal = ["No", "No or unsure", "I’m not sure"].includes(previous);
      if (!refusal && !(previous === skipped && issues.maineResidueChoice))
        throw Error("Please check the answers in the chat.");
      incoming.mainePaperChoice = skipped;
      issues.mainePaperChoice = issues.maineResidueChoice || [0, previous];
    }
    delete incoming.maineResidueChoice;
    delete issues.maineResidueChoice;
  }
  if (p.route === "statutory") {
    // A visitor could save a private note before answering the former question.
    for (const note of reviewNotes) {
      if (note.id === "maineResidueChoice" && !reviewNotes.some(other => other.id === "mainePaperChoice" && other.part === note.part))
        note.id = "mainePaperChoice";
    }
  }
  // The old scope question explicitly ruled out owning a business. Its key was
  // retired so an unfinished new interview can never be mistaken for that answer.
  if (Object.hasOwn(incoming, "scope")) {
    if (purpose || incoming.scope !== yes[0] || ["estateScope","businessOwnership","businessTransfer","businessWishes"].some(key => Object.hasOwn(incoming,key)))
      throw Error("Please check the estate and business answers in this file.");
    delete incoming.scope;
    incoming.businessOwnership = noBusiness;
    incoming.estateScope = yes[0];
  }
  // Some earlier kits contained a private interview for a state now delivered
  // only as an unchanged blank publication. Preserve the old answers as readable
  // wishes on import; do not use them to select or fill any will in that state.
  const oldSlovakWill = p.key === "SK" && Object.hasOwn(incoming,"backup");
  if (importing && !purpose && ((p.route === "fixed" && Object.keys(incoming).some(id=>!questions(p,incoming).some(q=>q.id===id))) || oldSlovakWill)) {
    const previous = oldSlovakWill ? {...p,legacySlovakBackup:true} : {...p,route:"paper"};
    const checked = {};

    let qs;
    try { qs = questions(previous,incoming); } catch { throw Error("Invalid earlier interview."); }
    for (const q of qs) {
      if (!Object.hasOwn(incoming,q.id)) continue;
      const value=incoming[q.id];
      if (q.kind==="names" ? !Array.isArray(value) || value.some(v=>typeof v!=="string") : typeof value!=="string") throw Error("Invalid earlier answer.");
      const r=readAnswer(q,Array.isArray(value)?value.join(","):value,checked,null,normalize);
      if (!r.value) throw Error("Please keep the original file to read these earlier answers.");
      checked[q.id]=r.value;
    }
    if (Object.keys(checked).length!==Object.keys(incoming).length) throw Error("Invalid earlier interview.");
    return preserveAsNotes(previous,{...state,answers:checked});

  }
  // Previous England/Wales interviews only admitted childless single makers.
  // Their explicitly confirmed branch maps to the equivalent choice; the new
  // support, property and independence confirmations still need fresh replies.
  if (p.country === "GB" && p.parentPlan && p.route !== "planning" && !Object.hasOwn(incoming,"household") && incoming.familyFit === yes[0]) incoming.household="One adult beneficiary";
  const seenItems = new Set();
  // Derive the expected sequence once, then validate in order against previously accepted answers.
  // Uploaded JSON can contain only the scalar and names payloads emitted by this app.
  for (const value of Object.values(incoming)) {
    if (typeof value !== "string" && !(Array.isArray(value) && value.every(x => typeof x === "string")))
      throw Error("Invalid saved answer.");
  }
  let list;
  let earlierNameConflict = "";
  try { list = questions(p, incoming); } catch { throw Error("Invalid saved answers."); }
  let gap=false;
  for (const q of list) {
    if (!Object.hasOwn(incoming, q.id)) {
      if (complete) throw Error("Please complete the remaining questions.");
      // An in-place change can invalidate a cash total or the recipient type without invalidating later gifts.
      // These two input slots may be pending in a partial save, but are always required before download.
      if (q.planStep || q.supplementalCheck || ["extraTotal","extraRecipient"].includes(q.giftField)) continue;
      gap=true;continue;
    }
    if(gap && !q.planStep)throw Error("Unrecognized or out-of-order saved answers.");
    const raw = incoming[q.id];
    if(raw===skipped && Object.hasOwn(issues,q.id)){answers[q.id]=skipped;continue;}
    if (q.kind === "names") {
      if (!Array.isArray(raw) || raw.some((x) => typeof x !== "string"))
        throw Error("Invalid names.");
    } else if (typeof raw !== "string") {
      throw Error("Invalid saved answer.");
    }
    // Saved facts can span editions. Keep the full English list on import or in
    // notes, and explain how to use it before issuing a shorter bilingual form.
    const longerTexasList = q.id === "txAlternates" && q.max === 8 && raw.length > 8 && raw.length <= 10;
    if (longerTexasList && complete && !needsAdvice(incoming)) throw Error(texasAlternateCapacityError);
    const input = Array.isArray(raw) ? raw.join(",") : raw;
    let result = readAnswer(
      longerTexasList ? {...q, max: 10} : q,
      input,
      answers, seenItems,
    );
    if (importing && result.error && ["name","names"].includes(q.kind)) {
      // Older editions treated typographic punctuation as distinct. Texas also allowed a spouse to appear among the children.
      const oldAnswers = p.key === "US-TX" && q.id === "formChildren" ? {...answers, spouse: undefined} : answers;
      const previous = readAnswer(longerTexasList ? {...q, max: 10} : q, input, oldAnswers, seenItems, normalize);
      if (previous.value) {
        if (purpose === "planning" && q.optional) {
          record.push([q.label, formatValue(previous.value)], ["Question to discuss", result.error]);
          result = {value: "Leave open"};
        } else {
          earlierNameConflict = result.error;
          result = previous;
        }
      }
    }
    if (!result.value || (q.giftField==="extraTotal" && result.value!==raw))
      throw Error("Please check the answers in the chat.");
    answers[q.id] = result.value;
    if (q.giftField==="extraItem" || /^orgItem\d+$/.test(q.id)) seenItems.add(itemIdentity(result.value));
  }
  // Aliases may normalize a choice, but may never change which fields a complete file requires.
  if (Object.hasOwn(answers,"adviceOverride") && !Object.hasOwn(answers,"adviceFor") && Object.hasOwn(answers,"extraRequest"))
    throw Error("Please identify the earlier gift for local advice.");
  if (complete && questions(p, answers).some(q => !Object.hasOwn(answers,q.id)))
    throw Error("Please complete the remaining questions.");
  if (Object.keys(answers).length !== Object.keys(incoming).length)
    throw Error("Unrecognized or out-of-order saved answers.");
  if (earlierNameConflict) return preserveAsNotes(p,{...state,answers},earlierNameConflict);
  return {
    version: state.version,
    ...(purpose ? { purpose } : {}),
    ...(record.length || state.record !== undefined ? {record} : {}),
    ...(Object.keys(issues).length ? {issues} : {}),
    ...(reviewNotes.length ? {reviewNotes} : {}),
    place: { country: p.country, region: p.region },
    answers,
  };
}
export const formatValue = (value) =>
  Array.isArray(value) ? value.join(", ") : value;
export function authority(p) {
  if (p.key === "CA-ON")
    return ["Ontario’s will and signing rules", p.legalSource];
  if (p.key === "US-TX")
    return [
      "Texas Supreme Court will forms",
      "https://www.txcourts.gov/rules-forms/forms/",
    ];
  if (p.key === "US-CA")
    return [
      "California Courts statutory will",
      "https://selfhelp.courts.ca.gov/wills-estates-probate/legal-documents",
    ];
  return ["Local succession rules", p.legalSource];
}
