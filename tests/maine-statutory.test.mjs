import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { manageTurn } from "../public/conversation.js";
import { signing } from "../public/document.js";
import { helpFor } from "../public/interview-help.js";
import { wishesProfile } from "../public/extras.js";
import { interviewCards, mattersForReview, YES } from "../public/interview-copy.js";
import { profile } from "../public/markets.js";
import { setReviewNote, skipped } from "../public/planning.js";
import {
  maineAuthoredFit, maineChoicePrompt, maineEarlierChoice, mainePaperChoices, mainePrint,
  maineProperty, maineRemainder, maineSignatures, maineSpouseAmount, maineSpouseRights, maineWitnesses,
} from "../public/procedures.js";
import { questions, readAnswer, validateState } from "../public/will.js";
import { fixture } from "./fixtures.mjs";

const place = {country: "US", region: "ME"};
const statutory = {...profile(place), route: "statutory"};
const question = questions(statutory)[0];
const card = interviewCards(question, statutory)[0];
const [onPaper, choiceA, choiceB, choiceC] = mainePaperChoices;
const oldId = "maineResidueChoice";
const oldPrompt = "Do you want to use this Maine form without choosing B in section 2.4?";

function earlier(value, version = 2) {
  const state = fixture(place, {funeral: "Burial", funeralDetails: "Gather at Juniper Grove."}, "statutory");
  state.version = version;
  delete state.answers.mainePaperChoice;
  if (value !== undefined) state.answers[oldId] = value;
  setReviewNote(state, oldId, 0, oldPrompt, "Read the cedar packet.");
  return state;
}

test("the county form supports A, B, C, a decision on paper and private notes", () => {
  assert.equal(question.id, "mainePaperChoice");
  assert.equal(card.title, maineChoicePrompt);
  assert.deepEqual(card.lines, [maineSpouseAmount, maineRemainder, maineSpouseRights]);
  assert.deepEqual(card.options.map(o => o.label), [...mainePaperChoices, "Make a notes kit"]);
  for (const [typed, expected] of [["A", choiceA], ["I want choice B", choiceB], ["option c", choiceC], [onPaper, onPaper]]) {
    const result = manageTurn(typed, question, card, statutory);
    assert.equal(result.type, "answer");
    assert.equal(readAnswer(question, result.value).value, expected);
    const state = fixture(place, {mainePaperChoice: expected}, "statutory");
    assert.equal(validateState(state, true).answers.mainePaperChoice, expected);
    assert.equal(wishesProfile(statutory, state.answers).route, "statutory");
  }
  assert.ok(readAnswer(question, manageTurn("Make a notes kit", question, card, statutory).value).stop);
  for (const typed of ["B?", "B if my spouse survives 30 days", "B and C", "I’m not sure", "Yes, but I need B"])
    assert.ok(!mainePaperChoices.includes(manageTurn(typed, question, card, statutory).value), typed);
  assert.ok(!card.options.some(o => o.value === maineEarlierChoice));
});

test("the ordinary Maine interview excludes a married maker independently of its gift questions", () => {
  const p = profile(place), family = questions(p).find(q => q.id === "familyFit");
  assert.equal(p.parentPlan, false);
  const screening = interviewCards(family, p)[0];
  assert.ok(screening.lines.some(line => line.includes("spouse or partner")));
  assert.ok(readAnswer(family, manageTurn("yes", family, screening, p).value).stop);
  for (const other of [p, {...p, route: "planning"}, profile({country: "US", region: "NC"})])
    assert.ok(questions(other).every(q => q.id !== question.id));
});

test("Maine witness help identifies both witnesses and the separate optional notarial ceremony", () => {
  const witnesses = helpFor("witness", statutory);
  assert.equal(witnesses, maineWitnesses);
  assert.match(witnesses, /two independent witnesses/);
  assert.match(witnesses, /optional self-proving acknowledgment/);
  assert.ok(signing(statutory).includes(witnesses));
  assert.match(helpFor("signing", statutory), /signing and witness instructions/);
  assert.match(helpFor("gifts", statutory), /choice B on page 3/);
  assert.doesNotMatch(witnesses, /remainder/);
  assert.equal(helpFor("familyRights", statutory), maineSpouseRights);
});

