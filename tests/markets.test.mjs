import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markets,
  regions,
  profile,
  suggestion,
  executionProfile,
  copyByHand,
} from "../public/markets.js";
import { evidence } from "../public/jurisdiction-evidence.js";
import { documentUse } from "../public/release.js";
import { readAnswer, validateState, questions } from "../public/will.js";
import { sections, signing } from "../public/document.js";
import { fixture } from "./fixtures.mjs";
const place = (country, region = "") => ({ country, region });
const ontario = place("CA", "ON");
function withoutNewChecks(state) {
  const old=structuredClone(state);
  let remove=false;
  for(const k of Object.keys(old.answers)){remove ||= k==="firstInstrument"; if(remove) delete old.answers[k];}
  return old;
}

test("all 97 supported locations have an explicit result and unknown countries never borrow another location’s law", () => {
  assert.equal(Object.keys(markets).length, 25);
  let total = 0;
  for (const country of Object.keys(markets))
    for (const region of Object.keys(regions[country] || { "": 1 })) {
      const p = profile(place(country, region));
      const entry = evidence[p.key];
      assert.equal(p.legalSource, entry?.source || null);
      if (entry) assert.match(entry.source, /^https?:\/\//);
      if (Object.hasOwn(markets, country)) assert.ok(entry);
      assert.equal(documentUse(p,"workbench","willforfree.com"),"closed");
      assert.equal(documentUse(p,"closed","localhost"),"closed");
      assert.equal(documentUse(p,"workbench","localhost"),["deposit","fixed","official"].includes(p.route) ? p.route : "will");
      total++;
    }
  assert.equal(total, 97);
  for (const malformed of [
    { country: ["CA"], region: "ON" },
    { country: "CA", region: ["ON"] },
  ])
    assert.throws(() =>
      validateState({ version: 1, place: malformed, answers: {} }),
    );
  for (const country of ["LK", "RW", "FR", "JP"]) {
    assert.equal(suggestion(country, "Ontario"), null);
    assert.throws(() => profile(place(country)));
    assert.throws(() =>
      validateState({ version: 1, place: place(country), answers: {} }),
    );
  }
  assert.equal(documentUse(profile(ontario),"workbench","127.0.0.1"),"will");
  assert.equal(documentUse(profile(ontario),"local","untrusted.example"),"closed");
});

test("Ontario branches keep handwritten and typed ceremonies apart and older progress can answer the new final question", () => {
  const state = fixture(ontario, {
    household: "Children first",
    execution: copyByHand,
  });
  assert.deepEqual(validateState(state, true), state);
  assert.equal(state.answers.partner, undefined);
  const p = executionProfile(profile(ontario), state.answers);
  const body = sections(p, state.answers).flat().join(" ");
  assert.ok(body.includes("Avery Morgan") && body.includes("Morgan Chen"));
  assert.ok(
    !body.includes("my spouse or partner") && !body.includes("undefined"),
  );
  const hand = signing(p).join(" ");
  assert.match(hand, /does not require any witnesses/);
  assert.match(hand, /74F/);
  assert.ok(!hand.includes("74D"));
  for (const [id, invalid] of [
    ["maker", [state.answers.maker]],
    ["eligible", [state.answers.eligible]],
    ["children", "A Child"],
  ])
    assert.throws(() =>
      validateState(
        { ...state, answers: { ...state.answers, [id]: invalid } },
        true,
      ),
    );
  const partnered = fixture(ontario, { household: "Partner, then children" });
  const confirmation = questions(profile(ontario), partnered.answers).find(
    (q) => q.id === "partnerOutright",
  );
  assert.match(confirmation.prompt, /residue, they own it outright/);
  assert.match(confirmation.prompt, /separate gift you make to a child/i);
  assert.equal(readAnswer(confirmation, "No or unsure").stop, true);
  const olderPartner = withoutNewChecks(partnered);
  delete olderPartner.answers.extra; // The earlier interview had no extras checkpoint.
  delete olderPartner.answers.partnerOutright;
  assert.deepEqual(validateState(olderPartner), olderPartner);
  assert.throws(() => validateState(olderPartner, true));
  const previous = withoutNewChecks(state);
  delete previous.answers.extra;
  delete previous.answers.execution;
  assert.deepEqual(validateState(previous), previous);
  assert.throws(() => validateState(previous, true));
  assert.match(signing(profile(ontario)).join(" "), /74D/);
  assert.equal(
    readAnswer(
      questions(p, state.answers).find((q) => q.id === "familyFit"),
      "No or unsure",
    ).stop,
    true,
  );
});

test("non-operative planning and appointment notes preserve the user’s own script and cannot promote a saved file to a will", () => {
  for (const [p, purpose] of [
    [place("PT"), ""],
    [place("NL"), ""],
    [ontario, "planning"],
  ]) {
    const state = {
      version: 1,
      place: p,
      ...(purpose ? { purpose } : {}),
      answers: {
        appointment: "Yes, all apply",
        maker: "山田太郎",
        wishes: "家族、相続、遺言について相談したい。",
      },
    };
    const expected={...state,purpose:"planning"};
    assert.deepEqual(validateState(state),expected);
    assert.throws(() => validateState(state, true), /remaining questions/);
    Object.assign(state.answers,{priorWill:"No",pets:"No",funeral:"No preference",orgGift1:"I’m done",extra:"Nothing else"});
    assert.deepEqual(validateState(state, true), expected);
    assert.throws(() => validateState({ ...state, purpose: "official" }, true));
  }
  const plan = questions({...profile(place("MT")),route:"planning"}, {});
  assert.deepEqual(
    plan.map((q) => q.id),
    ["priorWill","appointment", "maker", "wishes","pets","funeral", "extra","orgGift1"],
  );
  assert.ok(readAnswer(plan[2], "PIN: 546222").error);
  assert.match(signing(profile(place("PT"))).join(" "), /notary/);
});

test("court form chat choices cover residue, alternates, optional gifts, bonds and execution boxes", () => {
  const tx = place("US", "TX");
  const married = fixture(tx, {
    marriage: "Married, spouse living",
    descendants: "No children or grandchildren",
  });
  assert.equal(married.answers.txAlternates.length, 2);
  const family = fixture(tx, {
    marriage: "Married, spouse living",
    descendants: "I have children or grandchildren",
    txChoice: "Choice 2 · Children first",
  });
  assert.ok(family.answers.txChoice.startsWith("Choice 2"));
  const single = fixture(tx, {
    marriage: "Single, widowed or divorced",
    descendants: "No children or grandchildren",
    txAdditional: "Add more names",
  });
  const names = questions(profile(tx), single.answers).find(
    (q) => q.id === "txOthers",
  );
  assert.ok(readAnswer(names, single.answers.recipient, single.answers).error);
  for (const state of [
    single,
    married,
    family,
    fixture(place("US", "CA"), { caBond: "Sign the box to waive bond" }),
  ])
    assert.deepEqual(validateState(state, true), state);
});

test("Canadian handwriting choices follow the local sources and Pennsylvania distinguishes execution from probate", () => {
  const withHand = [];
  for (const region of Object.keys(regions.CA)) {
    const p = profile(place("CA", region));
    if (p.handOption) {
      withHand.push(region);
      const state = fixture(place("CA", region), { execution: copyByHand });
      assert.equal(executionProfile(p, state.answers).route, "handwriting");
      assert.equal(executionProfile(p, state.answers).rule, p.handRule);
      assert.ok(p.handRule);
      assert.deepEqual(validateState(state, true), state);
    } else {
      assert.ok(!questions(p, {}).some((q) => q.id === "execution"));
    }
  }
  const qc = profile(place("CA", "QC"));
  assert.match(qc.legalSource, /will-witnesses$/);
  assert.match(
    executionProfile(qc, { execution: copyByHand }).legalSource,
    /holograph-will$/,
  );
  assert.equal(withHand.length, 11);
  assert.ok(!withHand.includes("BC") && !withHand.includes("PE"));
  const steps = signing(profile(place("US", "PA"))).join(" ");
  assert.match(steps, /Execution witnesses are not required/);
  assert.match(steps, /probate/);
});

test("old affirmative answers need explicit current eligibility consent while preserving the original facts", () => {
  for (const where of [
    place("GB", "ENG"),
    place("GB", "WLS"),
    place("NZ"),
    place("CA", "ON"),
  ]) {
    const old = withoutNewChecks(fixture(
      where,
      where.country === "CA" ? { household: "Partner, then children" } : {},
    ));
    old.version = 1;
    delete old.answers.extra;
    if (where.country === "NZ") delete old.answers.localLaw;
    if (where.country === "CA") {
      delete old.answers.execution;
      delete old.answers.partnerOutright;
    }
    const reopened = validateState(old);
    assert.deepEqual(reopened, old);
    assert.throws(() => validateState(old, true));
    const p = { ...profile(where), legacy: true };
    const next = questions(p, old.answers);
    const confirmation = next.find((q) => q.id === "legacyConsent");
    assert.match(confirmation.prompt, /making this will for yourself/);
    if (where.country === "GB") assert.match(confirmation.prompt,/descendants of any generation/);
    if (where.country === "CA")
      assert.match(confirmation.prompt, /residue, they own it outright/);
    assert.equal(readAnswer(confirmation, "No or unsure").stop, true);
    for (const q of next)
      if (!Object.hasOwn(old.answers, q.id)) old.answers[q.id] = q.values[0];
    assert.deepEqual(validateState(old, true), old);
  }
});
