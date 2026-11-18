import test from "node:test";
import assert from "node:assert/strict";
import {after, sections, signing} from "../public/document.js";
import {interviewCards} from "../public/interview-copy.js";
import {copyByHand, executionProfile, profile, regions} from "../public/markets.js";
import {ownEstateClause} from "../public/procedures.js";
import {questions, readAnswer, validateState} from "../public/will.js";
import {fixture} from "./fixtures.mjs";

const home = (country, region = "") => ({country, region});

test("every Texas family form explains late probate without promising executor authority", () => {
  const place = home("US", "TX"), p = profile(place);
  for (const marriage of ["Married, spouse living", "Single, widowed or divorced"])
    for (const descendants of ["I have children or grandchildren", "No children or grandchildren"]) {
      const {answers} = fixture(place, {marriage, descendants});
      const guide = after(p, answers).join(" ");
      assert.match(guide, /four-year probate deadline after death/);
      assert.match(guide, /256\.003.*applicant proves they were not in default/);
      assert.match(guide, /late application generally cannot obtain letters testamentary/);
      assert.match(guide, /If four years have passed, get Texas probate advice/);
    }
  assert.ok(!after(profile(home("US", "OK"))).join(" ").includes("256.003"));
});

test("Texas replacement instructions protect the signed original even for a first-time maker", () => {
  const place = home("US", "TX"), p = profile(place);
  for (const priorWill of ["No", "Yes"])
    for (const marriage of ["Married, spouse living", "Single, widowed or divorced"])
      for (const descendants of ["I have children or grandchildren", "No children or grandchildren"]) {
        const {answers} = fixture(place, {priorWill, marriage, descendants});
        const guide = after(p, answers).join(" ");
        assert.match(guide, /Keep your current signed original safe until the replacement has been properly executed/);
        assert.match(guide, /destroying your current will before then can leave you without a valid will/);
        assert.match(guide, /replacement made with this court form.*both witnesses and the notary/);
      }
});

test("a general gift of residue excludes appointive assets on paper and in a handwritten family will", () => {
  for (const place of [home("CA","ON"), home("GB","WLS"), home("US","NY"), home("NZ")]) {
    const p = profile(place);
    const state = fixture(place, {priorWill:"Yes", household:"Children first", execution:copyByHand});
    const effective = executionProfile(p, state.answers);
    assert.ok(sections(effective, state.answers).some(([,text]) => text === ownEstateClause));
    assert.match(after(effective, state.answers).join(" "), /Revoking an earlier will can cancel a choice/);
    const question = questions(p,state.answers).find(q=>q.id === "earlierPowerOfAppointment");
    assert.equal(readAnswer(question, "No or unsure").stop, true);
    assert.match(interviewCards(question, p, state.answers)[0].title, /earlier will/);
    delete state.answers.earlierPowerOfAppointment;
    assert.throws(()=>validateState(state,true), /remaining questions/i);
  }
  const place = home("AU","TAS"), p = profile(place), state = fixture(place);
  const question = questions(p,state.answers).find(q=>q.id === "tasmanianPowerOfAppointment");
  assert.match(question.prompt, /no general power/);
  assert.equal(readAnswer(question,"No or unsure").stop, true);
  assert.match(after(p,state.answers).join(" "), /Section 50/);
  assert.ok(!questions(profile(home("AU","VIC")),{}).some(q=>q.id === question.id));
});

test("California, Maine and Texas explain their individual publication’s treatment of property held under a power", () => {
  for (const [region, provision] of [["CA","641"], ["ME","2-608"], ["TX","255.351"]]) {
    const place = home("US",region), base = profile(place);
    const p = region === "ME" ? {...base,route:"statutory"} : base;
    assert.ok(signing(p).some(step=>step.includes(provision) && /trust, will or deed/.test(step)));
    assert.ok(!signing(p).includes(ownEstateClause));
    if (region !== "ME") {
      const state = fixture(place);
      const question = questions(p,state.answers).find(q=>q.id === "courtPowerOfAppointment");
      assert.ok(readAnswer(question,"No or unsure").stop);
    }
  }
});

test("an HDB beneficiary's ability to keep the flat and an Icelandic private administration have their own steps", () => {
  const sg = profile(home("SG")), state = fixture(home("SG"));
  const card = interviewCards(questions(sg,state.answers).find(q=>q.id === "assetCheck"), sg,state.answers)[0];
  assert.match(card.lines.join(" "), /eligibility rules to keep it/);
  assert.match(after(sg).join(" "), /six months of obtaining the grant of probate/);
  assert.match(after(profile(home("IS"))).join(" "), /submit the original to the District Commissioner unless/);
  assert.match(after(profile(home("DK"))).join(" "), /person relying on it must establish valid execution/);
});

