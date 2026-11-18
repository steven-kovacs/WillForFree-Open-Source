import {sentence} from "./locale.js";
// Age for the court appointment, not age to make a will or minimum age on the signing date.
const executorAges = {"US-AK":19,"US-NE":19,"US-CO":21,"US-UT":21,"US-AL":19};
export function executorAgeInstruction(p) {
  const age=executorAges[p.key];
  return age ? sentence("An executor must be at least {0} when appointed by the court. This also applies to any backup executor.",age) : null;
}
// An operator may publish these seven general forms separately from the interview.
// This is a conservative product selection, not a finding that publishing a form is exempt everywhere.
export const fixedStates = new Set(["US-AZ", "US-CO", "US-FL", "US-KY", "US-MN", "US-NC", "US-OH"]);
export const depositCountries = new Set(["MT", "NL", "PT"]);
export const superannuationSource = "https://moneysmart.gov.au/how-super-works/who-gets-your-super-if-you-die";
const estateProperty = {
  AU: "Your super fund pays the death benefit under its rules and any valid nomination. The gifts in this will apply to that money only if the fund pays it to your legal personal representative for your estate. Check with your fund who can receive it and when a nomination expires.",
  NZ: "Your KiwiSaver balance normally forms part of your estate. Your personal representative can apply to the provider. For a small balance, the provider can also use the statutory payment procedure under section 65 of the Administration Act 1969.",
  SG: "A CPF nomination covers your CPF account savings. It does not cover your CPF Investment Scheme investments or property bought with CPF savings. Check each investment and how the property is titled. A surviving joint tenant generally takes the property, while your share as a tenant in common forms part of your estate.",
  "GB-SCT": "A croft tenancy or grazings share has its own succession procedure. To accept a bequest, the beneficiary or the deceased crofter’s executor, acting with the beneficiary’s authority, must notify the landlord and send a copy to the Crofting Commission within 12 months of death. Apply through the Commission for first registration of an unregistered croft, or registration of the bequest for a registered croft. The transfer takes effect on registration and is backdated to the crofter’s death. If the bequest fails, the tenancy follows the croft intestacy procedure.",
};
export function estatePropertyGuide(p) {
  return estateProperty[p.key] || estateProperty[p.country];
}
// A general gift of residue can also dispose of property subject to a testamentary power.
// These authored wills expressly limit the gifts to the maker's own estate.
export const ownEstateClause = "I do not exercise any power of appointment over property. The gifts in this will dispose only of my own estate.";
export function limitsAppointiveProperty(p) {
  return ["paper", "handwriting", "fixed"].includes(p.route) &&
    ["AU", "CA", "GB", "IE", "NZ", "SG", "US"].includes(p.country) &&
    !["CA-QC", "GB-SCT", "US-LA"].includes(p.key);
}
export const appointmentPowerGuide = "A trust, will or deed may give you a power of appointment, meaning the right to choose who receives property held under that document. This will expressly leaves that power unused. Check who receives the property under the document that gave you the power. Revoking an earlier will can cancel a choice you made there.";
export const tasmanianPower = "Section 50 of the Tasmanian Wills Act includes property subject to a general testamentary power of appointment in a general gift of residue. If a trust, will or deed gives you such a power, or you are unsure, have that document and your will assessed together before signing.";
export const publisherPowerGuides = {
  "US-CA": "The California statutory form has no separate choice for property you can appoint under a trust, will or deed. Under Probate Code section 641, a general gift of the balance does not exercise that power unless there is a specific reference to it or another indication of intent to exercise it. If you hold a power, or an earlier will used one, check the documents together before signing.",
  "US-ME": "If a trust, will or deed lets you choose who receives its property, check it before signing. Under Maine section 2-608, first check whether the document granting the power requires a reference to it. Without such a requirement, a gift of the residue can exercise the power if your will shows that intention, or if the power is general, exercisable in favor of your estate and has no effective gift in default. This statutory form has no separate choice for that property. Revoking an earlier will can cancel a choice you made there.",
  "US-TX": "The Texas court form has no separate choice for property you can appoint under a trust, will or deed. Under Estates Code section 255.351, a general gift of the residue needs a specific reference to the power or another written indication that you intend to include that property. If you hold a power, or an earlier will used one, check the documents together before signing.",
};
export const singaporeFlat = "If you own an HDB flat as sole owner or tenant in common, your share can pass under your will. A beneficiary must separately meet HDB’s conditions to keep it. Your executor must apply for transmission within six months of obtaining the grant of probate. For a joint tenancy the surviving owners take by survivorship and must lodge a Notice of Death. Ask HDB about the options for your flat type if the beneficiary cannot retain it.";
// Scope the example to the product covered by each cited enactment.
export const priorDesignationSources = {
  AB: "https://kings-printer.alberta.ca/documents/Acts/W12P2.pdf",
  BC: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/09013_01#section97",
  MB: "https://web2.gov.mb.ca/laws/statutes/ccsm/b030.php",
  NB: "https://laws.gnb.ca/en/document/cs/2012,%20c.114",
  NL: "https://www.assembly.nl.ca/Legislation/sr/statutes/p05.htm",
  NS: "https://nslegislature.ca/sites/default/files/legc/statutes/beneficiaries%20designation.pdf",
  NT: "https://gnwt.ca/resources/retirement-plan-beneficiaries-act",
  NU: "https://www.nunavutlegislation.ca/en/file-download/download/public/629",
  ON: "https://www.ontario.ca/laws/statute/90s26#BK95",
  PE: "https://www.princeedwardisland.ca/sites/default/files/legislation/d-09-designation_of_beneficiaries_under_benefit_plans_act.pdf",
  QC: "https://www.legisquebec.gouv.qc.ca/en/document/cs/CCQ-1991",
  SK: "https://fcaa.gov.sk.ca/public/CKeditorUpload/Insurance/I9-11_%286%29.pdf",
  YT: "https://laws.yukon.ca/cms/images/LEGISLATION/acts/insurance.pdf",
};
export function priorDesignationGuide(p) {
  if (p.country !== "CA") return null;
  return ["QC","SK","YT"].includes(p.region)
    ? "If an earlier will named a life insurance beneficiary, revoking that will can cancel the designation. This will makes no new insurance designation. Check the earlier will and the insurer’s records before signing. Confirm separately how to keep or change the person who will receive the proceeds."
    : "If an earlier will named a beneficiary for a retirement plan, revoking that will can cancel the designation. This will makes no new plan designation. Check the earlier will and the plan provider’s records before signing. Confirm separately how to keep or change the person who will receive the benefit.";
}
export const estonianRevival = "If this domestic will revokes or changes an earlier notarial will and you are still alive when the six months expire, the earlier notarial will becomes valid again. Its beneficiaries can then inherit. If you want the change to last, arrange a new notarial will or make a fresh valid will in time.";
export const jointWillRules = {
  EE: "If you and a living spouse made a reciprocal will, unilaterally revoking an interdependent gift requires a notarial will and notice delivered to your spouse through the notarial procedure. A witnessed home will alone cannot do this. If you accepted an inheritance under a reciprocal will with your late spouse naming who receives your estate after you, you generally cannot redirect that inheritance by making this will.",
  DK: "To revoke a joint disposition on your own, you must notify the other maker unless special circumstances rule out notice. After the first death, a joint will can protect a gift to a late spouse’s children from another relationship or limit what you can change, even if the first estate has already been divided. Similar limits can apply to joint wills made by people who were not married to each other.",
  NO: "While both makers are alive, the other maker must generally learn of a change to a joint or mutual will before you die. Exceptions apply if notice was impossible or unreasonably difficult, or the change leaves the other maker at least as well off under the will. After accepting an inheritance, you may be bound by its gifts after the second death. Your right to change them depends on the earlier terms, the intended recipients and the rules in section 61.",
  FI: "A unilateral change to a mutual will can cost you your own entitlement under it if the change defeats a fundamental condition of the reciprocal gifts. Check both sides of the earlier arrangement before signing.",
  SE: "A unilateral change to a mutual will can cost you your own entitlement under it if the change substantially upsets the basis of the reciprocal gifts. Check both sides of the earlier arrangement before signing.",
  MT: "Check any joint will you made with a late spouse (unica charta). If you left all or most of your property to each other under an express forfeiture condition, revoking that gift can cost you ownership of what their will left you. Article 594 provides for you to retain its use and enjoyment (usufruct).",
  IS: "If you made a joint or mutual will, revocation generally has to be brought to the other maker’s attention, with an exception for extraordinary circumstances. Signing this will alone may leave the earlier arrangement in effect.",
};
export const ontarioPartnerChange = "If you later divorce or your marriage is annulled, Ontario normally treats the former spouse as having died before you for their gift and appointment as executor or trustee. A separation that meets section 17 can have the same effect. Simply ending an unmarried partnership does not automatically cancel the named partner’s gift. Review this will when you separate.";
export const englishPartnerChange = "Separation alone leaves your spouse’s or civil partner’s gift in place. After a final divorce, dissolution or annulment, the law normally treats the former spouse or civil partner as having died for their gift and appointment as executor or trustee. Under this family will, the children’s branches can then take the residue.";
export const territorialChildShare = {
  "CA-NT": "Section 22 of the Northwest Territories Wills Act refers to a child born after their father’s death. If his will makes no provision for that child, the court fixes the share the child would inherit without a will. Other gifts are reduced proportionately as needed.",
  "CA-NU": "In Nunavut, if your child is born after your death and your will makes no provision for them, they receive the share they would inherit if you had no will. The court fixes that share. Other gifts are reduced proportionately as needed.",
  "CA-YT": "A child born after your death may have a protected share under section 21 of Yukon’s Wills Act. If the section applies and your will makes no provision for the child, the court fixes the share they would inherit without a will. Other gifts are reduced proportionately as needed.",
};
export const courtVenue = {
  "US-CA":"For this California form, sign in California. Its signature line names California as the place of signing.",
  "US-TX":"For this Texas form, sign in Texas with both witnesses and a Texas notary present together.",
};
export const mainePublisher = "https://hancockcountymaine.gov/registry-of-probate/";
export const maineOriginal = "https://hancockcountymaine.gov/wp-content/uploads/2024/10/MAINE-STATUTORY-WILL.pdf";
export const maineSpouseAmount = "For choice B on page 3, initial B, write the fixed amount on the line after “to my spouse”, and sign below B.";
export const maineChoicePrompt = "Which section 2.4 choice do you plan to complete on the printed Maine will?";
export const mainePaperChoices = [
  "Decide on the printed form",
  "A · Leave the remainder to my spouse if living",
  "B · Leave a fixed amount to my spouse if living",
  "C · Leave stated amounts to named people",
];
export const maineEarlierChoice = "Leave B unused as I previously chose";
export const mainePrint = "Print all six pages of the unchanged English form from the Hancock County Registry of Probate. Read its notices and every provision before completing it.";
export const maineAuthoredFit = "The chat-made will requires that you have no spouse, partner, descendants, dependants or outstanding family support obligations.";
export const maineProperty = "Sections 2.1 and 2.2 give real property and personal and household items to a living spouse, otherwise to surviving children, except for the specific gifts you sign there. Sign each charity gift you make in section 2.3.";
export const maineRemainder = "With B, the rest goes in equal shares to your children and the descendants of any deceased child. If your spouse is not living, that fixed share goes to that family too. With A, that family takes the remainder if your spouse is not living.";
export const maineSpouseRights = "Choice B sets a gift from the remainder. A surviving spouse may also have a right to elect a statutory share, receive exempt property and claim allowances under Maine law.";
export const maineSignatures = "An invalid section 2.4 means intestacy for the remainder. Sign section 2.5 if you direct a distribution of undistributed property. Sign each guardian, conservator or personal representative nomination you use.";
export const maineWitnesses = "Personally execute the form in the presence of two independent witnesses. Have them sign its witness declaration during the same sitting while you and both witnesses are present. The optional self-proving acknowledgment must be completed before an officer authorized to take acknowledgments; leave it for that ceremony. A notary is not a substitute for either signing witness.";
// This is the Revisor's prescribed English notice for republication of the statutory text.
export const maineStatuteNotice = "All copyrights and other rights to statutory text are reserved by the State of Maine. The text included in this publication reflects changes made through the Second Regular Session of the 132nd Maine Legislature and is current through October 1, 2026. The text is subject to change without notice. It is a version that has not been officially certified by the Secretary of State. Refer to the Maine Revised Statutes Annotated and supplements for certified text.";
export const maineProbateCourts = "https://www.maineprobate.net/welcome/county-info/";
export function hasMaineCourtReferral(record = []) {
  return record.some(([label, url]) => label === "Find your Maine probate court" && url === maineProbateCourts);
}
export const californiaCommunityShare = "Your will can pass your own property and your share of community property. Your spouse or registered domestic partner keeps their own share.";
export const californiaDescendantShares = "When a gift goes to your descendants, start with the nearest generation that has a survivor. Each survivor in that generation takes one share. Each deceased person in that generation who leaves surviving descendants also has one share, divided among their descendants in the same way. A grandchild gets no separate share through a parent who takes a share.";
export const californiaGuardianScope = "Paragraph 6 nominates a guardian to care for a child under 18 only if that child has no living parent when you die. It does not cover a child whose other parent is alive but unable to provide care.";
export const californiaCustodianScope = "Paragraph 7 nominates a custodian for every beneficiary of this will who is under the age you choose. If you choose 25, it covers a 22-year-old as well as a child. The same age applies to all of them.";
export const californiaDefaultHeirs = "For an ineffective gift of the balance, the executor identifies your heirs and their shares under the California intestacy rules for property not acquired from a deceased spouse. Those rules apply even if you received the property from a deceased spouse.";
export const californiaBond = "Even if you sign the bond waiver, the court can require a bond if your executor lives outside California or for other good cause.";
export const texasFamilyHome = "This Texas will passes your separate property and your share of community property. A surviving spouse can keep using the family home, and a court can allow a guardian to use it for minor children.";
export const texasGuardianScope = "Section 6 nominates a guardian of the person for any of your children who needs one, including an incapacitated adult child. The same list applies to them all. The court decides who is appointed.";
export const texasCustody = "Section 5 lets the executor transfer a gift for a beneficiary under 21 to a custodian. This can also affect a beneficiary aged 18, 19 or 20. It is separate from choosing a guardian.";
export const texasInformalMarriage = "Texas recognizes an informal marriage. Two people eligible to marry can agree to be married, then live together in Texas as a married couple and represent to others in Texas that they are married. A ceremony is unnecessary. Living apart does not itself end a marriage.";
export const texasUnsignedChoice = "If you sign both choices in section 2.2 or leave both unsigned, choice 1 applies if your spouse survives you by 30 days.";
// Delivery after death can depend on notice, a request or who holds the original.
export const custodySources = {
  AT:"https://ris.bka.gv.at/eli/bgbl/i/2003/111/P151/NOR40173151",
  LU:"https://guichet.public.lu/fr/citoyens/fiscalite/heritage-donation/testament/succession-avec-testament.html",
  "US-AK":"https://www.akleg.gov/statutesPDF/Title-13.pdf",
  "US-AL":"https://alison.legislature.state.al.us/code-of-alabama?section=43-8-270",
  "US-AZ":"https://www.azleg.gov/ars/14/02516.htm",
  "US-CA":"https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=8200.&lawCode=PROB",
  "US-CO":"https://olls.info/crs/crs2026-title-15.htm",
  "US-CT":"https://prdext2.cga.ct.gov/2025/pub/chap_802b.htm#sec_45a-282",
  "US-DC":"https://www.dccourts.gov/superior-court/superior-court-divisions/probate-division/filing-a-will",
  "US-DE":"https://delcode.delaware.gov/title12/c013/",
  "US-FL":"https://www.flsenate.gov/Laws/Statutes/2026/732.901",
  "US-GA":"https://columbusga.gov/probate/Estates/Probate-with-a-Will",
  "US-HI":"https://data.capitol.hawaii.gov/hrscurrent/Vol12_Ch0501-0588/HRS0560/HRS_0560-0002-0516.htm",
  "US-IA":"https://www.legis.iowa.gov/docs/code/2026/633.285.pdf",
  "US-IL":"https://www.ilga.gov/documents/legislation/ilcs/documents/075500050K6-1.htm",
  "US-IN":"https://public.courts.in.gov/Decisions/api/Document/Opinion?Id=4Ya3s6RY8c_AFvfel2RqA8yheBqvJcApP0kcrf1hubc4KdAvzb30E5j8NlurvUCV0#page=17",
  "US-KS":"https://www.kslegislature.gov/b2025_26/laws/059_000_0000_chapter/059_006_0000_article/059_006_0021_section/059_006_0021_k/",
  "US-LA":"https://www.legis.la.gov/Legis/LawPrint.aspx?d=111550",
  "US-MD":"https://registers.maryland.gov/main/publications/AdministrationBooklet2025.pdf",
  "US-MA":"https://malegislature.gov/Laws/GeneralLaws/PartII/TitleII/Chapter190B/ArticleII/Section2-516",
  "US-SC":"https://www.scstatehouse.gov/code/t62c002.php",
  "US-WI":"https://docs.legis.wisconsin.gov/statutes/statutes/856.pdf",
  "US-WY":"https://www.wyoleg.gov/statutes/compress/title02.pdf",
  "US-ME":"https://legislature.maine.gov/statutes/18-C/title18-Csec2-515.html",
  "US-MI":"https://www.legislature.mi.gov/Laws/MCL?objectName=MCL-700-2516",
  "US-MN":"https://www.revisor.mn.gov/statutes/cite/524.2-516",
  "US-MO":"https://revisor.mo.gov/main/OneSection.aspx?section=473.043",
  "US-MT":"https://mca.legmt.gov/bills/mca/title_0720/chapter_0020/part_0050/section_0360/0720-0020-0050-0360.html",
  "US-NH":"https://gc.nh.gov/rsa/html/lvi/552/552-mrg.htm",
  "US-ND":"https://ndlegis.gov/prod/cencode/t30-1c11.pdf",
  "US-NE":"https://nebraskalegislature.gov/laws/statutes.php?statute=30-2356",
  "US-NM":"https://nmonesource.com/nmos/nmsa/en/4393/1/document.do#page=107",
  "US-NV":"https://www.leg.state.nv.us/NRS/NRS-136.html#NRS136Sec050",
  "US-OK":"https://www.oklegislature.gov/OK_Statutes/CompleteTitles/os58.pdf#page=16",
  "US-OR":"https://www.oregonlegislature.gov/bills_laws/ors/ors112.html",
  "US-RI":"https://webserver.rilegislature.gov/Statutes/TITLE33/33-7/33-7-5.htm",
  "US-SD":"https://sdlegislature.gov/Statutes/29A-2-516",
  "US-TN":"https://law.justia.com/cases/tennessee/court-of-appeals/2023/e2022-01476-coa-r3-cv.html",
  "US-TX":"https://tcss.legis.texas.gov/resources/ES/htm/ES.252.htm#252.201",
  "US-VT":"https://legislature.vermont.gov/statutes/section/14/003/00103",
  "US-WA":"https://app.leg.wa.gov/rcw/default.aspx?cite=11.20.010",
  "US-WV":"https://code.wvlegislature.gov/41-5-1/",
  CH:"https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#art_556",
  DE:"https://www.gesetze-im-internet.de/bgb/__2259.html",
  HR:"https://narodne-novine.nn.hr/clanci/sluzbeni/2003_03_48_604.html",
  EE:"https://www.riigiteataja.ee/et/akt/P%C3%A4rS#para26",
  PL:"https://dziennikustaw.gov.pl/D2026000046801.pdf",
};
export const procedureTitle = {
  NL: "Private will for deposit with a Dutch civil-law notary",
  PT: "International will for signing in Portugal",
  MT: "Secret will for formal delivery in Malta",
};
export const procedureIntro = {
  NL: "Prepare your private will here. You will sign it, sign each numbered page, and personally deposit it with a Dutch civil-law notary. The appointment and custody deed are essential. The notary may charge a fee.",
  PT: "Prepare an international will here, even for property entirely in Portugal. You will need a Portuguese notary and two eligible witnesses together for the signing. The notary may charge a fee.",
  MT: "Prepare a secret will here, then sign, seal and formally deliver the original in person through the Maltese notarial or court procedure. The receiving office may charge a fee.",
};
export const appointmentRequest = {
  MT: "Ask a Maltese notary or the Court of Voluntary Jurisdiction (Volontarja) for an appointment to deliver a testment sigriet in person.",
  NL: "In the European Netherlands, ask a civil-law notary for a depot-testament and an akte van bewaargeving under article 4:95 BW. The notary may require two witnesses.",
  PT: "Ask a Portuguese notary to approve a testamento internacional under the Washington Convention. Confirm the two witnesses and any interpreter with the office before the appointment.",
};
export const appointmentContacts = {
  MT: [["Find a notary", "https://notariesofmalta.org/findnotary.php"], ["Contact the court registry", "https://courts.gov.mt/telephone-list/"]],
  NL: [["Find a notary", "https://www.notaris.nl/algemeen/zoek-een-notaris"]],
  PT: [["Find a notary", "https://notarios.pt/"]],
};
export const appointmentPapers = "Print 01-Will-for-formal-completion.pdf on one side of each sheet. Bring the complete original and valid identification. Ask the office what other documents it needs and what it charges.";
export const appointmentInterpreter = "An interpreter may help you communicate with the notary at the appointment. You must be able to read the will yourself and make your own choices.";
export const europeanNetherlands = "Is your permanent home in the European Netherlands, and is this estate governed by its law?";
export const dutchWitnesses = "Agree with the notary whether to present the original open or sealed. Choose a notary and any witnesses who receive nothing under your will. The notary checks the witnesses’ eligibility.";
export const dutchWitnessEligibility = "If witnesses are required, choose two adults who live in the Netherlands and understand the language of the custody deed. Ask the office to check whether family ties to you or the notary disqualify them.";
export const malteseNotary = "With a notary, declare that the sealed document contains your will. Sign the act of delivery on the document or envelope with the notary and any witnesses. You may request two witnesses. If you decline them, the notary records your choice. The notary must present the original to the court within four working days.";
export const malteseCourt = "If you go directly to court, give the sealed original to the registrar before the judge or magistrate. Declare that it contains your will. Countersign the registrar’s note with the judge or magistrate and take your receipt.";
export const portugueseWitnesses = "Have the notary check two adults who understand Portuguese and can sign. Exclude beneficiaries, staff of that office, spouses and close relatives of you or the notary, and witnesses married to each other. An interpreter cannot serve as a witness.";
export const portugueseApproval = "The notary draws up the approval immediately after the signing, initials the sheets, attaches the Convention certificate and registers the approval. Leave space below the last signature and date for the notary.";
export const depositCustody = {
  MT: "The date you deliver the will to the notary or court is its legal date. Keep the court receipt or ask your notary for proof of delivery. Tell a trusted person which court holds the original.",
  NL: "The notary keeps the original and reports the deposit to the Centraal Testamentenregister. Keep a copy of the custody deed and tell a trusted person which notary holds your will.",
  PT: "Keep your copy of the certificate. You can keep the original, entrust it to someone or deposit it with a notary. If privately held, its holder must present it to a notary in the area where the document is located within three days of learning of your death.",
};
export const procedures = {
  NL: [
    "Arrange to deposit this will with a Dutch civil-law notary under Book 4, articles 94 and 95 of the Dutch Civil Code. You must be able to read the will yourself. Ask which language the notary will use for the separate deed of deposit. If you do not understand that language well enough, an interpreter must attend when the deed is signed.",
    dutchWitnesses,
    dutchWitnessEligibility,
    "Review the complete printed original and agree with the notary where and when to sign. Sign at the end of the will. If the will has more than one page, enter the page numbers in order on the lines provided and put your full signature on every page.",
    "Personally hand your original to the notary. Declare that it contains your will and that you met the requirements for signatures and page numbering. You and the notary sign the separate deed of custody that the notary prepares. The original stays with the notary. Signing at home alone does not complete the deposit.",
  ],
  PT: [
    "Tell a Portuguese notary in advance that you intend to use the international-will procedure under the Washington Convention (not an ordinary closed will). Arrange two eligible independent witnesses and, if needed, a qualified interpreter. A domestic estate can use this form. The international will may be written in any language.",
    portugueseWitnesses,
    "If you do not understand Portuguese, choose an interpreter unless the notary can translate the official act for you. An interpreter who takes part also signs the notarial act.",
    "For the official records, you and both witnesses should bring identification and know your full names, addresses, dates and places of birth. Also have your parents’ full names ready. Give these details to the notary.",
    "Take one full printed original. With both witnesses and the authorized notary together, personally declare that this document is your will and that you know its contents. They do not have to know the gifts. For this kit, leave all signatures until this meeting.",
    "In their presence, sign each numbered sheet and sign at the end. Both witnesses and the notary then sign at the end while you are present. The notary writes the date of their signature at the end, prepares the prescribed separate certificate, keeps one copy and gives you another. Discuss safekeeping and the official record with the notary.",
    portugueseApproval,
  ],
  MT: [
    "Before signing, arrange delivery of a secret will and check the language, identification and envelope requirements with a Maltese notary or the Registrar of the Court of Voluntary Jurisdiction. This route is for someone who can personally read, sign and express their wishes without an interpreter. You can request English for the notarial act.",
    "For the court record, have your identification, residence, date and place of birth, civil status, and your and your parents’ full names and surnames at birth ready. Give these details to the receiving office.",
    "Read all the provisions and personally sign at the very end. Close and seal the will or its envelope. Leave the outside clear for the official act. Take it yourself; sending the PDF or keeping the sealed envelope at home does not complete the will.",
    malteseNotary,
    malteseCourt,
  ],
};
export const extraSources = {
  "US-AK": ["https://courts.alaska.gov/shc/probate/transferring-assets.htm"],
  "US-AR": ["https://www.arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2003%2FPublic%2FACT610.pdf", "https://www.arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2009%2FPublic%2FACT346.pdf"],
  "US-HI": ["https://health.hawaii.gov/vitalrecords/reciprocal-beneficiary-relationships/", "https://data.capitol.hawaii.gov/hrscurrent/Vol12_Ch0501-0588/HRS0560/HRS_0560-0002-0202.htm", "https://dhhl.hawaii.gov/lessee-information/designating-successors-qa/"],
  "US-TN": ["https://s3.amazonaws.com/publications.tnsosfiles.com/acts/111/pub/pc0340.pdf"],
  AT: ["https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=677","https://www.oesterreich.gv.at/de/themen/gesetze_und_recht/erben_und_vererben/2/Seite.791070"],
  DE: ["https://www.gesetze-im-internet.de/bgb/__2097.html","https://www.gesetze-im-internet.de/bgb/__2271.html","https://www.gesetze-im-internet.de/bgb/__2289.html"],
  FI: ["https://www.finlex.fi/fi/lainsaadanto/1965/40", "https://www.valtiokonttori.fi/palvelut/perinto-ja-testamenttiasiat/"],
  SE: ["https://www.kammarkollegiet.se/vara-tjanster/allmanna-arvsfonden/nar-det-finns-ett-testamente"],
  "GB-SCT": ["https://www.legislation.gov.uk/ukpga/1995/7/section/3", "https://www.legislation.gov.uk/asp/2016/7/section/9", "https://www.crofting.scotland.gov.uk/applications-and-notifications/application-notification-types/testate-succession-bequest-of-croft-tenancy-notification-to-landlords/"],
  "GB-NIR": ["https://www.legislation.gov.uk/nisi/1994/1899/article/20", "https://www.legislation.gov.uk/nisi/1994/1899/article/30", "https://www.gov.uk/hmrc-internal-manuals/inheritance-tax-manual/ihtm12194"],
  IE: ["https://revisedacts.lawreform.ie/eli/1965/act/27/section/93/revised/en/html", "https://revisedacts.lawreform.ie/eli/1965/act/27/section/5/revised/en/html"],
  CH: ["https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#art_487", "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#art_572"],
  BE: ["https://www.ejustice.just.fgov.be/eli/loi/2022/01/19/2022B30600/justel"],
  SG: ["https://www.hdb.gov.sg/sitecore/content/hdbinfoweb/home/managing-my-home/home-ownership/change-of-flat-owners-or-occupiers/retain-flat-following-life-events", "https://sso.agc.gov.sg/SL-Supp/S720-2024/Published/20240916?DocDate=20240916", "https://www.judiciary.gov.sg/services/e-platforms/probate-eservice", "https://sso.agc.gov.sg/Act/CLA1909?ProvIds=pr30-", "https://www.cpf.gov.sg/service/article/what-are-the-cpf-monies-and-assets-of-a-deceased-member-covered-under-a-cpf-nomination"],
  "CA-QC": ["https://www.quebec.ca/en/justice-et-etat-civil/testament-succession/succession/settlement/succession-will/probating","https://www.quebec.ca/justice-et-etat-civil/testament-succession/succession/a-faire/recherche-testament","https://www.legisquebec.gouv.qc.ca/en/pdf/cs/CCQ-1991.pdf"],
  "CA-AB": ["https://kings-printer.alberta.ca/documents/Acts/W12P2.pdf"],
  "CA-YT": ["https://laws.yukon.ca/cms/images/LEGISLATION/acts/wills_ata2020.pdf"],
  "CA-NT": ["https://gnwt.ca/resources/questions-and-answers-about-wills"],
  "CA-NU": ["https://www.nunavutlegislation.ca/en/file-download/download/public/2367","https://www.nunavutlegislation.ca/en/file-download/download/public/8682"],
  NL: ["https://zoek.officielebekendmakingen.nl/stb-2002-430.html","https://wetten.overheid.nl/BWBR0010388/","https://www.knb.nl/ons-beroep/bedrijfsvoering/tolken-taal-akte/","https://www.notaris.nl/page/centraal-testamentenregister"],
  PT: ["https://www.unidroit.org/instruments/international-will/","https://www.unidroit.org/instruments/international-will/status/","https://diariodarepublica.pt/dr/detalhe/decreto-lei/177-1979-383392","https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1995-34509175","https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1966-34509075"],
  MT: ["https://legislation.mt/eli/cap/16/eng/pdf","https://legislation.mt/eli/cap/55/eng/pdf","https://legislation.mt/eli/cap/12/eng/pdf"],
  "GB-ENG":["https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/27", "https://www.gov.uk/make-will/make-sure-your-will-is-legal","https://www.legislation.gov.uk/ukpga/1975/63/section/1","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/33A","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/18A","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/18C","https://www.legislation.gov.uk/ukpga/Geo5/15-16/20/section/184"],
  "GB-WLS":["https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/27", "https://www.gov.uk/make-will/make-sure-your-will-is-legal","https://www.legislation.gov.uk/ukpga/1975/63/section/1","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/33A","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/18A","https://www.legislation.gov.uk/ukpga/Will4and1Vict/7/26/section/18C","https://www.legislation.gov.uk/ukpga/Geo5/15-16/20/section/184"],
  SK:["https://e-justice.europa.eu/topics/family-matters-inheritance/inheritance/succession/sk_en"],
  CZ:["https://obcanskyzakonik.justice.cz/images/pdf/Civil-Code.pdf"],
  NZ:["https://www.justice.govt.nz/family/challenge-a-will/apply-to-challenge-a-will/","https://www.legislation.govt.nz/act/public/1949/0033/latest/DLM258709.html","https://www.legislation.govt.nz/act/public/2006/40/en/latest/sections/DLM379487/","https://www.legislation.govt.nz/act/public/1958/37/en/latest/"],
  PL:["https://eli.gov.pl/eli/DU/2026/795/ogl"],
  NO:["https://lovdata.no/dokument/NL/lov/2019-06-14-21","https://lovdata.no/nav/lov/2019-06-14-21/kap9","https://lovdata.no/lov/2019-06-14-21/§22"],
  IS:["https://www.althingi.is/lagas/nuna/1991020.html", "https://island.is/en/einkaskipti-a-danarbui/What-requirements-must-be-met", "https://www.althingi.is/lagas/nuna/1962008.html"],
  DK:["https://www.retsinformation.dk/eli/lta/2021/1347/pdf"],
  EE:["https://www.riigiteataja.ee/en/akt/520032025009", "https://parimine.notar.ee/en/estate-planning/wills-succession-contracts-gifts/"],
  "CA-PE":["https://www.princeedwardisland.ca/sites/default/files/1707/S-12-Survivorship%20Act.pdf"],
  "CA-SK":["https://pubsaskdev.blob.core.windows.net/pubsask-prod/1423/S67-1.pdf"],
  "CA-NB":["https://laws.gnb.ca/en/document/cs/2012%2C%20c.116","https://www2.gnb.ca/content/dam/gnb/Departments/ag-pg/PDF/ActsLois/2025/Chap-43.pdf","https://www.gnb.ca/content/dam/GNB3/gov/gazette/2026/rg-2026-10-14.pdf#page=2","https://laws.gnb.ca/en/document/cs/a-4"],
  "CA-BC":["https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/09013_01#section10","https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/09013_01#section46"],
  "US-MI":["https://legislature.mi.gov/Laws/MCL?objectName=MCL-700-2702"],
  "US-ME":["https://legislature.maine.gov/statutes/18-C/title18-Csec2-608.html", "https://legislature.maine.gov/statutes/18-C/title18-Csec2-702.html"],
  "US-CA":["https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=641.&lawCode=PROB", "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=6211.&lawCode=PROB","https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=6224.&lawCode=PROB","https://courts.ca.gov/cms/rules/index/seven/rule7_201","https://courts.ca.gov/cms/rules/index/seven/rule7_652"],
  "US-NY":["https://www.nysenate.gov/legislation/laws/EPT/10-6.1", "https://www.nysenate.gov/legislation/laws/EPT/2-1.6","https://www.nysenate.gov/legislation/laws/CVP/2101"],
  "US-TX":["https://tcss.legis.texas.gov/resources/ES/htm/ES.255.htm#255.351", "https://tcss.legis.texas.gov/resources/ES/htm/ES.102.htm", "https://tcss.legis.texas.gov/resources/FA/htm/FA.2.htm#2.401", "https://sll.texas.gov/faqs/common-law-marriage/"],
  "US-VT":["https://legislature.vermont.gov/statutes/section/14/042/00337"],
  "US-MD":["https://mgaleg.maryland.gov/2026RS/chapters_noln/Ch_508_sb0250T.pdf"],
  "AU-NSW":["https://legislation.nsw.gov.au/view/html/inforce/current/act-2006-080#sec.35"],
  "AU-QLD":["https://www.legislation.qld.gov.au/view/html/inforce/current/act-1981-069#sec.33B"],
  "AU-TAS":["https://www.legislation.tas.gov.au/view/whole/html/inforce/current/act-2008-058","https://www.legislation.tas.gov.au/view/whole/html/inforce/current/act-1912-007"],
  "AU-ACT":["https://www.legislation.act.gov.au/a/1969-15/","https://www.legislation.act.gov.au/a/1929-18/"],
  "AU-NT":["https://legislation.nt.gov.au/en/Legislation/FAMILY-PROVISION-ACT-1970"],
  "AU-WA":["https://legislation.wa.gov.au/legislation/statutes.nsf/law_a382.html"],
  "AU-SA":["https://lsc.sa.gov.au/handbook/ch36s01s06s03.php"],
  "US-LA":["https://legis.la.gov/Legis/Law.aspx?d=108900","https://www.legis.la.gov/legis/Law.aspx?d=111560"],
  "CA-ON":["https://www.ontario.ca/laws/statute/90f03","https://www.ontario.ca/laws/statute/92s30","https://www.ontario.ca/page/estate-planning-and-wills"],
};
