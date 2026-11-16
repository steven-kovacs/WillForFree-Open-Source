import { kitFileName, duringKit, currentLanguage, display, editionNotice, sentence, wording } from "./locale.js";
import { loadTexasForms } from "./publisher-forms.js";
import { californiaBond, californiaCommunityShare, custodySources, procedureTitle, extraSources, texasFamilyHome, texasUnsignedChoice } from "./procedures.js";
import { executionProfile } from "./markets.js";
import { downloadNotice } from "./download-notice.js";
import {latinPdfText} from "./characters.js";
import { bilingualTexas } from "./texas-bilingual.js";
import { placeForSession } from "./release.js";
import { texasGiftRows } from "./court-gift-rows.js";
import { item, needsAdvice, notesEntries, wishesProfile, giftList, courtDeferred, giftText } from "./extras.js";
import { validateState, questions, formatValue } from "./will.js";
import { sections, signing, after } from "./document.js";
import { courtSpouseInherits, texasResidueChoices } from "./survival.js";
import { ownsBusiness, blankBusinessGuide, businessChecklist, businessFile } from "./business.js";
import { renderCompanion } from "./companion-pdf.js";
import { YES, interviewCards, friendlyValue, reviewLabel } from "./interview-copy.js";
const scripts = new Map();
function library(path, name) {
  if (globalThis[name]) return Promise.resolve(globalThis[name]);
  if (!scripts.has(path))
    scripts.set(
      path,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = path;
        s.onload = () =>
          globalThis[name]
            ? resolve(globalThis[name])
            : reject(Error("Could not load the document tools."));
        s.onerror = () => {
          scripts.delete(path);
          reject(Error("Could not load the document tools. Please retry."));
        };
        document.head.append(s);
      }),
    );
  return scripts.get(path);
}
const assets = new Map();
async function bytes(path) {
  if (!assets.has(path))
    assets.set(
      path,
      fetch(path, { credentials: "same-origin" })
        .then((r) => {
          if (!r.ok) throw Error("A document asset is missing. Please retry.");
          return r.arrayBuffer();
        })
        .catch((e) => {
          assets.delete(path);
          throw e;
        }),
    );
  return assets.get(path);
}
async function pdfTools() {
  const [pdf, fontkit] = await Promise.all([
    library("/vendor/pdf-lib.min.js", "PDFLib"),
    library("/vendor/fontkit-1.1.1.min.js", "fontkit"),
  ]);
  return { pdf, fontkit };
}
// Everybody making a PDF requests the same three assets. Font selection for names stays in the tab.
const fontPaths = {
  regular: "/fonts/wff-pdf-regular.v2.ttf",
  bold: "/fonts/wff-pdf-bold.v2.ttf",
  extended: "/fonts/noto-sans-sc-450.ttf",
};
const documentFonts = new WeakMap();
async function fontFor(doc, bold = false, subset = true, expanded = currentLanguage() === "zh-Hans") {
  await Promise.all(Object.values(fontPaths).map(bytes));
  const path = expanded ? fontPaths.extended : bold ? fontPaths.bold : fontPaths.regular;
  if (!documentFonts.has(doc)) documentFonts.set(doc, new Map());
  const fonts = documentFonts.get(doc);
  const key = path + (subset ? "#subset" : "#full");
  if (!fonts.has(key)) fonts.set(key, bytes(path).then(data => doc.embedFont(data, { subset })));
  return fonts.get(key);
}
const glyphSets = new WeakMap();
const hasCharacters = (font, text) => {
  if(!glyphSets.has(font)) glyphSets.set(font,new Set(font.getCharacterSet()));
  const supported = glyphSets.get(font);
  return [...text].every((c) => c === "\n" || supported.has(c.codePointAt(0)));
};
function mustRender(font, str) {
  if (!hasCharacters(font, str))
    throw Error(
      "The PDF font cannot safely represent one of these characters. Use the local authority link for a will in that script.",
    );
}
async function typeset(title, p, render, instrumentPages = false, expanded = currentLanguage()==="zh-Hans", names = []) {
  const { pdf, fontkit } = await pdfTools();
  const doc = await pdf.PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([fontFor(doc,false,true,expanded), fontFor(doc,true,true,expanded)]);
  if (p.route === "fixed") {
    const publicationDate = new Date("2026-11-14T00:00:00Z");
    doc.setCreationDate(publicationDate);
    doc.setModificationDate(publicationDate);
  }
  title = display(title);
  doc.setTitle(title);
  doc.setCreator("WillForFree");
  doc.setLanguage(currentLanguage());
  const [w, h] =
    p.country === "US" || p.country === "CA" ? [612, 792] : [595.28, 841.89];
  let page, y;
  const ink = pdf.rgb(0.05, 0.13, 0.25);
  const newPage = () => {
    page = doc.addPage([w, h]);
    y = h - 57;

  };
  const space = (height) => {
    if (!page || y - height < 60) newPage();
  };
  // A short legal name should remain readable as one unit, including at a page break.
  const spacedNames = [...new Set(names)].filter(name => name.includes(" ")).sort((a,b) => b.length - a.length);
  const escapedNames = spacedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const namePattern = escapedNames.length ? new RegExp("(" + escapedNames.join("|") + ")", "u") : null;
  const segmenter = currentLanguage() === "zh-Hans" ? new Intl.Segmenter("zh-Hans",{granularity:"word"}) : null;
  const words = str => segmenter ? Array.from(segmenter.segment(str), part => part.segment) : str.split(/(\s+)/u);
  const run = (str, font, size, lh) => {
    mustRender(font, str);
    let line = "";
    const chunks = namePattern ? str.split(namePattern).flatMap((part,i) =>
      i % 2 && font.widthOfTextAtSize(part,size) <= w - 100 ? [part] : words(part)) : words(str);
    for (const word of chunks) {
      if (font.widthOfTextAtSize(word, size) > w - 100)
        throw Error(
          "A word is too long for the legal document. Please use a local professional for this name.",
        );
      const next = line+word;
      if (line && font.widthOfTextAtSize(next, size) > w - 100) {
        space(lh);
        page.drawText(line.trimEnd(), { x: 50, y, font, size, color: ink });
        y -= lh;
        line = word.trimStart();
      } else line = next;
    }
    if (line) {
      space(lh);
      page.drawText(line.trimEnd(), { x: 50, y, font, size, color: ink });
      y -= lh;
    }
  };
  const text = (str) => {
    run(display(str), regular, 11.5, 16);
    y -= 8;
  };
  const sub = (str) => {
    space(62);
    run(display(str), bold, 14, 19);
    y -= 3;
  };
  const head = (str) => {
    space(70);
    run(display(str), bold, 22, 28);
    y -= 7;
  };
  const field = (label) => {
    space(32);
    page.drawLine({
      start: { x: 50, y: y - 6 },
      end: { x: w - 50, y: y - 6 },
      thickness: 0.6,
      color: ink,
    });
    y -= 19;
    run(display(label), regular, 8.5, 10);
    y -= 14;
  };
  newPage();
  await render({
    text,
    sub,
    head,
    field,
    space,
    newPage,
    get remaining() {
      return y - 60;
    },
  });
  const pages = doc.getPages();
  pages.forEach((pg, i) =>
    pg.drawText(title + "  |  " + (i + 1) + " / " + pages.length, {
      x: 50,
      y: 27,
      font: regular,
      size: 8,
      color: ink,
    }),
  );
  if (instrumentPages) {
    pages.forEach((sheet,i) => {
      let footer = "";
      if (p.key === "CA-QC" && p.route === "paper")
        footer = "Initials on this sheet:   Maker __________    Witness 1 __________    Witness 2 __________";
      if (p.key === "GB-SCT" && i < pages.length-1) footer = "Will-maker’s signature on this sheet: __________________________________________";
      if (p.key === "AU-VIC" && i < pages.length-1) footer = "Maker signature: ______________   Witness 1: ______________   Witness 2: ______________";
      if (p.key === "NL" && pages.length>1) footer = "Maker’s own page number: ____    Maker’s full signature: __________________________";
      if (p.key === "PT" && i < pages.length-1) footer = "Will-maker’s full signature on this numbered sheet: _____________________________";
      if (footer) {
        const line=display(footer);
        const size=Math.min(9,(w-100)/regular.widthOfTextAtSize(line,1));
        sheet.drawText(line,{x:50,y:45,font:regular,size,color:ink});
      }
    });
  }
  return doc.save();
}
function texForm(a) {
  return (
    "tx-" +
    (a.marriage === "Married, spouse living" ? "married" : "single") +
    "-" +
    (a.descendants === "No children or grandchildren"
      ? "no-children"
      : "children")
  );
}
export function formFilename(p, a) {
  return p.key === "US-CA" ? "ca-statutory" : texForm(a);
}
async function courtForm(p, a) {
  const { pdf, fontkit } = await pdfTools();
  const file = formFilename(p, a);
  const original = p.key === "US-TX" ? (await loadTexasForms()).get(file) : await bytes("/forms/" + file + ".pdf");
  const doc = await pdf.PDFDocument.load(original);
  doc.registerFontkit(fontkit);
  // A full font in AcroForm's default resource dictionary allows subsequent edits in PDF readers.
  const expanded=currentLanguage()==="zh-Hans" || !latinPdfText(Object.values(a).flat().join(" "));
  const font = await fontFor(doc, false, false, expanded);
  const form = doc.getForm();
  const dictionary = (parent, name) => {
    const key = pdf.PDFName.of(name);
    let child = parent.lookupMaybe(key, pdf.PDFDict);
    if (!child) {
      child = doc.context.obj({});
      parent.set(key, child);
    }
    return child;
  };
  const resourceFonts = dictionary(
    dictionary(form.acroForm.dict, "DR"),
    "Font",
  );
  resourceFonts.set(pdf.PDFName.of(font.name), font.ref);
  const fields = form.getFields().filter((f) => f instanceof pdf.PDFTextField);
  function writeField(f, value) {
    mustRender(font, value);
    const sizes = f.acroField.getWidgets().map((w) => w.getRectangle());
    const designed =
      Number(
        (f.acroField.getDefaultAppearance() || "").match(/([0-9.]+)\s+Tf/)?.[1],
      ) || 11;
    const em = font.widthOfTextAtSize(value, 1),
      height = font.heightAtSize(1, { descender: false });
    const fitted =
      Math.floor(
        10 *
          Math.min(
            designed,
            ...sizes.map((s) => (s.width - 6) / em),
            ...sizes.map((s) => (s.height - 1) / height),
          ),
      ) / 10;
    if (fitted < 7)
      throw Error(
        "An entry cannot fit legibly in the official form. Keep the correct spelling. Return to your answers or use the original court form linked on the kit page.",
      );
    f.setText(value);
    f.setFontSize(fitted);
    f.updateAppearances(font);
  }
  function set(match, value) {
    if (!value || value === "Leave open") return;
    const list = fields.filter((f) => match(f.getName()));
    if (list.length !== 1)
      throw Error("The court form changed. Check the original form.");
    writeField(list[0], value);
  }
  const gifts=giftList(a);
  if (p.key === "US-CA") {
    set((n) => n === "Print Your Full Name", a.maker);
    set((n) => n === "Name of First Choice for Executor", a.executor);
    set((n) => n === "Name of Second Choice for Executor", a.alternate);
    set((n) => n === "Balance Person", a.oneAdult);
    (a.multiple || []).forEach((v, i) =>
      set(
        (n) => n === "Balance Person " + ["One", "Two", "Three", "Four"][i],
        v,
      ),
    );
    set(
      (n) => n === "Name of First Choice for Guardian of the Person",
      a.familyGuardian,
    );
    set(
      (n) => n === "Name of First Choice for Custodian of Assets",
      a.custodian,
    );
    set((n) => n === "Age", a.custodyAge);
    const lines = ["One","Two","Three","Four","Five"];
    for (const [i,g] of gifts.entries()) {
      const row=lines[i];
      if (!row || !g.amount) throw Error("The cash gifts do not fit the California form.");
      set(n => n === (row==="Two" ? "Cash Gift Recipient " : "Cash Gift Recipent ")+row, g.recipient);
      set(n => n === "Amount "+row, "$"+g.amount);
    }
  } else if (currentLanguage()==="es") {
    const layout=bilingualTexas[file];
    const fill=(name,value)=>{if(name && value && value!=="Leave open")set(n=>n===name,value);};
    const group=(names,values=[],leaveBlank=false)=>{
      if (values.slice(names.length).some(value => value && value !== "Leave open"))
        throw Error("The court form changed. Check the original form.");
      names.forEach((name,i)=>fill(name,values[i] || (leaveBlank ? "" : "XXXX")));
    };
    fill(layout.maker,a.maker);fill(layout.alsoKnown,a.alsoKnown && a.alsoKnown!=="Leave open" ? a.alsoKnown : "XXXX");
    fill(layout.spouse,a.spouse);
    group(layout.executors,[a.executor,a.alternate==="Leave open"?"":a.alternate]);
    group(layout.guardians,[a.familyGuardian==="Leave open"?"":a.familyGuardian]);
    const deferredChildren=(a.txLiving || "").startsWith("I will");
    group(layout.living,a.formChildren,deferredChildren);group(layout.otherDescendants,[],deferredChildren);
    group(layout.residue,[a.recipient,...(a.txOthers || [])]);group(layout.alternates,a.txAlternates);
    const deferred=a.txSpecific!=="Use section 2 for everything" || courtDeferred(a);
    for(const [i,[property,person]] of layout.gifts.entries()) {
      const gift=gifts[i];
      if(gift){fill(property,gift.type===item ? gift.description : "USD "+gift.amount);fill(person,gift.recipient);}
      else if(!deferred){fill(property,"XXXX");fill(person,"XXXX");}
    }
    group(layout.otherGifts,[],deferred);
  } else {
    set((n) => n.endsWith("1 My full name is:"), a.maker);
    set(
      (n) => /Name of First Choice for Independent Executor/.test(n),
      a.executor,
    );
    set(
      (n) => /Name of Second Choice for Independent Executor/.test(n),
      a.alternate,
    );
    set((n) => n.endsWith("2 I am married to:"), a.spouse);
    set((n) => n === "2. First Middle Last Suffix Jr Sr etc", a.recipient);
    set(
      (n) => /Name of First Choice for Guardian of the Person/.test(n),
      a.familyGuardian,
    );
    set((n) => /I am sometimes also know(?:n)? as:/.test(n), a.alsoKnown);
    (a.txAlternates || []).forEach((v, i) => {
      const suffix = i === 0 ? " Jr Sr etc" : i === 1 ? "" : " " + i;
      set((n) => n === "2.3 First Middle Last Suffix" + suffix, v);
    });
    (a.txOthers || []).forEach((v, i) => {
      set(
        (n) => n === "2. First Middle Last Suffix" + (i ? " " + (i + 1) : ""),
        v,
      );
    });
    (a.formChildren || []).forEach((value, i) => {
      const field =
        a.marriage === "Married, spouse living"
          ? "1.4A The full names of my living children are:" +
            (i ? " " + (i + 1) : "")
          : "1.4A First Middle Last Suffix" +
            (i === 0 ? " Jr Sr etc" : i === 1 ? "" : " " + i);
      set((n) => n === field, value);
    });
    for (const [i,g] of gifts.entries()) {
      const row=texasGiftRows[file]?.[i];
      if (!row) throw Error("The gifts do not fit this Texas form.");
      set(n => n === row[0], g.type === item ? g.description : "US dollars: "+g.amount);
      set(n => n === row[1], g.recipient);
    }
    const keepOtherGifts = a.txSpecific !== "Use section 2 for everything" || courtDeferred(a);
    // The originals expressly permit XXXX in unused fact fields. Each form has three execution fields.
    // Preserve blank descendant or specific-gift boxes when a person chooses to complete them after download.
    for (const f of fields) {
      const n = f.getName();
      if (
        f.getText() ||
        /^(Testator|First Witness|Second Witness) First Middle Initial/.test(n)
      )
        continue;
      const childField =
        /^1\.4/.test(n) ||
        (file === "tx-married-children" && n === "First Middle Last Suffix_6");
      const deferredDescendants =
        (a.txLiving || "").startsWith("I will") && childField;
      const deferredGifts =
        keepOtherGifts &&
        !childField &&
        (/^3\.[123]/.test(n) || /^First\s+Middle\s+Last/.test(n));
      if (!deferredDescendants && !deferredGifts) writeField(f, "XXXX");
    }
  }
  return doc.save({ updateFieldAppearances: false });
}
// Used to publish the fixed, unpersonalized form asset for this state. No chat data is accepted.
export function fixedInstrument(p) { return duringKit(()=>buildFixedInstrument(p)); }
async function buildFixedInstrument(p) {
  if (p.route !== "fixed") throw Error("No fixed form for this location.");
  if (currentLanguage() !== "en") throw Error("The published blank form is in English.");
  return typeset("Last will and testament",p,({head,sub,text,field,space}) => {
    head("Last will and testament");
    text(sentence("State of {0}", wording(p.name)));
    sub("Declaration");
    text("I declare this to be my last will. I revoke all earlier wills and codicils.");
    field("My full legal name"); field("My town or city and state of permanent residence");
    sub("Executor");
    text("I appoint the following person as executor to administer my estate under the law:");
    field("Executor’s full legal name");
    sub("My remaining estate");
    text("After payment of enforceable debts, taxes and reasonable funeral and administration expenses, I leave all the residue of my estate to the following person if they survive me:");
    field("Primary beneficiary’s full legal name");
    text("If that person does not survive me, I leave the residue to the following person if they survive me. If neither survives, the residue passes by intestacy.");
    field("Backup beneficiary’s full legal name");
    if (p.key === "US-CO") text("If a named beneficiary does not survive me, that gift to that person lapses. Their descendants do not take that gift in their place. This does not prevent anyone from taking a gift in their own name or inheriting under the law of intestacy.");
    space(440); sub("Execution");
    text("I declare the foregoing document to be my will. I request the two witnesses below to witness my signature.");
    field("Will-maker’s printed full name");field("Date and place of signing");field("Will-maker’s signature");
    text("At the will-maker’s request we both saw the will-maker declare and sign this will, and we both signed in the presence of the will-maker and of each other.");
    for (let n=1;n<=2;n++) { field(sentence("Witness {0}: signature and full name", n));field(sentence("Witness {0}: residential address", n)); }
  },true);
}
async function instrument(p, a) {
  if (p.route === "statutory" && p.key === "US-ME") return new Uint8Array(await bytes("/forms/me-statutory.pdf"));
  if (p.route === "fixed") return new Uint8Array(await bytes("/forms/basic/"+p.region+".pdf"));
  if (p.route === "official") return courtForm(p, a);
  const hand = p.route === "handwriting";
  const names = questions(p,a).filter(q => ["name","names"].includes(q.kind) && a[q.id] && a[q.id] !== "Leave open")
    .flatMap(q => a[q.id]);
  return typeset(
    hand ? "Handwriting text" : (procedureTitle[p.key] || "Last will and testament"),
    p,
    ({ text, head, sub, field, space }) => {
      head(hand ? "Text to copy entirely by hand" : (procedureTitle[p.key] || "Last will and testament"));
      if (hand)
        text(
          "Reference copy. Personally handwrite all the numbered provisions below on blank paper. Add the date and place in your own handwriting and sign the handwritten original at the end. Do not sign this printout.",
        );
      sections(p, a).forEach(([label, body], i) => {
        sub(sentence("{0}. {1}", i + 1, wording(label)));
        text(body);
      });
      if (hand) return;
      if (p.route === "deposit") {
        if (p.key === "PT") {
          space(465); sub(sentence("Signing the will of {0}", a.maker));
          text("In the presence of both witnesses and the authorized person, I declare that this document is my will and that I know its contents.");
          field("Will-maker’s full signature");
          for(let i=1;i<=2;i++) { field(sentence("Witness {0}: signature", i)); field(sentence("Witness {0}: full name and address", i)); }
          field("Authorized person: signature and official capacity"); field("Date entered by the authorized person at the end of the will");
        } else {
          space(125); sub(sentence("Signature of {0}", a.maker)); text("I sign these provisions as my will.");
          field("Will-maker’s signature at the end");
        }
        return;
      }
      if (p.key === "US-PA") {
        space(180);
        sub(sentence("Signing the will of {0}", a.maker));
        text("I sign the preceding provisions as my will.");
        field("Place and date of signing");
        field(sentence("Signature of {0}", a.maker));
        return;
      }
      const scotland = p.key === "GB-SCT";
      // Keep the actual signing and attestation together; the witness page identifies the will-maker independently.
      space(scotland ? 410 : p.country === "IS" ? 610 : p.country === "DK" ? 580 : 540);
      sub(sentence("Signing the will of {0}", a.maker));
      text(
        scotland ? "I declare the preceding provisions to be my will and I request the witness below to witness my signature." : "I declare the preceding provisions to be my will and I request the witnesses below to witness my signature.",
      );
      field("Place of signing");
      field("Day, month (in words) and year");
      field(sentence("Signature of {0}", a.maker));
      sub(scotland ? "Witness" : "Witnesses");
      text(
        scotland
          ? "I witnessed the will-maker sign this will and signed in their presence."
          : ["IS","DK"].includes(p.country)
            ? "The maker specifically called us both to witness this will. We knew it was the maker’s will, saw the maker sign it while we were both present, and considered the maker capable of making a will. We then signed in the presence of the maker and of each other."
            : "At the will-maker’s request we were both present together, saw the will-maker declare and sign this will freely and with apparent capacity, and we sign as witnesses in the presence of the will-maker and of each other.",
      );
      for (let i = 1; i <= (scotland ? 1 : 2); i++) {
        field(sentence("Witness {0}: signature and printed full name", i));
        field("Residential address, occupation, place and date of signing");
        if (p.country === "IS") field("Witness identification number");
      }
      if (p.country === "DK") field("Time of ceremony and any other relevant circumstances");
      if (p.country === "IS") {
        field("Exact time the will-maker signed");
        field(
          "Witness observations on other circumstances relevant to validity, if any",
        );
      }
    }, !hand, currentLanguage()==="zh-Hans" || !latinPdfText(Object.values(a).flat().join(" ")), names,
  );
}
async function companion(place,title,build) {
  const {pdf,fontkit}=await pdfTools();
  const doc=await pdf.PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular,bold]=await Promise.all([fontFor(doc),fontFor(doc,true)]);
  return renderCompanion({pdf,doc,regular,bold},place,title,build);
}