test("earlier statutory wishes keep their meaning, private note, and unrelated answers", () => {
  for (const version of [1, 2]) {
    const positive = validateState(earlier(YES, version), true, true);
    assert.equal(positive.answers.mainePaperChoice, maineEarlierChoice);
    assert.equal(positive.answers.funeralDetails, "Gather at Juniper Grove.");
    assert.deepEqual(positive.reviewNotes, [{id: question.id, part: 0, question: oldPrompt, text: "Read the cedar packet."}]);
    assert.equal(wishesProfile(statutory, positive.answers).route, "statutory");
    assert.deepEqual(validateState(positive, true, true), positive);
    for (const oldAnswer of ["No", "No or unsure", "I’m not sure", skipped]) {
      const previous = earlier(oldAnswer, version);
      if (oldAnswer === skipped) previous.issues = {[oldId]: [0, "No", "Keep this private."]};
      const imported = validateState(previous, true, true);
      assert.equal(imported.answers.mainePaperChoice, skipped);
      assert.deepEqual(imported.issues.mainePaperChoice, previous.issues?.[oldId] || [0, oldAnswer]);
      assert.equal(wishesProfile(statutory, imported.answers, imported.issues).route, "planning");
      assert.equal(imported.answers.funeralDetails, positive.answers.funeralDetails);
      assert.deepEqual(imported.reviewNotes, positive.reviewNotes);
      assert.deepEqual(validateState(imported, true, true), imported);
      const matters = mattersForReview(statutory, imported.answers, imported.issues, questions(statutory, imported.answers), [], imported.reviewNotes);
      assert.ok(matters.some(([, text]) => text === "Read the cedar packet."));
      imported.answers.mainePaperChoice = choiceB;
      assert.throws(() => validateState(imported, true), /Invalid review details/);
      delete imported.issues.mainePaperChoice;
      assert.equal(validateState(imported, true).answers.mainePaperChoice, choiceB);
    }
  }
});

test("missing earlier answers need a fresh choice, inconsistent continuations cannot issue a will", () => {
  const unanswered = earlier(undefined);
  const reopened = validateState(unanswered, false, true);
  assert.ok(!reopened.answers.mainePaperChoice);
  assert.deepEqual(reopened.reviewNotes, [{id: question.id, part: 0, question: oldPrompt, text: "Read the cedar packet."}]);
  reopened.answers.mainePaperChoice = choiceB;
  assert.equal(validateState(reopened, true).reviewNotes[0].text, "Read the cedar packet.");
  assert.throws(() => validateState(unanswered, true), /remaining questions/);
  for (const bad of [earlier(skipped), earlier("Choice B"), earlier("A and C")])
    assert.throws(() => validateState(bad, true), /check the answers/);
  const conflicting = earlier("No");
  conflicting.answers.mainePaperChoice = choiceB;
  assert.throws(() => validateState(conflicting, true), /check the answers/);
});

test("all companion languages identify the English county form's printed amount line", async () => {
  const dir = new URL("../public/locales/", import.meta.url);
  const files = (await readdir(dir)).filter(name => name.endsWith(".json"));
  assert.equal(files.length, 18);
  for (const name of files) {
    const dictionary = JSON.parse(await readFile(new URL(name, dir)));
    for (const key of [maineChoicePrompt, ...mainePaperChoices, maineEarlierChoice, mainePrint, maineProperty, maineSpouseAmount, maineRemainder, maineSignatures, maineSpouseRights, maineAuthoredFit])
      assert.ok(dictionary[key] && dictionary[key] !== key, name + " " + key);
    assert.ok(dictionary[maineSpouseAmount].includes("to my spouse"), name);
    for (const option of [choiceA, choiceB, choiceC])
      assert.equal(dictionary[option][0], option[0], name);
  }
});
