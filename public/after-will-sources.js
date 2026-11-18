import { validPlace } from "./places.js";

// Reading checked November 16, 2026: see docs/review/after-the-will.md.
// Each entry is [publisher, URL, optional topic label]. Regional entries replace
// the national source on the same card. Missing topics do not acquire a foreign link.
const reading = {
  "AT": {
    care: ["oesterreich.gv.at", "https://www.oesterreich.gv.at/en/themen/gesundheit/patientenrechte/3"],
  },
  "AU": {
    beneficiaries: ["Moneysmart (ASIC)", "https://moneysmart.gov.au/how-super-works/who-gets-your-super-if-you-die", "Pension beneficiaries"],
    money: ["Moneysmart (ASIC)", "https://moneysmart.gov.au/plan-for-your-retirement/wills-and-powers-of-attorney"],
  },
  "AU-ACT": {
    care: ["ACT Government", "https://www.act.gov.au/health/end-of-life-and-palliative-care/plan-your-end-of-life-care"],
  },
  "AU-NSW": {
    care: ["Service NSW", "https://www.service.nsw.gov.au/transaction/make-an-advance-care-directive-a-living-will"],
  },
  "AU-NT": {
    care: ["Northern Territory Government", "https://nt.gov.au/law/rights/advance-personal-plan"],
  },
  "AU-QLD": {
    care: ["Office of the Public Guardian, Queensland", "https://www.publicguardian.qld.gov.au/making-decisions/future-planning/advance-health-directive"],
  },
  "AU-SA": {
    care: ["Government of South Australia", "https://www.sa.gov.au/topics/family-and-community/planning-ahead/advance-care-directives"],
  },
  "AU-TAS": {
    care: ["Service Tasmania", "https://www.service.tas.gov.au/services/justice-crime-and-the-law/help-in-planning-end-of-life-legal-documents/advance-care-directive/"],
  },
  "AU-VIC": {
    care: ["Department of Health, Victoria", "https://www.health.vic.gov.au/advance-care-planning/forms"],
  },
  "AU-WA": {
    care: ["Department of Health, Western Australia", "https://www.health.wa.gov.au/articles/a_e/advance-health-directives"],
  },
  "BE": {
    care: ["FOD Volksgezondheid", "https://www.health.belgium.be/nl/themas/gezondheid/jouw-gezondheid/jij-patient/je-rechten-patient"],
  },
  "CA": {
    money: ["Government of Canada", "https://www.canada.ca/en/employment-social-development/corporate/seniors-forum-federal-provincial-territorial/power-attorney-financial.html"],
    beneficiaries: ["Financial Consumer Agency of Canada", "https://www.canada.ca/en/financial-consumer-agency/services/insurance/life.html", "Life insurance beneficiaries"],
    funeral: ["Office of Consumer Affairs", "https://ised-isde.canada.ca/site/office-consumer-affairs/en/modern-marketplace/funerals", "Funeral or memorial"],
  },
  "CA-AB": {
    care: ["Government of Alberta", "https://www.alberta.ca/decision-making-advance-planning"],
  },
  "CA-BC": {
    care: ["HealthLink BC", "https://www.healthlinkbc.ca/health-library/health-features/advance-care-planning"],
  },
  "CA-MB": {
    care: ["Manitoba Health", "https://www.gov.mb.ca/health/livingwill.html"],
  },
  "CA-NB": {
    care: ["Government of New Brunswick", "https://www.gnb.ca/en/topic/health-wellness/manage-health-disease/dementia/legal-planning.html"],
  },
  "CA-NL": {
    care: ["House of Assembly of Newfoundland and Labrador", "https://www.assembly.nl.ca/legislation/sr/statutes/a04-1.htm", "Advance care law"],
  },
  "CA-NS": {
    care: ["Nova Scotia Department of Justice", "https://novascotia.ca/just/pda/"],
  },
  "CA-NT": {
    care: ["Northwest Territories Health and Social Services", "https://www.hss.gov.nt.ca/en/services/personal-directives"],
  },
  "CA-NU": {
    care: ["Government of Nunavut", "https://www.gov.nu.ca/en/health/community-health-centres", "Find a community health centre"],
  },
  "CA-ON": {
    care: ["Government of Ontario", "https://www.ontario.ca/page/make-power-attorney"],
    money: ["Publications Ontario", "https://www.publications.gov.on.ca/300975"],
  },
  "CA-PE": {
    care: ["Health PEI", "https://www.princeedwardisland.ca/en/information/health-pei/advance-care-planning"],
  },
  "CA-QC": {
    care: ["Gouvernement du Québec", "https://www.quebec.ca/en/health/health-system-and-services/end-of-life-care/advance-medical-directives/description"],
    money: ["Curateur public du Québec", "https://www.quebec.ca/en/justice-and-civil-status/legal-protection/protection-mandate/about-protection-mandate"],
    beneficiaries: ["Autorité des marchés financiers", "https://lautorite.qc.ca/en/general-public/insurance/life-insurance/8-questions-and-answers-to-demystify-life-insurance", "Life insurance beneficiaries"],
  },
  "CA-SK": {
    care: ["Saskatchewan Health Authority", "https://www.saskhealthauthority.ca/your-health/conditions-illnesses-services-wellness/all-z/advance-care-planning"],
  },
  "CA-YT": {
    care: ["Government of Yukon", "https://yukon.ca/en/advance-directives"],
  },
  "CH": {
    care: ["Bundesamt für Gesundheit", "https://www.bag.admin.ch/de/ihr-recht-auf-willensaeusserung"],
  },
  "CZ": {
    care: ["Národní zdravotnický informační portál", "https://www.nzip.cz/clanek/234-pravo-na-ucineni-drive-vysloveneho-prani"],
  },
  "DE": {
    care: ["Bundesministerium für Gesundheit", "https://www.bundesgesundheitsministerium.de/patientenverfuegung"],
  },
  "DK": {
    care: ["borger.dk", "https://www.borger.dk/sundhed-og-sygdom/dine-rettigheder-som-patient/behandlingstestamente"],
    records: ["borger.dk", "https://www.borger.dk/sundhed-og-sygdom/doedsfald--hospice-og-behandlingstestamente/foer-du-gaar-bort/jeg-vil-gerne-planlaegge"],
  },
  "EE": {
    care: ["Sotsiaalministeerium", "https://www.sm.ee/patsiendi-elulopu-tahteavalduse-korduma-kippuvad-kusimused"],
  },
  "FI": {
    care: ["Kanta", "https://www.kanta.fi/en/living-will-and-organ-donation-testament"],
  },
  "GB": {
    beneficiaries: ["MoneyHelper", "https://www.moneyhelper.org.uk/en/pensions-and-retirement/pension-problems/pensions-after-death.html", "Pension beneficiaries"],
    trusts: ["GOV.UK", "https://www.gov.uk/trusts-taxes/overview"],
    records: ["MoneyHelper", "https://www.moneyhelper.org.uk/en/family-and-care/death-and-bereavement/putting-your-financial-affairs-in-order-if-you-get-ill-or-die-making-a-will-and-more"],
  },
  "GB-ENG": {
    care: ["NHS", "https://www.nhs.uk/tests-and-treatments/end-of-life-care/planning-ahead/advance-decision-to-refuse-treatment/"],
    money: ["GOV.UK", "https://www.gov.uk/power-of-attorney"],
  },
  "GB-NIR": {
    care: ["Department of Health (Northern Ireland)", "https://www.health-ni.gov.uk/articles/advance-care-planning-now-and-future"],
    money: ["nidirect", "https://www.nidirect.gov.uk/articles/managing-your-affairs-and-enduring-power-attorney"],
  },
  "GB-SCT": {
    care: ["Scottish Government", "https://www.gov.scot/publications/anticipatory-care-planning-frequently-asked-questions/pages/1/"],
    money: ["Office of the Public Guardian (Scotland)", "https://publicguardian-scotland.gov.uk/power-of-attorney/power-of-attorney/types-of-power-of-attorney"],
  },
  "GB-WLS": {
    care: ["Older People’s Commissioner for Wales", "https://olderpeople.wales/future-care-planning-guide-html/"],
    money: ["GOV.UK", "https://www.gov.uk/power-of-attorney"],
  },
  "HR": {
    funeral: ["gov.hr", "https://gov.hr/hr/darivanje-organa/782", "Organ donation"],
    money: ["Hrvatski zavod za socijalni rad", "https://socskrb.hr/djelatnosti/skrbnistvo/", "Choosing a guardian"],
  },
  "IE": {
    care: ["Decision Support Service", "https://www.decisionsupportservice.ie/faq/faq-advance-healthcare-directives"],
  },
  "IS": {
    funeral: ["Heilsuvera", "https://www.heilsuvera.is/efnisflokkar/fyrirbyggjandi/vid-gefum-lif/", "Organ donation"],
    care: ["Landspítali", "https://www.landspitali.is/library/Sameiginlegar-skrar/Gagnasafn/Sjuklingar-og-adstandendur/Sjuklingafraedsla---Upplysingarit/Framkvaemdastjorar-hjukrunar-og-laekninga/Samtal_um_medferdarmarkmid.pdf"],
    money: ["Ísland.is", "https://island.is/radsmenn"],
  },
  "LU": {
    care: ["Guichet.lu", "https://guichet.public.lu/en/citoyens/sante/droits-devoirs-patient/droits-devoirs-patient/personne-confiance.html", "Choosing a health care representative"],
  },
  "MT": {
    care: ["Parliament of Malta", "https://parlament.mt/en/14th-leg/acts/act-xii-of-2026/", "Advance care law"],
  },
  "NL": {
    care: ["Rijksoverheid", "https://www.rijksoverheid.nl/documenten/vraag-en-antwoord/levenseinde-en-euthanasie/wilsverklaring-opstellen"],
  },
  "NO": {
    money: ["Sivilrettsforvaltningen", "https://www.vergemal.no/alternativer-til-vergemal/fremtidsfullmakt"],
    care: ["Helsenorge", "https://www.helsenorge.no/doden/forhandssamtale/"],
  },
  "NZ": {
    money: ["New Zealand Government", "https://www.govt.nz/browse/family-and-whanau/power-of-attorney-enduring-and-ordinary/enduring-power-of-attorney-for-property/"],
    care: ["Advance Care Planning Aotearoa", "https://www.myacp.org.nz/your-plan"],
    records: ["New Zealand Government", "https://www.govt.nz/browse/family-and-whanau/death-and-bereavement/what-to-organise-before-you-die/"],
  },
  "PL": {
    records: ["pacjent.gov.pl", "https://pacjent.gov.pl/twoja-e-dokumentacja-medyczna", "Access to medical records"],
    money: ["Rzecznik Finansowy", "https://rf.gov.pl/edukacja/baza-wiedzy/najczestsze-pytania-i-odpowiedzi-faq/seniorzy-a-pieniadze/"],
    care: ["Rzecznik Praw Pacjenta", "https://www.gov.pl/web/rpp/prawo-pacjenta-do-informacji--fundament-swiadomego-leczenia", "Sharing health information"],
  },
  "PT": {
    care: ["SNS 24", "https://www.sns24.gov.pt/pt/servico/testamento-vital/"],
  },
  "SE": {
    money: ["Sveriges Domstolar", "https://www.domstol.se/amnen/familj/forvaltare-och-framtidsfullmakt/framtidsfullmakt/"],
    care: ["1177", "https://www.1177.se/undersokning-behandling/vard-i-slutet-av-livet/palliativ-vard--att-forlanga-livet-och-lindra-symtom/"],
  },
  "SG": {
    care: ["Ministry of Health, Singapore", "https://www.moh.gov.sg/ageing-well/advance-care-planning/"],
    money: ["Government of Singapore", "https://www.planyourlegacy.gov.sg/get-started/whats-the-difference-between-the-tools/"],
    beneficiaries: ["Central Provident Fund Board", "https://www.cpf.gov.sg/member/account-services/providing-for-your-loved-ones/making-a-cpf-nomination"],
  },
  "SK": {
    beneficiaries: ["Sociálna poisťovňa", "https://www.socpoist.sk/kto-som/sporitel-v-ii-pilieri/dochodok-z-ii-piliera/dalsie-informacie/dochodky-z-ii-piliera-otazky", "Pension beneficiaries"],
    funeral: ["Úrad pre dohľad nad zdravotnou starostlivosťou", "https://www.udzs-sk.sk/sudne-lekarstvo-a-patologicka-anatomia/odber-tkaniv-a-buniek-z-tiel-mrtvych-darcov/", "Organ donation"],
    money: ["Národná banka Slovenska", "https://nbs.sk/dohlad-nad-financnym-trhom/ofs/financne-produkty/bezne-ucty-a-platobne-sluzby/bezny-ucet-a-presun-uctu/"],
    care: ["Slovensko.sk", "https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_poskytovanie-zdravotnej-staros", "Sharing health information"],
  },
  "US": {
    money: ["Consumer Financial Protection Bureau", "https://www.consumerfinance.gov/ask-cfpb/what-is-a-power-of-attorney-poa-en-1149/"],
    beneficiaries: ["Internal Revenue Service", "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-beneficiary", "Pension beneficiaries"],
    trusts: ["Consumer Financial Protection Bureau", "https://www.consumerfinance.gov/ask-cfpb/what-is-a-revocable-living-trust-en-1775/"],
    records: ["National Institute on Aging", "https://www.nia.nih.gov/health/advance-care-planning/getting-your-affairs-order-checklist-documents-prepare-future"],
    funeral: ["Federal Trade Commission", "https://consumer.ftc.gov/articles/shopping-funeral-services", "Funeral or memorial"],
  },
  "US-AK": {
    care: ["Alaska Court System", "https://courts.alaska.gov/shc/probate/before-death.htm"],
  },
  "US-AL": {
    care: ["Alabama Department of Public Health", "https://www.alabamapublichealth.gov/providerstandards/advance-directives.html"],
  },
  "US-AR": {
    care: ["University of Arkansas for Medical Sciences", "https://uamshealth.com/patients-and-guests/patient-support/hospital-admission/advance-medical-directives/"],
  },
  "US-AZ": {
    care: ["Arizona Attorney General", "https://www.azag.gov/issues/elder-affairs/life-care-planning"],
  },
  "US-CA": {
    care: ["California Department of Justice", "https://www.oag.ca.gov/consumers/general/care"],
    trusts: ["California Department of Justice", "https://www.oag.ca.gov/consumers/general/estate-finance"],
  },
  "US-CO": {
    care: ["University of Colorado School of Medicine", "https://medschool.cuanschutz.edu/coloradocareplanning/roadmap/write-down-your-wishes"],
  },
  "US-CT": {
    care: ["Connecticut Attorney General", "https://portal.ct.gov/AG/Health-Issues/Connecticuts-Living-Will-Laws"],
  },
  "US-DC": {
    care: ["Council of the District of Columbia", "https://code.dccouncil.gov/us/dc/council/code/sections/21-2207", "Choosing a health care representative"],
  },
  "US-DE": {
    care: ["Delaware Health and Social Services", "https://dhss.delaware.gov/dsaapd/division-of-services-for-aging-and-adults-with-physical-disabilities/advance-directives/"],
  },
  "US-FL": {
    care: ["Florida Agency for Health Care Administration", "https://quality.healthfinder.fl.gov/report-guides/advance-directives"],
  },
  "US-GA": {
    care: ["Georgia Department of Law", "https://consumer.georgia.gov/advance-directives"],
  },
  "US-HI": {
    care: ["Hawaiʻi Executive Office on Aging", "https://health.hawaii.gov/eoa/ad/"],
  },
  "US-IA": {
    care: ["University of Iowa Health Care", "https://uihc.org/advance-directives"],
  },
  "US-ID": {
    care: ["Idaho Department of Health and Welfare", "https://healthandwelfare.idaho.gov/services-programs/birth-marriage-death-records/advance-directives-and-registry-services"],
  },
  "US-IL": {
    care: ["Illinois Department on Aging", "https://ilaging.illinois.gov/aboutus/legal-adv-directives.html"],
  },
  "US-IN": {
    care: ["Indiana Department of Health", "https://www.in.gov/health/cshcr/healthcare-quality-resource-center/advance-directives-resource-center/"],
  },
  "US-KS": {
    care: ["Kansas Department of Health and Environment", "https://www.kdhe.ks.gov/1330/Advance-Care-Planning"],
  },
  "US-KY": {
    care: ["Kentucky Attorney General", "https://www.ag.ky.gov/Resources/Consumer-Resources/seniors/Pages/Living-Wills-in-Kentucky.aspx"],
  },
  "US-LA": {
    care: ["Louisiana Secretary of State", "https://www.sos.la.gov/our-office/end-of-life-registry-programs"],
  },
  "US-MA": {
    care: ["Massachusetts Legislature", "https://malegislature.gov/Laws/GeneralLaws/PartII/TitleII/Chapter201D/Section2", "Choosing a health care representative"],
  },
  "US-MD": {
    care: ["Maryland Department of Health", "https://health.maryland.gov/phpa/ccdb/ADP/Pages/Individual-Resources.aspx"],
  },
  "US-ME": {
    care: ["Maine Legislature", "https://www.legislature.maine.gov/statutes/18-C/title18-Csec5-805.html", "Advance care law"],
  },
  "US-MI": {
    care: ["Michigan Office of Retirement Services", "https://www.michigan.gov/orsschools/after-retirement/power-of-attorney-and-advance-directive-resources"],
  },
  "US-MN": {
    care: ["Minnesota Attorney General", "https://ag.state.mn.us/Consumer/Handbooks/Probate/CH6.asp"],
  },
  "US-MO": {
    care: ["University of Missouri Health Care", "https://www.muhealth.org/your-visit/patient-rights/advance-directive"],
  },
  "US-MS": {
    care: ["Mississippi Access to Justice Commission", "https://msatjc.org/estate-issues"],
  },
  "US-MT": {
    care: ["Montana Judicial Branch", "https://courts.mt.gov/Forms/endoflife"],
  },
  "US-NC": {
    care: ["North Carolina General Assembly", "https://www.ncleg.gov/enactedlegislation/statutes/html/bysection/chapter_32a/gs_32a-25.1.html", "Choosing a health care representative"],
  },
  "US-ND": {
    care: ["North Dakota Health Information Network", "https://www.ndhin.nd.gov/services-0/nd-health-care-directive-registry"],
  },
  "US-NE": {
    care: ["Nebraska Judicial Branch", "https://nebraskajudicial.gov/self-help/medical/power-attorney-medical", "Choosing a health care representative"],
  },
  "US-NH": {
    care: ["New Hampshire General Court", "https://gc.nh.gov/rsa/html/X/137-J/137-J-20.htm", "Advance care law"],
  },
  "US-NJ": {
    care: ["New Jersey Department of Health", "https://www.nj.gov/health/advancedirective/ad/what-is/"],
  },
  "US-NM": {
    care: ["University of New Mexico School of Medicine", "https://hsc.unm.edu/medicine/departments/pediatrics/divisions/continuum-of-care/ad.html"],
  },
  "US-NV": {
    care: ["Nevada Legislature", "https://www.leg.state.nv.us/nrs/nrs-162a.html", "Advance care law"],
  },
  "US-NY": {
    care: ["New York Attorney General", "https://ag.ny.gov/publications/advance-directives"],
  },
  "US-OH": {
    care: ["Ohio State University Wexner Medical Center", "https://wexnermedical.osu.edu/patient-and-visitor-guide/advance-directives-and-code-status"],
  },
  "US-OK": {
    care: ["Oklahoma Human Services", "https://oklahoma.gov/content/dam/ok/en/okdhs/documents/okdhs-publication-library/87-07W_AdvanceDirectiveforHealthCare_as_12292020.pdf"],
  },
  "US-OR": {
    care: ["Oregon Health Authority", "https://www.oregon.gov/oha/PH/ABOUT/Pages/ADAC-Forms.aspx"],
  },
  "US-PA": {
    care: ["Pennsylvania Department of Aging", "https://www.pa.gov/agencies/aging/pa-carekit/caregiving-resources/end-of-life-care"],
  },
  "US-RI": {
    care: ["Rhode Island Department of Health", "https://health.ri.gov/death-and-dying/end-life-decisions-advanced-directives?language=en"],
  },
  "US-SC": {
    care: ["South Carolina Department on Aging", "https://aging.sc.gov/programs-initiatives/legal-assistance-older-adults"],
  },
  "US-SD": {
    care: ["South Dakota Department of Health", "https://doh.sd.gov/healthcare-professionals/advance-directives-and-medical-orders/"],
  },
  "US-TN": {
    care: ["Tennessee Health Facilities Commission", "https://www.tn.gov/hfc/health-care-decision-making/advanced-directives-for-health-care-decision-making--english-.html"],
  },
  "US-TX": {
    care: ["Texas Health and Human Services", "https://fhb.hhs.texas.gov/forms/advance-directives/directive-physicians-family-or-surrogates-living-will"],
  },
  "US-UT": {
    care: ["University of Utah Health", "https://healthcare.utah.edu/patient-family-services/advance-directive"],
  },
  "US-VA": {
    care: ["Virginia General Assembly", "https://law.lis.virginia.gov/vacode/title54.1/chapter29/section54.1-2984/", "Advance care law"],
  },
  "US-VT": {
    care: ["Vermont Department of Health", "https://www.healthvermont.gov/systems/advance-directives/create-register-and-make-changes-advance-directive"],
  },
  "US-WA": {
    care: ["Washington Department of Social and Health Services", "https://www.dshs.wa.gov/legal-planning"],
  },
  "US-WI": {
    care: ["Wisconsin Department of Health Services", "https://www.dhs.wisconsin.gov/forms/advdirectives/index.htm"],
  },
  "US-WV": {
    care: ["West Virginia Legislature", "https://code.wvlegislature.gov/16-30-4/", "Advance care law"],
  },
  "US-WY": {
    care: ["Wyoming Judicial Branch", "https://www.wyocourts.gov/legal-help-by-topic/advance-directive/"],
  },
};

