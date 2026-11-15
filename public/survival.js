// This is an explicit disposition chosen by the maker, not a claim about the
// statewide default. Never add terms to a statutory form or extend them to offices.
export function offersSurvival(p) {
  return ["paper","handwriting"].includes(p.route) &&
    (["US","AU"].includes(p.country) || ["CA-BC","CA-NB","CA-PE","CA-SK"].includes(p.key));
}
export const periodClause = "For every gift under this will, including separate gifts and gifts of the residue to a primary or alternate beneficiary, an individual must survive me by at least 30 days to take. An individual who does not is treated for those gifts as having died before me. This condition does not apply to an appointment to act, a right protected by law or a distribution under the law of intestacy.";
export const periodGuide = "You chose 30 days for gifts to individuals under this will. If the person dies two days after you, their gift passes under the will as though they died first. An item or cash gift falls into the residue; a failed primary residue gift goes to the named alternate if they meet the same condition. Where this form has no separate gifts, only the residue is affected. Assets outside the will and statutory rights follow their own rules.";
export const canadianGiftChoice = "If a person you name dies too soon to inherit, should their gift follow this will’s other instructions? Their spouse or descendants will take their place only if this will expressly says so.";
export const canadianGiftClause = "If a named beneficiary fails to survive me as this will requires, neither their spouse nor their descendants take that gift in their place, except where this will expressly provides for descendants in a family branch. The other provisions of this will govern the failed gift. A person may still receive a gift in their own name or inherit under the law of intestacy.";
export const californiaSpouseChoice = "My spouse or my registered domestic partner, otherwise my descendants";
export const texasResidueChoices = "Choice 1 gives the residue outright to your spouse if they survive you by 30 days. Your children take under this choice only if your spouse does not qualify. Choice 2 gives the residue to your children even if your spouse survives you.";
export const courtOutrightChoice = "Do you want the survivor to own the residue outright, free to spend it or leave it to anyone, with no guaranteed later share for your descendants?";
export const statutoryFiveDays = "This form gives no survival period. State law generally requires a beneficiary to outlive you by 120 hours (five days).";
export const floridaSurvival = "Florida has no general five-day survival requirement. If there is insufficient evidence of who died first, Florida’s simultaneous-death rules apply.";
export function courtSpouseInherits(p, a) {
  return (p.key === "US-CA" && a.caBalance?.startsWith("1")) ||
    (p.key === "US-TX" && a.txChoice === "Choice 1 · Spouse first");
}
export function survivalHelp(p) {
  if (p.route === "fixed") return p.key === "US-FL" ? floridaSurvival : statutoryFiveDays;
  if (p.key === "US-CA" || p.route === "statutory") return statutoryFiveDays;
  if (p.key === "US-TX") return "The Texas court form requires a beneficiary to be alive 30 days after your death.";
  return offersSurvival(p) ? "For this form the proposed survival period is 30 days. You will confirm that timing before downloading." :
    (p.civil || p.country==="GB" || p.key === "CA-ON" ? "Local rules apply if the order of deaths is uncertain." : "Local law determines survival. Where it sets a minimum time, someone who dies shortly after you can count as dying first; the alternate gift or residue then applies.");
}
