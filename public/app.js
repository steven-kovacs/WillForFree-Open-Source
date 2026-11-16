import {disclosesPressure} from "./local-wording.js";
import { cloneOriginal } from "./language-menu.js";
import { currentLanguage, sentence, wording, clearWording, display, editionNotice, translatedList } from "./locale.js";
import { businessFile, ownsBusiness } from "./business.js";
import { QUESTION_LIMIT, replyLimit, setupLengthHint, shortHelp } from "./chat-limits.js";
import { setupConnectionInfo } from "./connection-info.js";
import { setUpInformationNavigation } from "./information-nav.js";
import { YES, STOP, interviewCards, coveredLater, friendlyValue, reviewLabel } from "./interview-copy.js";
import { manageTurn, currentHelp, responseHint, chooseLocalTopic } from "./conversation.js";
import {directSubject, guidance, helpFor, helpMenu, isGeneralTopicRequest, isTopicChoice} from "./interview-help.js";
import { interviewProgress } from "./progress.js";
import { needsAdvice, notesEntries, wishesProfile, item, cash, adviceOption, giftCurrency, giftKey, giftText, giftList, doneGifts, noExtra, giftIntents, keepForAdvice } from "./extras.js";
import { sections } from "./document.js";
import { profile, planDescription, executionProfile } from "./markets.js";
import { locationUI } from "./geo.js";
import {guideResources} from "./guide-sources.js";
import { setupLocationGuidance } from "./will-guide.js";
import { downloadNotice } from "./download-notice.js";
import { completionSummary } from "./legal-locations.js";
import { maineSpouseAmount } from "./procedures.js";
import {
  questions,
  readAnswer,
  preserveAsNotes,
  formatValue,
  authority,
  sensitive,
} from "./will.js";
import {
  help,
  isQuestion,
  topicsFor,
} from "./flow.js";
import { createKit, save, makeAnswerPDF } from "./kit.js";
import {hasPublisherForm} from "./publisher-forms.js";
import {lookupOffer,countDownload} from "./partner-api.js";
import { partnerOffersEnabled, topicHelpEnabled, placeForSession, serviceOpen } from "./release.js";
import { createTopicRequest } from "./topic-request.js";

const $ = (id) => document.getElementById(id);
const panel = $("conversation"),
  feed = $("messages"),
  choices = $("quick"),
  form = $("reply-form"),
  reply = $("reply"),
  review = $("review"),
  done = $("complete");
let data = { version: 2, place: null, answers: {} },
  current = null,
  stage = "home",
  active = null,
  generation = 0,
  busy = false,
  editing = null,
  pendingGiftWho = null,
  pending = false,
  modalAttempt = 0;