// Only alternate editions verified to cover the same resource and jurisdiction.
const editions = {
  "CA-QC/care": {"fr": ["Gouvernement du Québec", "https://www.quebec.ca/sante/systeme-et-services-de-sante/soins-de-fin-de-vie/directives-medicales-anticipees/description"]},
  "CA-QC/money": {"fr": ["Gouvernement du Québec", "https://www.quebec.ca/justice-et-etat-civil/protection-legale/mandat-de-protection/a-propos-mandat-de-protection"]},
  "CA-QC/beneficiaries": {"fr": ["Autorité des marchés financiers", "https://lautorite.qc.ca/grand-public/assurance/assurance-vie/8-questions-et-reponses-pour-demystifier-lassurance-vie"]},
  "CA/beneficiaries": {"fr": ["Agence de la consommation en matière financière du Canada", "https://www.canada.ca/fr/agence-consommation-matiere-financiere/services/assurance/vie.html"]},
  "CA/money": {"fr": ["Gouvernement du Canada", "https://www.canada.ca/fr/emploi-developpement-social/ministere/forum-federal-provincial-territorial-aines/procurations-comptes-conjoints.html"]},
  "CA-ON/care": {"fr": ["Gouvernement de l’Ontario", "https://www.ontario.ca/fr/page/donner-une-procuration"]},
  "CA-ON/money": {"fr": ["Gouvernement de l’Ontario", "https://www.ontario.ca/fr/page/donner-une-procuration"]},
  "CA/funeral": {"fr": ["Bureau de la consommation", "https://ised-isde.canada.ca/site/bureau-consommation/fr/marche-daujourdhui/funerailles"]},
};