export function makeAnswerPDF(place,rows,{partial=false,notesOnly=false,maker="",earlier=[],gifts=[],checks=[]}={}) {
  return duringKit(()=>companion(place,partial?"Your answers so far":"Your interview answers",({body,heading,entry})=>{
    if(maker)body(sentence("Prepared for {0}", maker));
    body(partial ? "Keep these answers and questions for your records or to discuss with an adviser. This interview is unfinished and this document is not a will."
      : notesOnly ? "Your choices for planning and discussion. This copy is not a will." : "A personal record of the choices you confirmed in the chat. Only the separate will document is used to make your will. Keep this copy private.");
    if(gifts.length){
      heading("Your gifts");
      for(const gift of gifts)entry(sentence("Gift {0} to {1}", gift.n, gift.recipient),giftText(place,gift),true);
    }
    if(gifts.length || checks.length)heading("Your answers");
    for(const [label,value] of rows)entry(label,value,true);
    if(checks.length){heading("Checks you confirmed");for(const [label,value] of checks)entry(label,value);}
    if(earlier.length){heading("Earlier choices for discussion");for(const [label,value] of earlier)entry(label,value,true);}
  }));
}

function confirmedAnswers(place,answers) {
  const rows=[],checks=[];
  for(const q of questions(place,answers)){
    if(!Object.hasOwn(answers,q.id))continue;
    const value=answers[q.id];
    if(value===YES || (q.giftField==="extraFit" && value===q.values[0])){
      for(const card of interviewCards(q,place,answers)){
        const choice=card.options?.find(o=>o.value===value);
        checks.push([card.title,choice?.label || "Confirmed"]);
      }
    }else rows.push([reviewLabel(q), q.values?.includes(value) ? display(friendlyValue(value)) : formatValue(value)]);
  }
  return {rows,checks};
}

