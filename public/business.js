// Ownership is an interview answer. The operative will uses the same estate gifts for every person.
export const noBusiness = "I don’t own a business";
export const ownsBusiness = "I own a business";
export const soleHeirBusiness = "Do you want everything your estate receives from the business to pass to your sole heir under the same terms as the rest of your estate?";
export const businessFile = "05-Business-next-steps.pdf";
export const businessHelp = "You can make a personal will here if the form fits your plans. The people you choose for what’s left can inherit whatever your estate receives from the business. That could be tools, shares or money from a buyout. If you want a different person to inherit the business, plan that before signing.";
export const businessWords = /\b(?:business|compan(?:y|ies)|self[- ]employed|freelanc(?:e|ing)|shareholder|buyout)\b/i;

export function blankBusinessGuide(p) {
  return p.route === "fixed" || p.route === "statutory";
}

export function businessChecklist(p) {
  const blank = blankBusinessGuide(p);
  const before = [
    blank
      ? "Read every gift in the form, including gifts of land or personal items and the clause for everything left over. Check who would receive anything connected to the business and who would inherit if that person died first."
      : p.key === "SK" ? soleHeirBusiness : "Read the part of your will that gives away the rest of your estate. Check that the people, their shares and the backup choices match what you want for whatever your estate receives from the business. Check that no other gift in the will gives away the same property.",
    "List what you own personally and what belongs to a company, a co-owner or someone else. For example, you may own shares in the company that owns your work van. Your personal will can give away only the rights that pass through your estate.",
    "Check your business agreements, company rules, licences and any loans secured on the business. Can the person or trustee you chose hold your interest? Must someone buy it when you die? If a buyout applies, your estate may receive money instead of the business interest itself.",
    "If you want a different person to inherit the business, want to keep it outside this will, or already have a will dealing with it, take the documents to a local estates professional before signing. Signing another will can revoke an earlier one. Leaving out the business name does not set it aside.",
  ];
  const running = [
    "Write down who is authorised to pay staff, contact customers and deal with the bank if you die. Check with the bank and the other owners about any appointments or permissions needed now. Inheriting an interest does not by itself appoint someone to run a company.",
    "Keep a list of where your agreements, insurance, loan records and accountant’s contact details can be found. Ask your accountant how debts, taxes or a buyout might affect the cash available to your family. Store passwords and access codes securely elsewhere.",
    "Keep this checklist with your business records. It gives nobody property, signing authority or control of a company. Complete the will using the local instructions in your kit.",
  ];
  const sources=[];
  if (p.key === "US-CA") sources.push("California’s statutory will guidance recommends speaking to a lawyer about tax planning if you own business-related assets. See Probate Code section 6240. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=6240.&lawCode=PROB");
  if (p.country === "CA") sources.push("Canadian example of transfer rules and buyouts: https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/share-structure-and-shareholders");
  if (p.key === "GB-ENG" || p.key === "GB-WLS") sources.push("GOV.UK lists business ownership among the reasons to get professional advice about a will: https://www.gov.uk/make-will/writing-your-will");
  if (p.country === "AU") sources.push("Australian Government guide to business succession: https://business.gov.au/planning/business-plans/develop-your-succession-plan");
  const sections=[{title:"Before signing",items:before},{title:"Who could keep things running?",items:running}];
  if(sources.length)sections.push({title:"Local guidance",items:sources});
  return sections;
}
