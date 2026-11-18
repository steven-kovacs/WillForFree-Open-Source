import test from "node:test";
import assert from "node:assert/strict";
import { after, sections } from "../public/document.js";
import { interviewCards } from "../public/interview-copy.js";
import { profile } from "../public/markets.js";
import { usWillGuidance } from "../public/us-sources.js";
import { questions, validateState } from "../public/will.js";
import { fixture } from "./fixtures.mjs";

const home = region => ({country: "US", region});

test("guides distinguish revocation from a later spouse or child's share", () => {
  const outcomes = {
    DC: [/birth of a child of that marriage/i, /revoked/i],
    GA: [/within ten months/i, /other gifts can be reduced/i],
    KS: [/both marry and have a child by birth or adoption/i, /revokes the will/i],
    MD: [/then have, adopt or legally legitimate/i, /child or a descendant of that child survives/i],
    MI: [/intestate-based share/i, /substitute transfer/i],
    NV: [/marriage contract/i, /child born after signing/i, /executor nomination/i],
    NH: [/leaves this will in effect, even if you later have or adopt a child/i, /executor you named still has first priority/i,
      /they would inherit if you died without a will/i, /that amount can be zero/i, /share comes first from the residue, then proportionately/i,
      /omitted the child intentionally/i, /other parent, who survives you and is entitled to take it/i,
      /separately elect one-third of the real estate and one-third of the personal property/i, /under the will and any homestead right/i],
    OR: [/a spouse survives/i, /written premarital contract/i],
    RI: [/marriage revokes an earlier will/i, /contemplation of that marriage/i],
    TN: [/both a marriage after signing and the birth/i, /does not revive/i],
    VA: [/premarital or marital agreement/i, /share they would inherit without a will/i],
    WA: [/registered domestic partnership/i, /nominal gift/i, /smaller share, including zero/i],
  };
  for (const [region, rules] of Object.entries(outcomes)) {
    const state = fixture(home(region), {maker: "Una Fern", recipient: "Lee Sylvan", backup: "Bo Moss"});
    const p = profile(state.place);
    const guide = after(p, state.answers).join(" ");
    for (const rule of rules) assert.match(guide, rule, region);
    const instrument = sections(p, state.answers).flat().join(" ");
    for (const name of ["Una Fern", "Lee Sylvan", "Bo Moss"]) assert.ok(instrument.includes(name));
    assert.doesNotMatch(instrument, /future marriage|future child|made in contemplation/i);
  }
});

test("the published route includes each verified premarital-spouse rule and an official or judicial source", () => {
  for (const [key, rule] of Object.entries(usWillGuidance)) {
    if (!rule.familyChange) continue;
    const p = profile(home(key.slice(3)));
    assert.ok(after(p, {}).includes(rule.familyChange), key);
    assert.ok(rule.sources.some(link => link.startsWith("https://")), key);
  }
  const checks = {
    AZ: /children from before the marriage/i, CA: /one half of that separate estate/i,
    DE: /real and personal property/i, FL: /postmarital agreement/i, HI: /reciprocal beneficiary/i,
    MN: /other written|shown in writing/i, MS: /without filing a formal renunciation/i,
    NE: /waived it/i, NJ: /domestic partnership/i, PA: /greater gift applies/i,
    SC: /file in court and serve/i, SD: /count toward the share/i, WI: /probate estate/i,
  };
  for (const [region, detail] of Object.entries(checks)) {
    assert.match(after(profile(home(region)), {}).join(" "), detail, region);
  }
});

test("Illinois and Maryland executor qualifications require a fresh answer from earlier users", () => {
  for (const [region, parts] of [
    ["IL", [/conviction/i, /express acknowledgment in the will/i, /live in the United States/i]],
    ["MD", [/permanent resident/i, /friend who has a green card/i, /out-of-state nominee/i]],
  ]) {
    const state = fixture(home(region), {executor: "Uma Birch", alternate: "Len Moor"});
    const p = profile(state.place);
    const q = questions(p, state.answers).find(q => q.id === "usExecutorQualification");
    assert.ok(q);
    const shown = interviewCards(q, p, state.answers).flatMap(card => card.lines).join(" ");
    for (const term of parts) assert.match(shown, term, region);
    const older = structuredClone(state);
    delete older.answers.usExecutorQualification;
    assert.deepEqual(validateState(older, false, true).answers, older.answers);
    assert.throws(() => validateState(older, true), /remaining questions/i);
    assert.doesNotThrow(() => validateState(state, true));
  }
});

test("Ohio's fixed form explains the loss of a beneficiary's gift if the will is withheld", () => {
  const p = profile(home("OH"));
  assert.equal(p.route, "fixed");
  assert.equal(questions(p, {}).some(q => q.id === "usExecutorQualification"), false);
  const guide = after(p).join(" ");
  for (const detail of [/one year after your death/i, /without reasonable cause/i, /intestacy/i, /as if they had died before you/i]) {
    assert.match(guide, detail);
  }
});