const openingLength=setupLengthHint($("opening"),$("opening-length"));
const replyLength=setupLengthHint(reply,$("reply-length"));
let remoteRetryAt=0;
const sponsorDialog = $("sponsor-dialog");
let downloadTrigger = null, offerReceipt = null;
const withOffers = await partnerOffersEnabled();
let cards=[], part=0, shown=null, lastQuestion=null, giftCue=null, earlyGift=false, openingRequest=0;
const receipts=new Set();
const deliberate=[];
const openForKits = await serviceOpen();
if (!openForKits) {
  $("welcome").querySelector(".hero-titlewrap h1").textContent = "WillForFree.";
  $("welcome").querySelector(".hero-lead").textContent = "WillForFree is not open for public downloads yet.";
  $("welcome").querySelector(".hero-chat").hidden = true;
  $("welcome").querySelector(".promises").hidden = true;
}
let remoteHelpAllowed = new URL(location.href).searchParams.get("ai") !== "off";
const geo = locationUI((place) => {
  $("thread-place").textContent = profile(place).label;
}, openForKits);
function el(tag, value, cls) {
  const n = document.createElement(tag);
  if (value !== undefined) n.textContent = value;
  if (cls) n.className = cls;
  return n;
}
function verbatim(tag,value) {
  const node=el(tag,value);node.dataset.verbatim="";return node;
}
function button(label, fn, cls = "choice") {
  const b = el("button", label, cls);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function link(label, url, cls) {
  const a = el("a", label, cls);
  a.href = url;
  if (url.startsWith("https:") || url.startsWith("/forms/")) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
const chatMotion = matchMedia("(prefers-reduced-motion: no-preference)");
function arrive(element, delay = 0) {
  if (!chatMotion.matches) return;
  element.animate(
    [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 180, delay, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" },
  );
}
function message(who, value) {
  const row = el("div", undefined, "msg " + who);
  if (who === "assistant") {
    const icon = el("span", "•");
    icon.setAttribute("aria-hidden","true");
    icon.className = "mini-icon";
    row.append(icon);
  }
  const b = el("div", undefined, "bubble");
  b.append(
    el("strong", who === "assistant" ? "WillForFree: " : "You: ", "message-speaker"),
    who==="user" && value!=="[Private information hidden]" ? verbatim("span",value) : document.createTextNode(value),
  );
  row.append(b);
  feed.append(row);
  // Animate the new contents, leaving the row's scroll anchor at its final position.
  const delay = who === "assistant" && row.previousElementSibling?.classList.contains("user") ? 45 : 0;
  for (const child of row.children) arrive(child, delay);
  const scroll = $("chat-scroll");
  scroll.scrollTop = scroll.scrollHeight;
  return row;
}
function echo(raw) {
  return message("user", sensitive(raw) ? "[Private information hidden]" : raw);
}
function historyAt(section, open=false) {
  if (!feed.querySelector(".user")) return;
  const history=el("details",undefined,"chat-recap");
  history.open=open;
  history.append(el("summary","Your conversation so far"));
  const list=el("ol");
  for(const row of feed.children) {
    const li=el("li"); for(const child of row.querySelector(".bubble").childNodes) if(!child.matches?.(".help-topics"))li.append(cloneOriginal(child)); li.className=row.classList.contains("user")?"said-user":"said-assistant"; list.append(li);
  }
  history.append(list); section.append(history);
  if(open && list.lastElementChild) list.scrollTop=list.scrollHeight;
}
function lastReplyInView(row) {
  const scroll=$("chat-scroll"), prior=row.previousElementSibling;
  const previousUser=prior?.classList.contains("user")?prior:prior?.previousElementSibling?.classList.contains("user")?prior.previousElementSibling:null;
  const anchor=previousUser && row.getBoundingClientRect().bottom-previousUser.getBoundingClientRect().top<=scroll.clientHeight-8?previousUser:row;
  const top=scroll.scrollTop+anchor.getBoundingClientRect().top-scroll.getBoundingClientRect().top-4;
  scroll.scrollTop=Math.max(0,Math.min(top,scroll.scrollHeight-scroll.clientHeight));
}
function stamp(label) {
  if(!lastQuestion || !label) return;
  const b=lastQuestion.querySelector(".bubble");
  b.querySelector(".chosen-answer")?.remove();
  const receipt=el("span",label,"chosen-answer");
  b.append(receipt);
  arrive(receipt);
}
function updateChoicesHint() {
  $("more-choices").hidden = !choices.children.length || choices.scrollHeight - choices.clientHeight - choices.scrollTop < 2;
}
function showCurrentChoices(row) {
  choices.scrollTop = 0;
  // Translated labels can wrap differently. Measure the finished turn before it paints.
  requestAnimationFrame(() => {
    if (stage !== "chat" || feed.lastElementChild !== row) return;
    updateChoicesHint();
    lastReplyInView(row);
  });
}
choices.addEventListener("scroll", updateChoicesHint, { passive: true });
const choiceResize = new ResizeObserver(() => requestAnimationFrame(updateChoicesHint));
$("more-choices").addEventListener("click", () => {
  const bottom = choices.getBoundingClientRect().bottom;
  const next = [...choices.children].find(b => b.getBoundingClientRect().bottom > bottom - 2);
  if (next) {
    choices.scrollTop += next.getBoundingClientRect().top - choices.getBoundingClientRect().top - 4;
    next.focus({ preventScroll: true });
  }
  updateChoicesHint();
});
function setBusy(on) {
  busy = on;
  reply.disabled = on;
  form.querySelector("button").disabled = on;
  form.setAttribute("aria-busy", String(on));
  for (const b of choices.children) b.disabled = on;
}
function formVisible(on) {
  form.hidden = !on;
  $("answers-panel").hidden = !on;
  $("browse-help").hidden = !on;
  $("undo").hidden = !on;
  choices.hidden = !on;
  if (on) choiceResize.observe(choices);
  else choiceResize.unobserve(choices);
  if (!on) choices.replaceChildren();
}
function stageTitle(value) {
  $("chapter").textContent = value;
}
function focusInput() {
  if (matchMedia("(min-width:681px)").matches)
    reply.focus({ preventScroll: true });
}
function paintStage(list = [], id = "") {
  panel.dataset.stage = stage;
  $("chat-page").hidden = stage !== "chat";
  const progress = interviewProgress(list, id, stage,part,cards.length);
  $("journey").hidden = !progress;
  if (progress) {
    $("journey-name").textContent = progress.label;
    $("journey-count").textContent = progress.count;
    $("journey-meter").value = progress.value;
    $("journey-meter").setAttribute("aria-valuetext", sentence("{0}, {1}", wording(progress.label), wording(progress.count)));
  }
}
function startOf(section) {
  section.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
  const h = section.querySelector("h2");
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}
function viewport() {
  const h = window.visualViewport?.height || window.innerHeight;
  panel.closest(".site-frame").style.setProperty("--thread-viewport", h + "px");
  panel.toggleAttribute("data-compact", h < 460 && !panel.hidden);
}
window.visualViewport?.addEventListener("resize", viewport);
window.addEventListener("resize", viewport);
function outputProfile() {
  return wishesProfile(executionProfile(current, data.answers), data.answers);
}
function setThread() {
  panel.hidden = false;
  viewport();
  $("welcome").hidden = true;
  if (!reading) window.scrollTo({ top: 0, behavior: "instant" });
}
function reset() {
  clearWording();
  topicPicks.clear();
  generation++;
  $("edition-note").hidden=true;
  openingRequest++;
  receipts.clear();deliberate.length=0; cards=[]; part=0; shown=null; lastQuestion=null; giftCue=null; earlyGift=false;
  stage = "home"; panel.dataset.stage="home";
  delete panel.dataset.question; delete panel.dataset.part;delete panel.dataset.parts;
  $("journey").hidden=true; $("journey-meter").value=0;
  if ($("home-guide").open) $("home-guide").close();
  $("clear-status").hidden=true;
  $("chat-scroll").scrollTop=0; $("chat-page").hidden=true; formVisible(false);
  data = { version: 2, place: null, answers: {} };
  current = null;
  active = null;
  editing = null;
  pendingGiftWho = null;
  pending = false;
  $("document-notice").hidden = true;
  if (sponsorDialog.open) sponsorDialog.close();
  downloadTrigger = null; offerReceipt = null;
  modalAttempt++;
  setBusy(false);
  feed.replaceChildren();
  choices.replaceChildren();
  done.replaceChildren();
  review.replaceChildren();
  done.hidden = true;
  review.hidden = true;
  panel.hidden = true;
  $("welcome").hidden = false;
  reply.value = "";
  $("opening").value = "";
  openingLength.reset();replyLength.reset();
}
function sourceLinks() {
  if (!current.legalSource) return [];
  if (current.route === "statutory") return [link("Maine statutory will and its notices ↗","https://legislature.maine.gov/statutes/18-C/title18-Csec2-517.pdf","help-link")];
  const [title, url] = authority(executionProfile(current, data.answers));
  return [link(sentence("{0} ↗",wording(title)), url, "help-link")];
}
function notesOnly() {
  return current.use === "planning" || current.use === "appointment";
}
async function startNotes(place, retained=null, carryChat=false) {
  const oldFeed=carryChat ? [...feed.children] : [];
  reset(); if(carryChat) feed.append(...oldFeed);
  data=retained || {version:2,purpose:"planning",place,answers:{}};
  const epoch=generation, jurisdiction=await placeForSession(place,"planning");
  if(epoch!==generation) return;
  current=jurisdiction; setThread();
  message("assistant","These are notes for you to keep or take to an appointment. They won’t include a will to sign.");
  ask();
}
function showHelpRoute(reason, {returnable=false, choice="", pressure=false}={}) {
  const was=active, at=part, card=shown;
  const businessCheck=was?.id==="businessTransfer" || was?.id==="businessWishes";
  const rawIssue=pressure ? "You said someone may be pressuring you." : card ? card.title+(choice?sentence(" Answer: {0}.", wording(choice)):"") : reason;
  // The notes format is single-line. Keep words and names from multiline input
  // without allowing control characters to break the recovery actions.
  const issue=rawIssue.replace(/[\p{Cc}\p{Cf}]+/gu," ").replace(/\s+/gu," ").trim().slice(0,1000);
  stage="helper"; formVisible(false);
  done.hidden=true; review.hidden=false; review.className="helper-card";
  review.replaceChildren(el("p",current.label,"helper-place"),el("h2",pressure?"Your will needs to be your choice":returnable?"Let’s pause on this question":"Before you continue"),el("p",reason));
  if(returnable && card) review.append(el("p",sentence("The question was: {0}", wording(card.title)),"paused-question"));
  const actions=el("div",undefined,"helper-actions");
  if(returnable && was) {
    actions.append(button("Back to this question",()=>ask(was.id,at),"primary-btn"));
  }
  if(!pressure && !notesOnly()) {
    let snapshot=null;
    try {snapshot=preserveAsNotes(current,data,issue);} catch { /* A text download and Back still work. */ }
    const all=questions(current,data.answers), byLabel=new Map(all.map(q=>[q.label,q]));
    const records=snapshot?.record || [...all.filter(q=>Object.hasOwn(data.answers,q.id)).map(q=>[q.label,formatValue(data.answers[q.id])]),["Question to discuss",issue]];
    const readable=()=>records.flatMap(([label,value])=>{
      const q=byLabel.get(label);
      if(!q || value!==YES) return [[q?reviewLabel(q):label,q?.values?.includes(value)?display(friendlyValue(value)):value]];
      return copyFor(q,all).map(c=>[c.title,display(c.options.find(o=>o.value===YES)?.label || "Confirmed")]);
    });
    const status=el("p",undefined,"helper-status");status.setAttribute("role","status");
    const download=button("Download my answers (PDF)",async()=>{
      const epoch=generation;
      download.disabled=true;
      try {
        const pdf=await makeAnswerPDF(current,readable(),{partial:true});
        if(epoch!==generation || !download.isConnected)return;
        save(new Blob([pdf],{type:"application/pdf"}),"WillForFree-my-answers.pdf");
        status.textContent="Your answers PDF is downloading.";
      } catch {
        if(download.isConnected)status.textContent="Your PDF couldn’t be created. Please try again.";
      } finally {download.disabled=false;}
    },"outline-btn");
    actions.append(download,el("small","Keep these answers to discuss with someone. They are not a will."),status);
    if(snapshot && Object.keys(data.answers).length) {
      const other=el("details",undefined,"other-options");other.append(el("summary",businessCheck?"Prefer to make notes for an adviser?":"Want to make notes for an adviser?"),el("p","Add the questions or wishes you’d like to discuss, then download them as a PDF."));
      other.append(button("Make a notes kit",()=>startNotes(data.place,snapshot,true),"outline-btn")); actions.append(other);
    }
  }
  if (!returnable) actions.append(button("Go to the start",confirmReset,"text-btn"));
  review.append(actions);
  if (!pressure && returnable && ["businessOwnership","businessTransfer","businessWishes"].includes(was?.id)) {
    review.append(link("Read the guide for business owners", "/why-do-i-need-a-will/#business", "help-link"));
  }
  if(returnable && card?.tip) {
    const more=el("details",undefined,"other-options");more.append(el("summary","Why this matters"),el("p",card.tip));review.append(more);
  }
  const sources=sourceLinks(); if(sources.length) {const section=el("div",undefined,"helper-source"); section.append(el("p","Where to check the rules"),...sources);if(current.country==="CA" && ["localLaw","canadaEstates"].includes(was?.id)) section.append(link("Estate services for First Nations ↗","https://www.sac-isc.gc.ca/eng/1100100032357/1581866877231","help-link"));review.append(section);}
  historyAt(review,Boolean(feed.lastElementChild?.classList.contains("user")));
  stageTitle(current.label);paintStage();startOf(review);
}
document.addEventListener("wff:language",()=>{
  if (current) displayDocumentUse();
  if (stage === "chat" && current?.key === "US-TX" && active?.id === "txAlternates") {
    const draft = reply.value;
    lastQuestion?.remove();
    ask("txAlternates");
    reply.value = draft;
  }
});
function displayDocumentUse() {
  const notice = current.key === "US-TX" && current.use === "official" ? "This software is not a substitute for the advice of an attorney." : "";
  const edition = editionNotice(stage === "route" && current.key === "US-ME" ? {...current, route: "statutory"} : current);
  $("edition-note").textContent = edition;$("edition-note").hidden = !edition;
  $("method-note").textContent = notice;
  $("document-notice").hidden = !notice;
  $("notice-full").textContent = notice;
  $("notice-trigger").textContent = "Not a substitute for an attorney ↗";
}
$("notice-trigger").addEventListener("click", () => $("notice-dialog").showModal());
$("notice-close").addEventListener("click", () => $("notice-dialog").close());
function prepared(subject,maineChoice=false) {
  const {execution,household,descendants}=data.answers;
  return helpFor(subject,outputProfile(),{execution,household,descendants,maineChoice});
}
function guidanceLink(answer) {
  let url=guideResources(current,currentLanguage()).family || current.legalSource;
  if(answer===guidance.expenses && current.key==="CA-ON")url="https://www.ontario.ca/laws/statute/90t23";
  if(answer===guidance.tax)url=({CA:"https://www.canada.ca/en/revenue-agency/services/tax/individuals/life-events/doing-taxes-someone-died.html",US:"https://www.irs.gov/individuals/deceased-person",GB:"https://www.gov.uk/probate-estate/settling-debts-and-taxes"})[current.country] || url;
  return url?link("Where to check the rules",url,"help-link"):null;
}
function browseHelp(section,maineChoice=false) {
  const menu=el("details",undefined,"help-topics"), summary=el("summary","Help topics"), list=el("div",undefined,"help-topic-list");
  const answer=el("p");answer.setAttribute("aria-live","polite");
  const resource=el("div");
  for(const [subject,label] of helpMenu)list.append(button(label,()=>{
    answer.textContent=prepared(subject,maineChoice);
    const source=guidanceLink(answer.textContent);resource.replaceChildren(...(source?[source]:[]));
    answer.scrollIntoView({block:"nearest"});
  },"text-btn"));
  const source=guidanceLink();if(source)resource.append(source);
  menu.append(summary,list,answer,resource);section.append(menu);
  return menu;
}
$("browse-help").addEventListener("click",()=>{
  if(stage!=="chat" || busy)return;
  let menu=feed.querySelector(".msg:last-child .help-topics");
  if(!menu)menu=browseHelp(message("assistant",help.general).querySelector(".bubble"));
  menu.open=true;
  menu.querySelector("summary").focus();
});
function showExplanation(answer,maineChoice=false) {
  const bubble=message("assistant",answer).querySelector(".bubble");
  if(answer===guidance.unknown)browseHelp(bubble,maineChoice);
  else if([guidance.expenses,guidance.tax,guidance.debt,guidance.probate,guidance.familyRights,guidance.international,guidance.capacity].includes(answer)){
    const resource=guidanceLink(answer);if(resource)bubble.append(resource);
  }
}
const topicPicks=new Map();
const requestTopic=createTopicRequest();
async function explain(value, area="opening", tags=topicsFor(value),maineChoice=false) {
  const epoch=generation, subject=directSubject(value,current);
  if(subject)return prepared(subject,maineChoice);
  if(!tags.length)return guidance.unknown;
  // A model that sees only topic names cannot answer a case-specific question.
  // Unrecognised combinations stay local unless the visitor asks for general background.
  const general=isGeneralTopicRequest(value);
  if(tags.length>1 && !isTopicChoice(value))return guidance.unknown;
  if(tags.length===1 && !general && !["process","province"].includes(tags[0]))return guidance.unknown;
  let topic=chooseLocalTopic(tags,area);
  const cacheKey=area+"|"+[...tags].sort().join("|");
  if(remoteHelpAllowed && topicPicks.has(cacheKey))topic=topicPicks.get(cacheKey);
  else if (value.length<=QUESTION_LIMIT && Date.now()>=remoteRetryAt && tags.length > 1 && remoteHelpAllowed && await topicHelpEnabled() && remoteHelpAllowed && generation===epoch) {
    try {
      const response=await requestTopic(tags,area,()=>remoteHelpAllowed && generation===epoch);
      if(response.status===429 || response.status===503){
        const seconds=Number(response.headers.get("Retry-After")) || 60;
        remoteRetryAt=Date.now()+Math.min(3600,Math.max(1,seconds))*1000;
      }
      if(response.ok && (response.headers.get("content-type") || "").includes("application/json")) {
        const result=await response.json();
        if(generation===epoch && remoteHelpAllowed && tags.includes(result.topic)){topic=result.topic;topicPicks.set(cacheKey,topic);}
      }
    } catch {}
  }
  if(generation!==epoch || !current)return guidance.unknown;
  if(topic==="children")return prepared("guardian",maineChoice);
  if(["signing","price","process"].includes(topic))return prepared(topic==="price"?"cost":topic,maineChoice);
  return help[topic] || guidance.unknown;
}
function copyFor(q,all) {
  const legacy=all.slice(0,all.findIndex(k=>k.id==="legacyConsent")).filter(k=>k.values?.[0]===YES);
  return interviewCards(q,current,data.answers,legacy);
}
function ask(id=null, at=0) {
  const all=questions(current,data.answers);
  active=id ? all.find(q=>q.id===id) : all.find(q=>!Object.hasOwn(data.answers,q.id));
  // Do not ask twice for a condition explicitly confirmed earlier in this session.
  while(!id && active && receipts.has(active.id) && active.values?.[0]===YES) {
    data.answers[active.id]=YES; receipts.delete(active.id);active=all.find(q=>!Object.hasOwn(data.answers,q.id));
  }
  if(!active){showReview();return;}
  const replacingWho=pendingGiftWho && active.id===giftKey("extraRecipient",pendingGiftWho.n);
  if(replacingWho) active={...active,kind:pendingGiftWho.who==="A charity"?"charity":"name"};
  cards=copyFor(active,all);part=Math.min(at,cards.length-1);shown=cards[part];
  stage="chat"; review.hidden=true; done.hidden=true;formVisible(true);
  panel.dataset.question=active.id;panel.dataset.part=String(part);panel.dataset.parts=String(cards.length);
  stageTitle(sentence(notesOnly() || needsAdvice(data.answers)?"Your notes · {0}":"Your will · {0}",wording(current.name)));
  $("undo").disabled=(!Object.keys(data.answers).length && !part) || Boolean(editing);
  paintStage(all,active.id);
  const row=message("assistant",shown.title), bubble=row.querySelector(".bubble");
  lastQuestion=row;
  const lines=[...shown.lines];
  if(earlyGift && active.id==="extra") {
    lines.unshift("You mentioned a gift earlier. You can add it here now.");earlyGift=false;
  }
  if(replacingWho) lines.push("Your original recipient stays in place until you confirm the new name.");
  if(giftCue && giftCue.start===active.giftStart && active.giftField==="extraFit" && part===0 && giftCue.type==="vehicle") { bubble.lastChild.textContent="Do you own the car outright?";lines[0]="It’s yours alone, and there’s no loan against it."; }
  if(giftCue && giftCue.start===active.giftStart && active.giftField==="extraItem" && giftCue.type==="vehicle") {
    bubble.lastChild.textContent="Which car would you like to leave?";
  }
  if(lines.length){const list=el("ul",undefined,"prompt-detail"); for(const line of lines)list.append(el("li",line));bubble.append(list);}
  $("reply-hint").textContent=shown.options.length?"Answer below or type your own":"";
  reply.placeholder=active.kind==="names"?"Full names, separated by commas…":active.giftField==="extraItem"?(giftCue?.type==="vehicle"?"e.g. My blue 2018 Honda Civic":"e.g. My gold ring engraved June 1984"):active.kind==="amount"?"e.g. 500":active.kind==="notes"?"Write your message…":active.kind==="name"?"Full name…":"Type your answer…";
  reply.value="";reply.maxLength=replyLimit(active);replyLength.reset();
  choices.replaceChildren(...shown.options.map(o=>{const b=button(o.label,()=>submit(o.value,{source:"choice",label:o.label}));b.dataset.value=o.value;return b;}),
    ...(replacingWho?[button("Keep the original recipient",()=>{pendingGiftWho=null;editing=null;ask();})]:[]),
    ...(!editing && (["item","charity","amount"].includes(active.kind) || active.giftField==="extraRecipient")?[button("Change gift choice",()=>{const start=active.giftStart;data.answers=priorTo(start);editing=null;giftCue=null;ask(start);})]:[]));
  showCurrentChoices(row);focusInput();
}
function shortIntro(p) {
  if(p.route==="deposit" || p.key==="EE") return planDescription(p);
  if(p.route==="handwriting") return "I’ll help you choose the wording. At the end, you’ll copy the will by hand and follow the signing instructions.";
  if(notesOnly()) return "I can help you write down what matters to you for a local appointment.";
  return "I’ll help you make your will, one question at a time.";
}
async function missingForm(p,epoch) {
  if (await hasPublisherForm(p)) return false;
  if(generation !== epoch) return true;
  setThread(); formVisible(false); stage="route"; paintStage();
  review.hidden=false; review.className="helper-card";
  review.replaceChildren(el("h2","The publisher’s form is unavailable here."),el("p","You can get the original form directly from its publisher."));
  const publisher = p.key==="US-CA" ? "https://selfhelp.courts.ca.gov/wills-estates-probate/legal-documents" :
    p.key==="US-TX" ? "https://www.txcourts.gov/rules-forms/forms/" : "https://legislature.maine.gov/statutes/18-C/title18-Csec2-517.pdf";
  review.append(link("Open the official form ↗",publisher,"help-link"),button("Back to start",()=>reset(),"outline-btn"));
  browseHelp(review);historyAt(review,true);
  stageTitle(p.label); startOf(review); return true;
}
function start(raw="",source="typed") {
  if(source==="typed" && !openingLength.fits(QUESTION_LIMIT))return;
  const opening=raw.trim(), intent=++openingRequest;
  geo.ensure(async place=>{
    if(intent!==openingRequest) return;
    reset();data.place=place;const epoch=generation;
    const jurisdiction=await placeForSession(place);if(epoch!==generation)return;
    current=jurisdiction;setThread();stage="chat";paintStage();$("thread-place").textContent=current.label;
    if(current.use==="planning")data.purpose="planning";displayDocumentUse();
    if(opening && source==="typed")echo(opening);
    if(disclosesPressure(opening)){showHelpRoute("A will must express your own free choice. If someone is pressuring you, stop here and speak privately with someone you trust or a local legal service.",{pressure:true});return;}
    if(sensitive(opening))message("assistant","I hid that message. Please leave out passwords, account numbers and contact details.");
    const typedHelp=source==="typed" && !sensitive(opening) && opening && (isQuestion(opening) || directSubject(opening));
    const specialIntro=current.route==="deposit" || current.route==="handwriting" || current.key==="EE";
    if(specialIntro)message("assistant",shortIntro(current));
    if(typedHelp) {
      setBusy(true);const answer=await explain(opening,"opening",topicsFor(opening),current.key==="US-ME");
      if(epoch!==generation)return;setBusy(false);showExplanation(answer,current.key==="US-ME");
    }
    if(current.route==="official" && (await missingForm(current,epoch) || generation!==epoch))return;
    if(current.route==="fixed"){finish();return;}
    if(current.key==="US-ME") {
      stage="route"; displayDocumentUse(); formVisible(false);paintStage();review.hidden=false;review.className="helper-card";
      review.replaceChildren(el("h2","Choose your Maine will"),el("p","The official form includes options for a spouse, children and a guardian. The chat option leaves what’s left to one adult, with a backup."),el("p",maineSpouseAmount));const actions=el("div",undefined,"helper-actions");
      actions.append(button("Use the Maine statutory will",async()=>{const token=generation,next=await placeForSession(place,"statutory");if(token!==generation || await missingForm(next,token) || token!==generation)return;data.purpose="statutory";current=next;finish();},"primary-btn"),button("Make a simple will in chat",()=>{message("assistant",shortIntro(current));ask();displayDocumentUse();},"outline-btn"));review.append(actions);
      browseHelp(review,true);historyAt(review,true);stageTitle(current.label);startOf(review);return;
    }
    if (!typedHelp && !sensitive(opening) && /\b(?:kids|children)\b/i.test(opening)) {
      message("assistant",prepared("guardian"));
    } else if(!typedHelp && !specialIntro && opening && !sensitive(opening) && giftIntents(opening).length) {
      earlyGift=true;message("assistant","We’ll come back to gifts. First, a few questions to see which will fits.");
    } else if(!specialIntro && !(opening && source==="typed")) message("assistant",shortIntro(current));
    ask();
  });
}
function answersBefore(id) {
  const keys = questions(current, data.answers).map((q) => q.id);
  const index = keys.indexOf(id);
  const next = {};
  for (const k of keys.slice(0, index))
    if (Object.hasOwn(data.answers, k)) next[k] = data.answers[k];
  return next;
}
function priorTo(id) {
  receipts.clear();giftCue=null;
  return answersBefore(id);
}
async function submit(raw,{source="typed",label=""}={}) {
  if(stage!=="chat" || busy || !active) return;
  const v=raw.trim();if(!v)return;
  if(source==="typed" && !replyLength.fits(replyLimit(active)))return;
  reply.value="";replyLength.reset();
  if(source==="typed") echo(v);
  if(sensitive(v)){message("assistant","I hid that message. Leave out passwords, account numbers and contact details, then try again.");focusInput();return;}
  if(disclosesPressure(v)){showHelpRoute("A will must express your own free choice. If someone is putting pressure on you, speak privately with someone you trust or a local legal service.",{pressure:true});return;}
  for(const b of choices.querySelectorAll("[data-note-choice]")) b.remove();
  let turn=source==="typed"?manageTurn(v,active,shown,current):{type:"answer",value:v,label};
  if(turn.type==="noteOrHelp") {
    const expected=active,epoch=generation;
    const row=message("assistant","Would you like those exact words in your notes, or were you asking me? Nothing has been added yet.");
    const saveNote=button("Save this wording as my note",()=>{
      if(epoch===generation && active===expected && stage==="chat") submit(v,{source:"literal"});
    });
    const answerMe=button("Help me with this",async()=>{
      if(epoch!==generation || active!==expected || stage!=="chat" || busy)return;
      for(const b of choices.querySelectorAll("[data-note-choice]")) b.remove();
      if(v.length>QUESTION_LIMIT){
        reply.value=v;
        message("assistant",sentence("For a help question, please shorten this to {0} characters. Your wording is still in the box.", QUESTION_LIMIT));
        focusInput();return;
      }
      const secondary=manageTurn(v,{...active,kind:"noteName"},shown,current);
      if(secondary.type==="guide" || secondary.type==="clarify") {message("assistant",shortHelp(secondary.text || currentHelp(active,shown)));}
      else {
        setBusy(true);const answer=await explain(v,turn.context,turn.topics);
        if(epoch!==generation)return;setBusy(false);showExplanation(answer);
      }
      message("assistant","I haven’t saved that question as a note. Type what you’d like to keep.");focusInput();
    });
    for(const b of [saveNote,answerMe])b.dataset.noteChoice="";
    choices.prepend(saveNote,answerMe);showCurrentChoices(row);focusInput();return;
  }
  if(turn.type==="reset"){confirmReset();return;}
  if(turn.type==="back"){
    if($("undo").disabled) message("assistant","This is the first question, or you’re editing an answer. You can answer it here or use Start over.");
    else $("undo").click();
    return;
  }
  if(turn.type==="help") {
    if(v.length>QUESTION_LIMIT){reply.value=v;replyLength.fits(QUESTION_LIMIT);focusInput();return;}
    const epoch=generation;setBusy(true);const answer=await explain(v,turn.context,turn.topics);if(epoch!==generation)return;setBusy(false);
    showExplanation(answer);focusInput();return;
  }
  if(["later","guide","clarify"].includes(turn.type)) {
    if(turn.type==="later")earlyGift=true;
    message("assistant",shortHelp(turn.text || currentHelp(active,shown)));
    if(turn.type==="later") message("assistant",shown.title);
    focusInput();return;
  }
  if (shown.yesPass!==undefined && source==="typed" && turn.type!=="answer") {
    message("assistant",responseHint(active,shown));focusInput();return;
  }
  const choice=turn.value;
  if (source==="choice") stamp(label);
  if(shown.yesPass!==undefined && choice===STOP){
    const reason=active.id==="businessTransfer" || active.id==="businessWishes" ? shown.tip : active.id==="localLaw"?sentence("This will covers property that follows the usual rules in {0}. If other rules might apply, check them before using this form.", wording(current.name)):"This will is for a simpler situation. Check the local guidance before using it for the answer you gave.";
    showHelpRoute(reason,{returnable:true,choice:turn.label || label || v});return;
  }
  const result=readAnswer(active,choice,data.answers);
  if(result.value && part+1<cards.length && (result.value===YES || result.value==="Yes, that fits")) {
    ask(active.id,part+1);return;
  }
  if(result.value && turn.type==="gift")giftCue={start:active.id,type:turn.cue};
  if (result.cancelAdvice) {
    delete data.answers.adviceOverride; delete data.answers.adviceFor; delete data.answers.extraRequest;
    editing=null; ask(); return;
  }
  if (result.reviseGift && active.giftNumber) {
    const amount = giftKey("extraAmount", active.giftNumber);
    const previous = data.answers[amount];
    editing = amount;
    ask(amount); reply.value = previous || ""; focusInput(); return;
  }
  if(result.stop) {
    const reason=active.id==="businessOwnership" ? "Check whether you own part of the business or just work there. If you own a share, you can come back and choose “I own a business”." : result.reason;
    showHelpRoute(reason || "This form doesn’t have an option for that situation. You can check the local guidance and keep your answers to use later.",{returnable:true,choice:turn.label || label || v});return;
  }
  if(result.error) {
    const row=message("assistant",result.error==="Choose the answer that fits. You can also ask a question." ? responseHint(active,shown) : result.error);
    if (result.advice && ["extraItem","extraRecipient"].includes(active.giftField)) {
      const source = active.giftStart, n = active.giftNumber;
      const description = data.answers[giftKey("extraItem",n)], amount = data.answers[giftKey("extraAmount",n)];
      let request = result.advice;
      if (active.giftField === "extraRecipient") {
        const gift = description ? sentence("Keepsake: {0}",description) : sentence("Cash gift: {0} {1}",amount,giftCurrency(current));
        const who = pendingGiftWho?.who || data.answers[giftKey("extraWho",n)];
        const pattern = who === "A charity" ? "{0}. Intended charity: {1}" : who === "An adult" ? "{0}. Intended adult: {1}" : "{0}. Intended recipient: {1}";
        request = display(sentence(pattern,wording(gift),result.advice));
      }
      choices.querySelector("[data-advice]")?.remove();
      const carry = button("Save this request in my notes", () => {
        pendingGiftWho=null;
        const laterChoices=questions(current,data.answers).slice(questions(current,data.answers).findIndex(q=>q.id===active.id)+1).some(q=>Object.hasOwn(data.answers,q.id));
        if ((editing && Object.hasOwn(data.answers,active.id)) || laterChoices) {
          const existing=giftList(data.answers).find(g=>g.n===n);
          data.answers.adviceOverride=keepForAdvice;
          data.answers.adviceFor=display(existing
            ? sentence("Replace or reconsider gift {0}: {1} to {2}.",n,giftText(current,existing),existing.recipient)
            : sentence("Reconsider gift {0}.",n));
        } else {
          data.answers = priorTo(source);
          data.answers[source] = adviceOption;
        }
        editing = null;
        ask("extraRequest");
        reply.value = request;
        focusInput();
      });
      carry.dataset.advice = "";
      choices.prepend(carry);
      showCurrentChoices(row);
    }
    focusInput();
    return;
  }
  const id = active.id;
  if (editing && active.giftField==="extraWho" && result.value!==data.answers[id] && Object.hasOwn(data.answers,giftKey("extraRecipient",active.giftNumber))) {
    // Keep the existing gift until the new recipient type and name are both confirmed.
    pendingGiftWho={n:active.giftNumber,who:result.value};
    editing=giftKey("extraRecipient",active.giftNumber);
    ask(editing); return;
  }
  const replacement = pendingGiftWho && id===giftKey("extraRecipient",pendingGiftWho.n);
  if (replacement) data.answers[giftKey("extraWho",pendingGiftWho.n)]=pendingGiftWho.who;
  // Earlier route/eligibility changes legitimately need re-entry of later answers. Name that effect
  // before doing it so a review action cannot silently erase an independent gift or family note.
  const stableGiftField=["extraAmount","extraItem","extraRecipient","extraWho"].includes(active.giftField);
  if (editing && Object.hasOwn(data.answers,id) && result.value!==data.answers[id] && !stableGiftField && result.value!==adviceOption) {
    const list=questions(current,data.answers), idx=list.findIndex(q=>q.id===id);
    if (idx>=0 && list.slice(idx+1).some(q=>Object.hasOwn(data.answers,q.id) && (q.giftField==="extraRecipient" || /^noteText/.test(q.id)))) {
      const old=data.answers[id], expected=active;
      const row=message("assistant","Changing this choice means re-entering later gifts or notes. Keep them, or continue if you intend to replace those later answers.");
      choices.replaceChildren(button("Keep my gifts and notes", () => { editing=null; ask(); }),
        button("Change and re-enter later answers", () => {
          if (active!==expected || data.answers[id]!==old) return;
          data.answers=priorTo(id); editing=null;
          submit(choice,{source:"confirmed",label});
        }));
      showCurrentChoices(row);return;
    }
  }
  if (editing && result.value===adviceOption && active.giftMenu && Object.hasOwn(data.answers,id) && ![doneGifts,noExtra].includes(data.answers[id])) {
    data.answers.adviceOverride=keepForAdvice;
    data.answers.adviceFor=display(sentence("Reconsider the previously recorded choices at {0}.",wording(active.label)));
    editing=null; ask("extraRequest"); return;
  }

  if (
    editing &&
    (replacement || JSON.stringify(data.answers[id]) !== JSON.stringify(result.value))
  ) {
    // A gift detail is independent of later gifts/notes, except for cumulative cash confirmations.
    // Keep the rest and ask for every affected cash total again; family/route changes redo dependent choices.
    if (["extraAmount","extraItem","extraRecipient","extraWho"].includes(active.giftField)) {
      for (const key of Object.keys(data.answers)) {
        const match = /^extraTotal(\d*)$/.exec(key);
        if (match && Number(match[1] || 1) >= active.giftNumber) delete data.answers[key];
      }
      if (active.giftField==="extraWho") delete data.answers[giftKey("extraRecipient", active.giftNumber)];
    } else data.answers = priorTo(id);
  }
  if(editing && !stableGiftField) receipts.clear();
  data.answers[id] = result.value;
  deliberate.push({id,part});
  if(result.value===YES) for(const key of coveredLater(id,current,data.answers)) receipts.add(key);
  pendingGiftWho=null;
  // Store answers in interview order after in-place edits. Undo uses that order.
  if (editing) {
    const sorted={};
    for (const q of questions(current,data.answers)) if (Object.hasOwn(data.answers,q.id)) sorted[q.id]=data.answers[q.id];
    data.answers=sorted;
  }
  editing = null;
  ask();
}
function showReview() {
  stage = "review";
  formVisible(false);
  done.hidden = true;
  review.hidden = false;
  const output = outputProfile();
  const advice = needsAdvice(data.answers);
  paintStage();
  review.className = "summary";
  stageTitle(sentence("Review · {0}", wording(current.name)));
  review.replaceChildren(
    el("h2", advice || notesOnly() ? "Check your notes" : "Check your will kit"),
    el(
      "p",
      "Check the names, who gets what, and anything you’d like to change before you download.",
    ),
  );
  if (data.record?.length && current.use==="planning") {
    if (profile(data.place).route==="fixed") review.append(el("p","Your earlier information is available as private notes. To get this state’s blank will, start a new kit. Your earlier answers will not fill the form.","review-notice"));
    const saved=el("details",undefined,"recorded-wishes");saved.append(el("summary",sentence("Read my earlier choices ({0})", data.record.length)));
    const list=el("dl");for(const [label,value] of data.record)list.append(el("dt",label),verbatim("dd",value));saved.append(list);review.append(saved);
  }
  if (advice) review.append(el("p", data.answers.adviceOverride
    ? "Your earlier gift list is shown for reference. Your requested change is recorded separately for local advice; there is no will to sign."
    : "Your request needs local advice. This kit keeps your choices and the request together. It does not contain a will to sign.", "review-notice"));
  if (notesEntries(data.answers).length) review.append(el("p", "Your personal notes will be in their own file. They do not change who inherits.", "review-notice"));
  if (!advice && data.answers.businessOwnership===ownsBusiness) review.append(el("p","Whatever your estate gets from the business follows the same choices as the rest of your estate. Your kit includes a separate business checklist.","review-notice"));
  const all = questions(current,data.answers), gifts = giftList(data.answers);
  if (gifts.length) {
    const block=el("section",undefined,"gift-summary");
    block.setAttribute("aria-label","Your separate gifts");
    block.append(el("h3", sentence("Your gifts ({0})", gifts.length)));
    const giftRows=el("ol");
    for (const g of gifts) {
      const li=el("li");
      li.append(verbatim("strong",giftText(current,g)),verbatim("span"," → "+g.recipient));
      giftRows.append(li);
    }
    block.append(giftRows);
    review.append(block);
  }
  const lastMenu = all.findLast(q => q.giftMenu && [doneGifts,noExtra].includes(data.answers[q.id]) && (q.values.includes(item) || q.values.includes(cash)));
  if (!advice && lastMenu) {
    review.append(button(gifts.length ? "Add another gift" : "Add a gift", () => { editing=lastMenu.id; ask(lastMenu.id); }, "outline-btn"));
  }
  const dl = el("dl"), checks=el("details",undefined,"review-checks"), checkList=el("dl");
  checks.append(el("summary","Review the checks for this will"),checkList);
  for (const q of all) {
    if (!Object.hasOwn(data.answers, q.id)) continue;
    // The list above already shows each gift and its recipient; the field rows allow precise edits.
    if ((q.giftMenu && [item,cash].includes(data.answers[q.id])) || ["extraFit","extraTotal"].includes(q.giftField)) continue;
    const row = el("div", undefined, "summ-row");
    const b = button(
      "Edit",
      () => {
        editing = q.id;
        ask(q.id);
      },
      "text-btn",
    );
    b.setAttribute("aria-label", sentence("Edit {0}", wording(q.label)));
    const label = gifts.length && ["caExtras","txSpecific"].includes(q.id) ? "Other court form gifts" : reviewLabel(q);
    row.append(el("dt",label),q.values?.includes(data.answers[q.id]) ? el("dd",data.answers[q.id]===YES?"Confirmed":friendlyValue(data.answers[q.id])) : verbatim("dd",formatValue(data.answers[q.id])),b);
    if(data.answers[q.id]===YES) {
      const description=el("ul",undefined,"review-conditions");
      for(const c of copyFor(q,all)) {
        const accepted=c.options.find(o=>o.value===YES)?.label || "Confirmed";
        const li=el("li",translatedList([c.title,accepted,...c.lines]," · "));description.append(li);
      }
      row.querySelector("dd").append(description);checkList.append(row);
    } else dl.append(row);
  }
  review.append(dl);if(checkList.children.length)review.append(checks);
  if (["paper", "handwriting", "deposit"].includes(output.route)) {
    const details = el("details", undefined, "will-preview");
    details.append(el("summary", "Read the wording of my will"));
    for (const [heading, body] of sections(output, data.answers))
      details.append(el("h3", heading), el("p", body));
    review.append(details);
  }
  review.append(button("Looks right — get my kit", finish, "primary-btn"));
  browseHelp(review);historyAt(review);startOf(review);
}
async function startDownload(trigger, allowOffer) {
  if (pending || stage !== "finished") return;
  const epoch = generation;
  pending = true; trigger.disabled = true;
  if (allowOffer && withOffers && (!offerReceipt || offerReceipt.until <= Date.now())) {
    offerReceipt = null;
    const next = await lookupOffer(data.place);
    if (epoch !== generation) return;
    if (stage !== "finished" || !trigger.isConnected) { pending = false; return; }
    offerReceipt = next;
  }
  trigger.disabled = false; pending = false;
  if (!allowOffer || !withOffers || !offerReceipt) return generateZip(trigger,$("kit-status"),null);
  const ad = offerReceipt.offer;
  $("partner-label").textContent = ad.kind === "paid" ? "Advertisement · Paid sponsor" : "Advertisement · From the WillForFree team";
  $("partner-credit").textContent = ad.name;
  $("sponsor-title").dataset.verbatim="";
  $("sponsor-title").textContent = ad.title;
  $("sponsor-description").textContent = ad.message;
  $("partner-visit").href = ad.url;
  $("partner-visit").textContent = sentence("Visit {0} ↗", ad.name);

  downloadTrigger = trigger;
  $("download-responsibility").textContent = downloadNotice(outputProfile());
  $("zip-status").className = "";
  $("zip-status").textContent = "";
  $("save-zip").disabled = false;
  sponsorDialog.showModal();
  sponsorDialog.scrollTop = 0;
  $("save-zip").focus({ preventScroll: true });
}
$("dismiss-sponsor").addEventListener("click", () => sponsorDialog.close());
sponsorDialog.addEventListener("click", event => {
  if (event.target !== sponsorDialog) return;
  const r = sponsorDialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) sponsorDialog.close();
});
sponsorDialog.addEventListener("close", () => {
  modalAttempt++;
  pending = false;
  if (downloadTrigger?.isConnected && stage === "finished") downloadTrigger.focus({ preventScroll: true });
});
$("save-zip").addEventListener("click", () => generateZip($("save-zip"),$("zip-status"),offerReceipt));
async function generateZip(saveButton,status,receipt) {
  if (pending || stage !== "finished" || (receipt && !sponsorDialog.open)) return;
  pending = true;
  const epoch = generation, attempt = ++modalAttempt;
  saveButton.disabled = true;
  status.className = "";
  status.textContent = "Preparing your files…";
  const valid = () => attempt === modalAttempt && generation === epoch && stage === "finished" && (!receipt || sponsorDialog.open);
  try {
    const sponsored = receipt && receipt.until > Date.now() ? receipt : null;
    let kit = await createKit(data,sponsored?.offer);
    let attributed = sponsored;
    if (sponsored && sponsored.until <= Date.now() && valid()) {
      attributed = null;
      kit = await createKit(data);
    }
    if (!valid()) return;
    save(kit.blob, kit.filename);
    if (attributed) void countDownload(attributed.ticket);
    const notice = "Download started. Open 00-Start-here.pdf inside your ZIP.";
    $("kit-status").textContent = notice;
    if (sponsorDialog.open) sponsorDialog.close();
  } catch (error) {
    if (valid()) {
      status.className = "error";
      status.textContent = error.message || "Your ZIP could not be created. Please try again.";
    }
  } finally {
    if (attempt === modalAttempt) { pending = false; saveButton.disabled = false; }
  }
}
function finish() {
  stage = "finished";
  displayDocumentUse();
  formVisible(false);
  paintStage();
  const output = outputProfile();
  const notes = ["planning", "appointment"].includes(output.use);
  review.hidden = true;
  done.hidden = false;
  done.replaceChildren();
  stageTitle(sentence("Your kit · {0}", wording(current.name)));
  const card = el("div", undefined, "download-card");
  card.append(
    el(
      "h2",
      output.route === "statutory" ? "Your Maine statutory will form is ready." : output.route === "fixed" ? "Your blank will form is ready."
        : output.route === "deposit" ? "Your will is ready for the official appointment."
        : output.use === "appointment"
          ? "Your appointment kit is ready."
          : output.use === "planning"
            ? "Your planning notes are ready."
            : "Your will kit is ready.",
    ),
    el("p", needsAdvice(data.answers)
      ? "Your requested instructions and earlier choices are saved together for local advice. There is no will to sign in this kit."
      : planDescription(output)),
    el(
      "p",
      output.route === "official"
        ? "Keep the court PDF you complete. A new visit starts with a fresh form."
        : ["fixed","statutory"].includes(output.route)
          ? "No names or wishes are collected on this route. Open the form to check its wording. Complete it yourself before the signing ceremony."
          : notes
            ? "Your ZIP includes your private notes, your answers and local guidance as PDFs."
            : output.route === "paper" ? completionSummary(output) : "Read the full wording and follow the completion instructions enclosed with your will.",
    ),
  );
  if (notesEntries(data.answers).length) card.append(el("p", "Find your family notes in 04-Personal-wishes.pdf."));
  if (!notes && data.answers.businessOwnership===ownsBusiness) card.append(el("p",sentence("Read {0} before signing. It also covers the practical steps for keeping the business running.", wording(businessFile))));
  const status = el("p");
  status.id = "kit-status";
  status.setAttribute("role", "status");
  const editBeforeDownload = button(
    "Review my answers",
    () => {
      if (!pending) showReview();
    },
    "text-btn",
  );
  const download = button("Download ZIP ↓", () => startDownload(download, !notes), "primary-btn");
  if (withOffers && !notes) download.setAttribute("aria-haspopup","dialog");
  const responsibility = el("p",downloadNotice(output),"download-notice");
  responsibility.id = "kit-responsibility"; download.setAttribute("aria-describedby",responsibility.id);
  const actions = el("div", undefined, "review-actions");
  actions.append(download);
  if (output.route==="fixed") {
    actions.append(link("Read the blank form ↗","/forms/basic/"+output.region+".pdf","help-link"));
  } else if(output.route==="statutory")actions.append(link("Read the blank form ↗","/forms/me-statutory.pdf","help-link"));
  else actions.append(editBeforeDownload);
  card.append(actions, responsibility, status, ...sourceLinks());
  card.append(link("Legal terms & privacy", "/fine-print/", "kit-legal-link"));
  browseHelp(card);historyAt(card,["fixed","statutory"].includes(output.route));done.append(card);
  startOf(done);
}
$("start-form").addEventListener("submit", (e) => {
  e.preventDefault();
  start($("opening").value);
});
const homeGuide = $("home-guide");
const guideTitle = $("home-guide-title");
const guideCopy = $("home-guide-copy");
let guideTrigger;
function homeInfo(trigger) {
  guideTrigger = trigger;
  if (trigger.dataset.start === "help") {
    guideTitle.textContent = "How it works";
    const list = el("ol");
    for (const step of [
      "Confirm where you live so we can show you the right form.",
      "Tell us who matters to you and what you’d like them to receive.",
      "Check the names and gifts, download your kit and follow the signing instructions inside.",
    ]) list.append(el("li", step));
    guideCopy.replaceChildren(list, el("p","You can ask what something means at any step."));
  } else {
    guideTitle.textContent = "Making a will when you have children";
    guideCopy.replaceChildren(el("p","You can tell us who should inherit, who you’d like to care for your children and who should look after their money. The options depend on where you live."));
  }
  homeGuide.showModal();
  guideTitle.focus({preventScroll:true});
}
for (const trigger of document.querySelectorAll("[data-start]")) {
  trigger.addEventListener("click", () => {
    if (trigger.dataset.start === "start") start("","choice");
    else homeInfo(trigger);
  });
}
$("home-guide-close").addEventListener("click", () => homeGuide.close());
$("home-guide-start").addEventListener("click", () => {
  homeGuide.close();
  start("","choice");
});
homeGuide.addEventListener("close", () => {
  if (!document.querySelector("dialog[open]") && stage === "home") guideTrigger?.focus({preventScroll:true});
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  submit(reply.value);
});
for (const item of [$("opening"), reply])
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      item.form.requestSubmit();
    }
  });
