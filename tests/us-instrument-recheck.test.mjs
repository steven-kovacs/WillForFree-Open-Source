import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {fixture} from "./fixtures.mjs";
import {interviewCards} from "../public/interview-copy.js";
import {wishesProfile} from "../public/extras.js";
import {languages} from "../public/locale.js";
import {profile, regions} from "../public/markets.js";
import {skipped} from "../public/planning.js";
import {californiaCustodianScope, californiaDescendantShares, californiaGuardianScope, custodySources} from "../public/procedures.js";
import {texasChildlessSpouseGift} from "../public/survival.js";
import {questions, readAnswer, validateState} from "../public/will.js";
import {after, estateNotice, sections, signing} from "../public/document.js";

test("the holder of the original gets the local delivery trigger, recipient and exceptions in every guide language", async () => {
  const uponRequest = /if an interested person requests the will.*someone who can submit it for probate.*knows of no such person.*appropriate court/;
  const rules = {
    AL: uponRequest, HI: uponRequest, NE: uponRequest, ND: uponRequest,
    GA: /original will must promptly file it.*probate court.*even if no one plans to start probate/,
    IN: /may deliver it to the court.*must do so if your personal representative demands it in writing or the court orders it/,
    LA: /appears to be your will.*petition.*filed in your succession proceeding.*think it is invalid/,
    NM: /As soon as.*learns of your death.*submit it for probate.*know of no such person.*appropriate court/,
    OK: /Within 30 days of learning of your death.*district court.*or to the executor named in the will/,
    TN: /holds or finds.*original to your named personal representative.*learn of your death.*photocopy to the clerk.*county where you lived.*original to that clerk.*address is unknown.*no representative is named.*has died, is ineligible or declines.*no estate to administer/,
  };
  const notices = new Set();
  for (const [region, rule] of Object.entries(rules)) {
    const place = {country: "US", region};
    const p = profile(place);
    const notice = estateNotice(p);
    notices.add(notice);
    assert.match(notice, rule, region);
    assert.ok(after(p).includes(notice), region + " signing guide");
    assert.ok(!sections(p, fixture(place).answers).some(([, clause]) => clause.includes(notice)), region + " will");
    assert.match(custodySources[p.key], /^https:\/\//, region + " source");
  }
  for (const language of Object.keys(languages).filter(code => code !== "en")) {
    const catalog = JSON.parse(await readFile(new URL("../public/locales/" + language + ".json", import.meta.url), "utf8"));
    for (const notice of notices) {
      assert.ok(catalog[notice] && catalog[notice] !== notice, language + " delivery instruction");
    }
  }
});

function declineAndContinue(state, id) {
  const p = profile(state.place);
  const q = questions(p, state.answers).find(q => q.id === id);
  assert.ok(readAnswer(q, "No or unsure", state.answers).stop);
  const answers = {...state.answers, [id]: skipped};
  const issues = {[id]: [0, "No or unsure"]};
  assert.equal(wishesProfile(p, answers, issues).route, "planning");
  validateState({...state, answers, issues}, true);
}

test("the primary and backup of an authored U.S. will both need to be adults", () => {
  for (const region of Object.keys(regions.US)) {
    const place = {country: "US", region};
    const state = fixture(place);
    const p = profile(place);
    const list = questions(p, state.answers);
    if (["fixed", "official"].includes(p.route)) {
      assert.ok(!list.some(q => q.id === "adultResidueRecipients"));
      continue;
    }
    const first = list.find(q => q.id === "recipient");
    const backup = list.find(q => q.id === "backup");
    const age = list.find(q => q.id === "adultResidueRecipients");
    assert.match(interviewCards(first, p, state.answers)[0].title, /which adult/i);
    assert.match(interviewCards(backup, p, state.answers)[0].lines.join(" "), /different adult/i);
    assert.match(interviewCards(age, p, state.answers)[0].title, /two adults/i);
    const old = {...state, answers: {...state.answers}};
    delete old.answers.adultResidueRecipients;
    assert.throws(() => validateState(old, true), undefined, region);
    declineAndContinue(state, age.id);
  }
  const family = fixture({country: "CA", region: "ON"}, {household: "Children first"});
  assert.ok(!("adultResidueRecipients" in family.answers));
  const slovak = fixture({country: "SK", region: ""});
  assert.ok("slovakHeir" in slovak.answers);
  assert.ok(!("adultResidueRecipients" in slovak.answers));
});

test("California confirms family shares and the guardian's condition only when the maker selects them", () => {
  const place = {country:"US",region:"CA"}, p = profile(place);
  for (const choice of ["1 · Registered spouse or partner, then descendants","2 · Descendants only",
    "3 · One named person","4 · Two to four named people"]) {
    for (const guardian of ["Lena Dell","Leave open"]) {
      const state = fixture(place,{caBalance:choice,familyGuardian:guardian});
      const cards = questions(p,state.answers);
      const guardianName = cards.find(q=>q.id==="familyGuardian");
      assert.ok(interviewCards(guardianName,p,state.answers)[0].lines.includes(californiaGuardianScope));
      assert.equal("caDescendantShares" in state.answers, /^[12]/.test(choice));
      assert.equal("caGuardianScope" in state.answers, guardian!=="Leave open");
      for (const [id,description] of [["caGuardianScope",californiaGuardianScope],["caDescendantShares",californiaDescendantShares]]) {
        if (!(id in state.answers)) continue;
        const q=cards.find(q=>q.id===id);
        assert.ok(interviewCards(q,p,state.answers)[0].lines.includes(description));
        declineAndContinue(state,id);
      }
    }
  }
});

test("Texas's childless married form explains when the people in section 2.3 can inherit", () => {
  const place = {country:"US",region:"TX"};
  const p = profile(place);
  const childless = {descendants:"No children or grandchildren",txAlternates:"Fay Dow, Bryn Ashe"};
  const state = fixture(place,{...childless,marriage:"Married, spouse living"});
  const q = questions(p,state.answers).find(q=>q.id==="courtOutright");
  assert.ok(interviewCards(q,p,state.answers)[0].lines.includes(texasChildlessSpouseGift));
  declineAndContinue(state,"courtOutright");
  const single = fixture(place,{...childless,marriage:"Single, widowed or divorced"});
  assert.ok(!("courtOutright" in single.answers));
});

test("California applies the same custody age to every qualifying beneficiary", () => {
  const place={country:"US",region:"CA"}, p=profile(place);
  const state=fixture(place,{caBalance:"4 · Two to four named people",custodian:"Sage Tor",custodyAge:"25"});
  const cards=questions(p,state.answers);
  for(const id of ["custodian","custodyAge","caCustodyScope"]) {
    const q=cards.find(q=>q.id===id);
    assert.ok(interviewCards(q,p,state.answers)[0].lines.includes(californiaCustodianScope));
  }
  declineAndContinue(state,"caCustodyScope");
  const blank=fixture(place,{custodian:"Leave open"});
  assert.ok(!("caCustodyScope" in blank.answers));
});

test("Alaska, Arkansas and Tennessee give only a validly refused share to the next taker", () => {
  for (const region of ["AK", "AR", "TN"]) {
    const place = {country:"US", region}, p = profile(place);
    const facts = {recipient:"Avis Roan", backup:"Milo Finch", executor:"Avis Roan",
      extra:"Give a fixed sum of money", extraRecipient:"Avis Roan", extraAmount:"1200"};
    const state = fixture(place, facts);
    const qs = questions(p, state.answers);
    const will = sections(p, state.answers);
    const residue = qs.find(q => q.id === "residueRefusal");
    const separate = qs.find(q => q.id === "separateGiftRefusal");
    for (const q of [residue, separate]) {
      assert.ok(interviewCards(q, p, state.answers)[0].lines.includes(q.prompt));
      assert.ok(will.some(([, clause]) => clause === q.prompt));
      const earlier = structuredClone(state);
      delete earlier.answers[q.id];
      assert.deepEqual(validateState(earlier, false, true).answers, earlier.answers);
      assert.throws(() => validateState(earlier, true), /remaining questions/);
      declineAndContinue(state, q.id);
    }
    assert.match(residue.prompt, /only the refused share to my named backup.*survives me by at least 30 days/);
    assert.match(residue.prompt, /backup fails the 30-day condition or validly refuses part or all.*passes by intestacy/);
    assert.match(residue.prompt, /dies before receiving a share already due to them, their estate takes the share they had not yet received/);
    assert.match(residue.prompt, /inherit independently under this will or by intestacy/);
    assert.match(separate.prompt, /all or part.*only the refused part.*keep the rest/);
    assert.match(separate.prompt, /No relative takes the refused part/);
    assert.match(separate.prompt, /does not by itself refuse another gift or an appointment/);
    assert.ok(will.some(([label,clause]) => label === "Administration" && clause.includes("Avis Roan")));
    assert.ok(will.some(([label,clause]) => label === "Separate gift 1" && /1200 to Avis Roan/.test(clause)));
    assert.ok(will.some(([label,clause]) => label === "Who inherits" && /Avis Roan.*Milo Finch/.test(clause)));
    const bare = fixture(place);
    assert.ok("residueRefusal" in bare.answers);
    assert.ok(!("separateGiftRefusal" in bare.answers));
  }
});

test("the three signing guides state local witness qualifications and Alaska identifies property outside the will", () => {
  const alaska = profile({country:"US", region:"AK"});
  const arkansas = profile({country:"US", region:"AR"});
  const tennessee = profile({country:"US", region:"TN"});
  assert.match(signing(alaska).join(" "), /generally competent to testify.*can still inherit/);
  assert.match(signing(arkansas).join(" "), /at least 18.*two other qualified, disinterested witnesses/);
  assert.match(signing(tennessee).join(" "), /competent to testify.*two other disinterested witnesses/);
  assert.match(after(alaska).join(" "), /Alaska vehicle or boat.*does not change that designation/);
  const {answers} = fixture({country:"US",region:"AK"}, {orgGift1:"Give money", orgName1:"Cedar Vale Museum", orgAmount1:"307"});
  const terms = questions(alaska,answers).find(q => q.id === "orgTerms1");
  const direction = sections(alaska,answers).find(([,body]) => body.includes("the organization cannot receive or validly refuses"));
  assert.ok(direction && terms.lines.includes(direction[1]));
  assert.match(direction[1], /keeps any part it accepts/);
});

test("Alaska stock and Hawaii registered relationships and homestead leases reach the interview and guide", () => {
  for (const [region, checks] of [
    ["AK", [["alaskaNativeStock", /stock certificate or separate stock will/i]]],
    ["HI", [["hawaiiReciprocalBeneficiary", /two relatives, such as siblings/i], ["hawaiianHomeLands", /homestead lease/i]]],
  ]) {
    const place = {country:"US",region}, p = profile(place), state = fixture(place);
    for (const [id, text] of checks) {
      const question = questions(p,state.answers).find(q => q.id === id);
      assert.match(interviewCards(question,p,state.answers)[0].title, text);
      const old = {...state, answers:{...state.answers}};
      delete old.answers[id];
      assert.throws(() => validateState(old,true), /remaining questions/);
      declineAndContinue(state,id);
    }
    const guide = after(p).join(" ");
    if (region === "AK") {
      assert.match(guide,/outside probate.*effective stock certificate designation.*without an effective stock designation.*will or intestacy/i);
    } else {
      assert.match(guide,/registered reciprocal beneficiary.*may elect/i);
      assert.match(guide,/eligible successor.*approval before your death/i);
    }
  }
});

test("the two unmarried Texas court forms require resolution of informal marital status", () => {
  const place = {country:"US",region:"TX"}, p = profile(place);
  for (const descendants of ["I have children or grandchildren","No children or grandchildren"]) {
    const state = fixture(place,{marriage:"Single, widowed or divorced",descendants});
    const list = questions(p,state.answers);
    const picker = list.find(q => q.id === "marriage");
    assert.match(interviewCards(picker,p,state.answers)[0].lines.join(" "),/agree to be married.*live together in Texas.*represent to others in Texas/i);
    assert.match(list.find(q => q.id === "texasUnmarried").prompt,/section 1.3.*informal marriage/);
    assert.match(signing(p).join(" "),/Living apart does not itself end a marriage/);
    declineAndContinue(state,"texasUnmarried");
  }
  assert.ok(!("texasUnmarried" in fixture(place,{marriage:"Married, spouse living"}).answers));
});