export const readingTopics = Object.freeze({
  care: "Care planning", money: "Financial decisions", beneficiaries: "Beneficiary rules",
  trusts: "Trust guidance", records: "Important records", funeral: "Funeral or donation wishes",
});

export function afterWillReading(place, language = "en") {
  if (!validPlace(place)) return [];
  const {country, region} = place;
  const key = region ? country + "-" + region : country;
  const result = [];
  for (const [topic, defaultLabel] of Object.entries(readingTopics)) {
    const area = reading[key]?.[topic] ? key : country;
    const source = reading[area]?.[topic];
    if (!source) continue;
    const [publisher, url, label = defaultLabel] = source;
    const edition = editions[area + "/" + topic]?.[language];
    result.push({topic, area, label, publisher:edition?.[0] || publisher, url:edition?.[1] || url});
  }
  return result;
}

const careExamples = {
  "CA-ON": "In Ontario, a power of attorney for personal care lets you name a decision-maker. A separate power of attorney for property covers financial decisions.",
  "CA-QC": "In Québec, advance medical directives record treatment choices for specific situations. A protection mandate is a separate document for naming someone to act for you.",
  "GB-ENG": "In England and Wales, an advance decision can record treatment you would refuse. A health and welfare lasting power of attorney names someone who can make decisions for you if you cannot.",
};
careExamples["GB-WLS"] = careExamples["GB-ENG"];

export function afterCareExample(place) {
  return validPlace(place) ? careExamples[place.country + "-" + place.region] || "" : "";
}