$("undo").addEventListener("click", () => {
  if (busy) return;
  if(part>0){ask(active.id,part-1);return;}
  receipts.clear();giftCue=null;
  let last;
  while(deliberate.length && !last) {
    const candidate=deliberate.pop();
    if(Object.hasOwn(data.answers,candidate.id))last=candidate;
  }
  const old=last?.id || questions(current,data.answers).findLast(q=>Object.hasOwn(data.answers,q.id))?.id;
  if(old){data.answers=priorTo(old);ask(old,last?.part || 0);}
});
const resetDialog = $("reset-dialog");
const confirmReset = () => {
  if (stage === "home") return;
  resetDialog.showModal();
  $("keep").focus();
};
$("back-home").addEventListener("click", confirmReset);
$("restart").addEventListener("click", confirmReset);
$("keep").addEventListener("click", () => resetDialog.close());
$("clear").addEventListener("click", () => {
  resetDialog.close();
  reset();geo.resetConfirmation();
  $("clear-status").textContent="Previous chat cleared. You can start a new will."; $("clear-status").hidden=false;
  window.scrollTo({ top: 0, behavior: "instant" });
  $("opening").focus({ preventScroll: true });
});
let reading = false;
const clearInfoOnRestore = setUpInformationNavigation({
  main: $("main"),
  welcome: $("welcome"),
  panel,
  isHome: () => stage === "home",
  confirmReset,
  disableAI() {
    remoteHelpAllowed = false;
  },
  setupContent(section, path) {
    if (path === "/why-do-i-need-a-will/" || path === "/fine-print/") setupLocationGuidance(section);
    if (path === "/free-and-private/") setupConnectionInfo(section);
  },
  readingChanged(value) {
    reading = value;
    if (!value && !remoteHelpAllowed && location.pathname === "/") {
      const url = new URL(location.href);
      url.searchParams.set("ai", "off");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
  },
});
window.addEventListener("pagehide", () => { reset();geo.resetConfirmation(); });
window.addEventListener("pageshow", event => {
  if (event.persisted) { reset();geo.resetConfirmation();clearInfoOnRestore(); }
});

document.dispatchEvent(new Event("wff:home-ready"));
