// This is an explicit disposition chosen by the maker, not a claim about the
// statewide default. Never add terms to a statutory form or extend them to offices.
export function offersSurvival(p) {
  return ["paper","handwriting"].includes(p.route) &&
    (["US","AU"].includes(p.country) || ["CA-BC","CA-NB","CA-PE","CA-SK"].includes(p.key));
}
export const periodClause = "An individual must survive me by at least 30 days to receive a gift under this will. This applies both to separate gifts and to gifts of the residue to a primary or alternate beneficiary. An individual who does not is treated for those gifts as having died before me. This condition does not apply to an appointment to act, a right protected by law or a distribution under the law of intestacy.";
export const periodGuide = "You chose 30 days for gifts to individuals under this will. If the person dies two days after you, their gift passes under the will as though they died first. An item or cash gift falls into the residue; a failed primary residue gift goes to the named alternate if they meet the same condition. Where this form has no separate gifts, only the residue is affected. Assets outside the will and statutory rights follow their own rules.";
export const canadianGiftChoice = "If a person you name dies too soon to inherit, should their gift follow this will’s other instructions? Their spouse or descendants will take their place only if this will expressly says so.";
export const canadianGiftClause = "If a named beneficiary fails to survive me as this will requires, neither their spouse nor their descendants take that gift in their place, except where this will expressly provides for descendants in a family branch. The other provisions of this will govern the failed gift. A person may still receive a gift in their own name or inherit under the law of intestacy.";
// A survival-only substitute is an express election in these instruments.
export const expressSubstitution = new Set(["CH", "CZ", "DE", "EE", "MT", "PT"]);
// NB Wills Act ss.1.1 and 22 apply the new fallback by date of death, even for older wills.
// An express choice also works before commencement. AB s.33, BC s.46, AT s.604, NO s.74, PL arts.963/1020.
// The separate gifts and appointments must not acquire this residue condition.
// These three U.S. disclaimer acts give priority to the maker's express direction.
const usDisclaimerPlaces = new Set(["US-AK", "US-AR", "US-TN"]);
export const refusalToBackup = new Set(["CA-AB", "CA-BC", "CA-NB", "CA-YT", "CA-QC", "AT", "NO", "PL", ...usDisclaimerPlaces]);
export const refusalClause = "If my first beneficiary survives as required but validly refuses a share of the residue, my named backup takes that share on the same terms. Any residue neither takes passes under intestacy law, subject to my other gifts.";
export const separateRefusalPlaces = new Set(["CA-AB", "CA-BC", "CA-NB", "CA-YT", ...usDisclaimerPlaces]);
export const separateRefusalClause = "If an individual refuses a separate gift of money or a keepsake, that gift falls into the residue. No relative takes that gift in the recipient’s place.";
const usResidueRefusal = "If my first beneficiary survives me by at least 30 days and validly refuses all or part of the residue, I give only the refused share to my named backup if my backup survives me by at least 30 days. If my backup fails the 30-day condition or validly refuses part or all of a share offered to them, the share they do not take passes by intestacy. Each beneficiary keeps any share they are entitled to and did not refuse. If either beneficiary meets the 30-day condition and dies before receiving a share already due to them, their estate takes the share they had not yet received. No relative automatically takes a refused share. A relative may still inherit independently under this will or by intestacy.";
const usSeparateRefusal = "If an individual validly refuses all or part of a separate gift of money or a keepsake, only the refused part falls into the residue. They keep the rest if otherwise entitled to it. No relative takes the refused part in their place. Refusing one gift does not by itself refuse another gift or an appointment.";
export function residueRefusalKey(p) {
  return p.key === "CA-QC" || p.key === "PL" ? "wholeInheritanceRefusal" : "residueRefusal";
}
export function residueRefusalText(p) {
  if (residueRefusalKey(p) === "wholeInheritanceRefusal")
    return "If my first beneficiary survives me but validly renounces the whole inheritance left to them as my residuary heir under this will, my named backup takes it on the same terms if they survive me. If neither takes it, the residue passes under intestacy law, subject to my other gifts. The choice to accept or renounce this inheritance is indivisible.";
  return usDisclaimerPlaces.has(p.key) ? usResidueRefusal : refusalClause;
}
export function separateRefusalText(p) {
  return usDisclaimerPlaces.has(p.key) ? usSeparateRefusal : separateRefusalClause;
}
export const englandWales = p => p.key === "GB-ENG" || p.key === "GB-WLS";
// Wills Act 1837 s.33A supplies this rule to the existing gift-over provisions.
// Explain it in the companion guide; the will itself names who takes next.
export const disclaimerGiftGuide = "If a person validly disclaims a gift under this will or is legally barred by the forfeiture rule from taking it, apply the will’s instructions for that gift as if the person had died immediately before you. This applies only to the affected gift and is subject to any order of the court.";
export const partnerResidue = "If your partner takes the residue, they own it outright and can spend it or leave it to anyone. Your children receive none of that residue under this will. A separate gift you make to a child is still a separate gift.";
export const californiaSpouseChoice = "My spouse or my registered domestic partner, otherwise my descendants";
export const texasResidueChoices = "Choice 1 gives the residue outright to your spouse if they survive you by 30 days. Your children take under this choice only if your spouse does not qualify. Choice 2 gives the residue to your children even if your spouse survives you.";
export const courtOutrightChoice = "Do you want the survivor to own the residue outright, free to spend it or leave it to anyone, with no guaranteed later share for your descendants?";
export const texasChildlessSpouseGift = "On the married Texas form for someone without children, your spouse owns the residue outright if they live 30 days after you. They may spend it or leave it to anyone. The people you list in section 2.3 take under your will only if your spouse fails that survival condition.";
export const statutoryFiveDays = "This form gives no survival period. State law generally requires a beneficiary to outlive you by 120 hours (five days).";
export const floridaSurvival = "Florida has no general five-day survival requirement. If there is insufficient evidence of who died first, Florida’s simultaneous-death rules apply.";
export function courtSpouseInherits(p, a) {
  return (p.key === "US-CA" && a.caBalance?.startsWith("1")) ||
    (p.key === "US-TX" && (a.txChoice === "Choice 1 · Spouse first" ||
      (a.marriage === "Married, spouse living" && a.descendants === "No children or grandchildren")));
}
export function survivalHelp(p) {
  if (p.route === "fixed") return p.key === "US-FL" ? floridaSurvival : statutoryFiveDays;
  if (p.key === "US-CA" || p.route === "statutory") return statutoryFiveDays;
  if (p.key === "US-TX") return "The Texas court form requires a beneficiary to be alive 30 days after your death.";
  return offersSurvival(p) ? "For this form the proposed survival period is 30 days. You will confirm that timing before downloading." :
    (p.civil || p.country==="GB" || p.key === "CA-ON" ? "Local rules apply if the order of deaths is uncertain." : "Local law determines survival. Where it sets a minimum time, someone who dies shortly after you can count as dying first; the alternate gift or residue then applies.");
}