export function createKit(incoming, offer) { return duringKit(()=>buildKit(incoming,offer)); }
async function buildKit(incoming, offer) {
  const state = validateState(incoming, true);
  const a = state.answers;
  const original = await placeForSession(state.place, state.purpose);
  const p = wishesProfile(executionProfile(original, a), a);
  const unresolved = needsAdvice(a);
  const personalNotes = notesEntries(a);
  const gifts = giftList(a);
  const notesOnly = p.use === "appointment" || p.use === "planning";
  const includeBusinessGuide = !notesOnly && (a.businessOwnership === ownsBusiness || blankBusinessGuide(p));
  if (notesOnly && ((!a.wishes && !a.extraRequest) || !a.maker))
    throw Error(
      "Please complete the private notes interview for this location.",
    );
  const zip = await library("/vendor/fflate-0.8.3.min.js", "fflate");
  const steps = signing(p),
    next = notesOnly
      ? [
          "Keep your private notes with your planning papers. Tell a trusted person where your signed will is once you have made one.",
          "Store these PDFs somewhere private. You can bring them to a local appointment.",
        ]
      : after(p);
  if (editionNotice(p)) steps.unshift(editionNotice(p));
  if (!notesOnly && p.route !== "official") steps.unshift(sentence("Use this procedure in {0}. If you plan to sign elsewhere, check the rules there before signing.", wording(p.name)));
  if (!notesOnly && p.country === "SG" && currentLanguage() !== "en") next.push("If your executor applies for probate in Singapore with a will written in another language, the court generally requires an English translation certified by a court interpreter or verified by a qualified translator’s affidavit. The simplified online Probate eService accepts only wills written in English.");
  if (!notesOnly && p.key === "US-NY" && currentLanguage() !== "en") next.push("For probate in New York, submit the original will. If it is written in another language, provide an English translation and the translator’s affidavit stating their qualifications and confirming the translation is accurate.");
  if (!notesOnly && p.key === "CA-QC" && !["en","fr"].includes(currentLanguage())) next.push("To have this will verified in Québec, first have it translated into French or English by a translator recognized by Québec’s professional order of translators (OTTIAQ).");
  if (unresolved) steps.unshift("There is an unresolved request. This is a planning kit, not a will. Resolve the request with a local estates professional before signing anything.");
  if (includeBusinessGuide) steps.unshift(sentence("{0} and check that the gifts in this will match what you want for the part you own.", wording(sentence("{0}{1}", wording(blankBusinessGuide(p) ? "If you own a business, read " : "Read "), wording(businessFile)))));
  if (personalNotes.length) next.push("04-Personal-wishes.pdf is separate from any will. Share relevant notes with the people who need them; the notes do not make gifts or authorize account access.");
  if (!notesOnly && p.key === "US-TX") {
    steps.unshift(
      "This software is not a substitute for the advice of an attorney.",
    );
    if (a.marriage === "Married, spouse living" || a.descendants === "I have children or grandchildren") steps.push(texasFamilyHome);
    if (a.txChoice)
      steps.push(
        texasResidueChoices,
        sentence("For section 2.2 you chose {0}. In the signing ceremony sign exactly that option and cross out the other choice as the court form directs.", wording(a.txChoice)),
        texasUnsignedChoice,
      );
    const deferred=a.txSpecific !== "Use section 2 for everything" || courtDeferred(a);
    if (gifts.length) steps.push(sentence("Section 3.3 contains {0} chat {1} Match each item or amount with the person on that same line.", gifts.length, wording(gifts.length===1?"gift on the first line.":"gifts in printed order.")));
    steps.push(deferred
      ? "Complete any remaining permitted gifts in the available section 3 boxes before signing. Cross out unused boxes as the court directs. Do not add a continuation page."
      : sentence("{0} Check all printed pages for unused boxes and mark them as the court directs.", wording(gifts.length ? "Other unused section 3 gift boxes are marked XXXX." : "You chose no separate specific gifts. The editable boxes for section 3 have been marked XXXX.")));
    if ((a.txLiving || "").startsWith("I will"))
      steps.push(
        "You chose to complete the child and grandchild details yourself. Complete section 1.4 and cross out all unused boxes before signing.",
      );
  }
  if (!notesOnly && p.key === "US-CA") {
    steps.push(californiaCommunityShare);
    if (courtSpouseInherits(p, a)) steps.push("If your spouse or registered domestic partner survives you, that person owns what is left outright.");
    steps.push(
      a.caBond === "Sign the box to waive bond"
        ? "You chose to waive the executor’s bond. Sign the box in paragraph 9 at execution."
        : "You chose to leave the paragraph 9 bond waiver unsigned. A bond may be required.",
    );
    if (a.caBond === "Sign the box to waive bond") steps.push(californiaBond);
    const deferred=a.caExtras !== "Use my balance choice for everything" || courtDeferred(a);
    if (gifts.length) steps.push("Check each cash amount against its named recipient in paragraph 4. For every cash gift, sign the box next to it. Leave unused cash-gift boxes unsigned.");
    steps.push(deferred
      ? "Complete any other permitted gifts in the available boxes in paragraphs 2, 3 and 4. Follow the form’s instructions and sign each applicable box; do not add extra words or gift pages."
      : gifts.length ? "Leave the optional residence and personal effects sections 2 and 3 unsigned."
      : "You chose no separate residence, personal effects or cash gifts. Leave the optional gift sections 2, 3 and 4 unsigned.");
    steps.unshift(
      sentence("Your paragraph 5 balance choice is {0}. Sign only that box and sign at the end. If you sign no box or more than one in paragraph 5, California intestacy law governs the balance. Valid separate gifts in paragraphs 2 through 4 can still take effect.", wording(a.caBalance.startsWith("1") ? sentence("{0} · {1}", "1", wording(friendlyValue(a.caBalance))) : a.caBalance)),
    );
  }
  const label = notesOnly
    ? p.use === "appointment"
      ? "01-Notes-for-my-appointment.pdf"
      : "01-My-planning-notes.pdf"
    : p.route === "deposit" ? "01-Will-for-formal-completion.pdf"
    : p.route === "statutory" ? "01-Maine-statutory-will.pdf"
    : p.route === "fixed" ? "01-Simple-will-form.pdf"
    : p.route === "official"
      ? "01-Official-will-form.pdf"
      : p.route === "handwriting"
        ? "01-Will-text-to-handwrite.pdf"
        : "01-Last-will-and-testament.pdf";
  const guideFile = notesOnly ? "02-Local-next-steps.pdf" : "02-Signing-and-next-steps.pdf";
  const formIsBlank = ["fixed","statutory"].includes(p.route);
  const {rows,checks}=confirmedAnswers({...original,legacy:state.version===1},a);
  const hasAnswers=Boolean(rows.length || checks.length || state.record?.length);
  const primaryTitle=notesOnly ? (p.use==="appointment" ? "Notes for my appointment" : "My planning notes") : "";
  const mainDoc=notesOnly ? companion(p,primaryTitle,({body,heading,entry})=>{
    body(sentence("Prepared for {0}", a.maker));
    body("These notes are for discussion. There is no will to sign in this kit.");
    if(unresolved){
      heading("What to discuss locally");body(a.extraRequest,true);
      if(a.adviceFor)entry("Earlier choice affected",a.adviceFor,true);
      if(gifts.length){
        heading("Earlier gifts for discussion");
        for(const gift of gifts)entry(giftText(p,gift),gift.recipient,true,true);
      }
      body("The earlier choices are for reference. Your requested change has not been made into a will.");
    }else{heading("Your wishes");body(a.wishes,true);}
    if(state.record?.length){
      heading("Earlier choices for discussion");
      for(const [key,value] of state.record)entry(key,value,true);
    }
  }) : instrument(p,a);
  const guides=companion(p,notesOnly?"Your next steps":"Signing and next steps",({body,heading,entry,link})=>{
    if(!formIsBlank)body(sentence("Prepared for {0}", a.maker));
    heading(notesOnly?"Making your will locally":"Before you sign");
    steps.forEach((step,i)=>entry(sentence("Step {0}", i+1),step));
    heading(notesOnly?"Keep with your notes":"After signing");
    next.forEach(line=>body(line));
    if(!notesOnly && custodySources[p.key])link("After a death, check who must receive the original will and when",custodySources[p.key]);
    if(p.legalSource)body("Find the official sources in 00-Start-here.pdf.");
  });
  const files = [
    ["00-Start-here.pdf",companion(p,"Start here",({body,heading,entry,link})=>{
      if(!formIsBlank)body(sentence("Prepared for {0}", a.maker));
      if(notesOnly)body("You chose a planning kit. These PDFs are for discussion and there is no will to sign.");
      else if(formIsBlank)body("Fill out the blank form yourself. Read the signing guide before you sign.");
      else if(p.route==="handwriting")body("Copy the will text by hand. Follow the dating and signing instructions in your guide.");
      else if(p.route==="deposit")body("Use the will and its local completion guide together. The guide explains the formal steps still to take.");
      else body("Read your will and the signing guide together before you sign.");
      if (editionNotice(p)) body(editionNotice(p));
      heading("Inside your kit");
      entry(label,notesOnly?"Your notes to keep or take to an appointment.":p.route==="handwriting"?"The wording for you to copy by hand.":"Your will document. Follow the steps in the guide to complete it.");
      entry(guideFile,notesOnly?"Local steps to take next.":"The instructions for completing and keeping your will.");
      if(hasAnswers)entry("03-My-answers.pdf","A private reading copy of what you confirmed.");
      if(personalNotes.length)entry("04-Personal-wishes.pdf","Personal messages to keep separate from the will.");
      if(includeBusinessGuide)entry(businessFile,"A separate checklist for business owners.");
      if(offer && !notesOnly)entry("Sponsor-offer.pdf","An optional advertisement.");
      heading("About this kit");
      body("WillForFree is a self-service tool. No lawyer reviews your individual will through this service.");
      body(downloadNotice(p));
      if(!notesOnly && p.rule)body(p.rule);
      if(p.legalSource){
        heading("Official sources");
        if(notesOnly)link("Background for making your will locally",p.legalSource);
        if(!notesOnly){
          const links=new Map([[p.legalSource,p.key==="CA-ON"?"Execution and handwritten wills · Succession Law Reform Act, sections 4, 6, 7 and 12":"Local will-making rules"]]);
          for(const url of extraSources[p.key] || [])if(!links.has(url))links.set(url,"Further local guidance");
          if(p.key==="CA-ON"){
            links.set("https://www.ontario.ca/laws/statute/90c12","Children’s Law Reform Act, section 61");
            links.set("https://www.ontario.ca/page/apply-probate-estate","Probate, witness affidavits and proof of handwriting");
          }
          if(p.route==="statutory")links.set("https://legislature.maine.gov/statutes/18-C/title18-Csec2-517.pdf","Maine statutory will and republication notice");
          if(p.key==="US-TX")links.set("https://www.txcourts.gov/rules-forms/forms/","Original Texas court forms");
          if(p.key==="US-CA")links.set("https://selfhelp.courts.ca.gov/sites/default/files/2026-02/6240-Statutory-will-form.pdf","Original California court form");
          for(const [url,source] of links)link(source,url);
        }
      }
    })],
    [label,mainDoc],[guideFile,guides],
  ];
  if(hasAnswers)files.push(["03-My-answers.pdf",makeAnswerPDF(p,rows,{maker:a.maker,notesOnly,gifts,checks,earlier:state.record})]);
  if(personalNotes.length)files.push(["04-Personal-wishes.pdf",companion(p,"Personal wishes",({body,entry})=>{
    body(sentence("Prepared for {0}", a.maker));
    body("Messages to share with people you trust. These are separate from the will. They do not give away property, grant account access or appoint a caregiver.");
    personalNotes.forEach(([topic,note])=>entry(topic,note,true));
  })]);
  if(includeBusinessGuide)files.push([businessFile,companion(p,"Your business and your personal will",({heading,paragraph})=>{
    for(const section of businessChecklist(p)){heading(section.title);section.items.forEach(paragraph);}
  })]);
  if(offer && !notesOnly)files.push(["Sponsor-offer.pdf",companion(p,"An offer from our sponsor",({body,heading,link})=>{
    body("Advertisement");body(offer.kind==="paid"?sentence("Sponsored by {0}", offer.name):sentence("From the WillForFree team · {0}", offer.name));
    heading(offer.title,true);body(offer.message,true);link(sentence("Visit {0}", offer.name),offer.url);
    body("Your free kit is complete. This offer is optional and separate from your will.");
  })]);
  const entries=Object.fromEntries(await Promise.all(files.map(async ([name,content])=>[kitFileName(name),await content])));
  return {
    blob: new Blob([zip.zipSync(entries, { level: 0 })], {
      type: "application/zip",
    }),
    filename:
      "WillForFree-" +
      (p.region ? p.country + "-" + p.region : p.country) +
      (currentLanguage() === "en" ? (notesOnly ? "-notes.zip" : "-kit.zip") : "-" + currentLanguage() + ".zip"),
  };
}
export function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
