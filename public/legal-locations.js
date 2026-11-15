import { sentence, translatedList, wording } from "./locale.js";
import { executionProfile, copyByHand } from "./markets.js";
import { courtVenue, procedureIntro } from "./procedures.js";

function paper(p) {
  if (p.key === "EE") return "This domestic will requires two eligible witnesses. It expires after six months if you are still alive. A notarial will is another option.";
  if (p.key === "GB-SCT") return "For the paper will in this kit, sign each sheet and have one eligible witness watch and sign the last page. Follow the steps in your kit.";
  if (p.key === "US-PA") return "This kit uses a paper will that you personally sign at the end. Follow the Pennsylvania instructions, including the difference between signing the will and proving it later.";
  if (p.key === "CA-ON") return "For the printed will, sign with two eligible witnesses present together. They both sign in your presence. The kit includes the steps for an in-person signing.";
  return "Print the will and follow the local signing and witness instructions in 02-Signing-and-next-steps.pdf. Check who can witness, who must be present together and which pages to sign.";
}

export function completionSummary(p) {
  if (p.route === "statutory") return "Complete Maine’s statutory family will yourself and use its signing and witness instructions.";
  if (p.route === "deposit") return procedureIntro[p.country];
  if (p.route === "handwriting") return "Personally write the entire will by hand. Follow the local dating and signature instructions. Signing the printed reference alone does not make this kind of will.";
  if (p.route === "fixed") return "You choose a blank simple will form and fill it in yourself. It leaves the remainder to one adult, with a backup. Follow the state’s signing and witness instructions.";
  if (p.route === "official") return translatedList([p.region === "TX"
    ? "Complete the Texas court form that matches your family. Follow its instructions to sign with two witnesses and a notary."
    : "Complete the California statutory will. Check all choices, including any gift boxes that require a separate signature, then follow the form’s two-witness instructions.", courtVenue[p.key]]," ");
  return paper(p);
}

function external(text, href) {
  const a = document.createElement("a");
  a.textContent = text;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

export function renderLocalRules(result, p) {
  result.replaceChildren();
  result.hidden = !p;
  if (!p) return;
  const heading = document.createElement("strong");
  heading.textContent = p.label;
  const method = document.createElement("p");
  method.textContent = completionSummary(p);
  result.append(heading, method);
  if (p.handOption) {
    const hand = executionProfile(p, { execution: copyByHand });
    const alternative = document.createElement("p");
    alternative.append("Handwriting is also available. Write the entire will yourself, then follow the dating and signing steps for this method.");
    if (hand.legalSource !== p.legalSource) alternative.append(" ", external("Rules for a handwritten will", hand.legalSource), ".");
    result.append(alternative);
  }
  if (p.key === "US-ME") {
    const alternative = document.createElement("p");
    alternative.append("You may also choose the ", external("Maine statutory family will", "https://legislature.maine.gov/statutes/18-C/title18-Csec2-517.pdf"), " and complete it yourself.");
    result.append(alternative);
  }
  if (p.rule && p.route === "paper" && !["CA-ON", "EE", "GB-SCT", "US-PA"].includes(p.key)) {
    const rule = document.createElement("details");
    const title = document.createElement("summary");
    title.textContent = sentence("Signing rule for {0}", wording(p.name));
    const text = document.createElement("p");
    text.textContent = p.rule;
    const note = document.createElement("p");
    note.textContent = "Use the method in your kit if the law also allows other ways to make a will.";
    rule.append(title, text, note);
    result.append(rule);
  }
  result.append(external(sentence("Read the source for {0} ↗", wording(p.name)), p.legalSource));
}