test("the matching punctuation in backup names cannot defeat the intended gift or appointment", () => {
  const straight = "Brie O'Connor", curly = "Brie O’Connor";
  const rules = [
    ["backup", {recipient: straight}, curly], ["alternate", {executor: curly}, straight],
    ["coTrustee", {trustee: "Eira Moss-Lee"}, "Eira Moss‐Lee"],
    ["maker", {children: [straight]}, curly], ["petBackup", {petCarer: curly}, straight],
    ["formChildren", {spouse: straight}, curly], ["txOthers", {recipient: curly}, straight],
    ["txAlternates", {spouse: straight}, curly], ["children", {}, straight + ", " + curly],
  ];
  for (const [id, answers, input] of rules) {
    const kind = ["formChildren","txOthers","txAlternates","children"].includes(id) ? "names" : "name";
    assert.ok(readAnswer({id, kind}, input, answers).error, id);
  }
  const place = home("CA","ON"), p = profile(place);
  const state = fixture(place, {recipient: straight, backup: "Renée Moss"});
  assert.ok(sections(p, state.answers).flat().join(" ").includes(straight));
  assert.equal(readAnswer({id: "backup", kind: "name"}, "Renee Moss", {recipient: "Renée Moss"}).value, "Renee Moss");
  state.answers.backup = curly;
  assert.throws(() => validateState(state, true), /check the answers/i);
  const saved = validateState(state, false, true);
  assert.equal(saved.purpose, "planning");
  const entries = saved.record.map(([, value]) => value);
  assert.ok(entries.includes(straight) && entries.includes(curly));
  assert.match(entries.at(-1), /different backup/i);
  assert.doesNotThrow(() => validateState(saved));
});

test("older pet-care wishes preserve their original words when the named backup repeats the first carer", () => {
  const place = home("GB","WLS");
  const pets = {pets: "Yes", petNames: "Fern", petCarer: "Brie O'Connor", petBackup: "Noel Reed"};
  for (const purpose of [undefined, "planning"]) {
    const state = fixture(place, pets, purpose);
    state.answers.petBackup = "Brie O’Connor";
    const migrated = validateState(state, false, true);
    assert.equal(migrated.purpose, "planning");
    assert.equal(migrated.answers.petCarer, pets.petCarer);
    assert.equal(migrated.answers.petBackup, "Leave open");
    assert.ok(migrated.record.some(([, value]) => value === "Brie O’Connor"));
    if (purpose) assert.equal(migrated.answers.wishes, state.answers.wishes);
    assert.deepEqual(validateState(migrated, false, true), migrated);
  }
});

test("each Canadian replacement identifies the benefit designation its authority covers", () => {
  for (const region of Object.keys(regions.CA)) {
    const place = home("CA",region), p = profile(place);
    for (const priorWill of ["Yes","I’m not sure"]) {
      const state = fixture(place, {priorWill});
      const q = questions(p, state.answers).find(q => q.id === "priorDesignation");
      assert.match(q.prompt, ["QC","SK","YT"].includes(region) ? /life insurance/ : /retirement plan/);
      assert.match(q.prompt, /this will makes no new/i);
      assert.ok(readAnswer(q, "No or unsure").stop);
      delete state.answers.priorDesignation;
      assert.deepEqual(validateState(state, false, true).answers, state.answers);
      assert.throws(() => validateState(state, true), /remaining questions/i);
    }
    assert.ok(!questions(p, {priorWill:"No"}).some(q => q.id === "priorDesignation"));
  }
});

test("earlier joint wills and Estonian notarial wills have distinct effects on a replacement", () => {
  for (const country of ["DK","EE","FI","IS","MT","NO","SE"]) {
    const place = home(country), p = profile(place);
    const state = fixture(place, {priorWill:"I’m not sure"});
    const q = questions(p, state.answers).find(q => q.id === "priorJointWill");
    assert.ok(readAnswer(q,"No or unsure").stop, country);
    if (country === "DK") assert.match(q.prompt, /notify the other maker unless special circumstances/);
    if (country === "NO") assert.match(q.prompt, /notice was impossible or unreasonably difficult.*at least as well off/);
    assert.match(sections(p,state.answers)[0][1], /to the extent I am legally free to do so/);
    assert.match(sections(p,fixture(place).answers)[0][1], /revoke every earlier will and codicil/);
    if (country === "EE") {
      assert.match(q.prompt, /notarial will and notice delivered to your spouse/);
      assert.ok(questions(p,state.answers).some(q => q.id === "estonianPriorNotarial"));
      assert.match(after(p,state.answers).join(" "), /still alive.*six months expire.*earlier notarial will becomes valid again/);
    }
  }
});
