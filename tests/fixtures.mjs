import { profile } from "../public/markets.js";
import { questions, readAnswer } from "../public/will.js";
export const choiceValues = {
  maker: "Renée Morgan",
  wishes: "I want to discuss my beneficiaries and the family home.",
  txAlternates: "Robin Taylor, Morgan Chen",
  txOthers: "Luca Smith, Alex Lee",
  town: "Ottawa",
  executor: "Jordan Lee",
  alternate: "Robin Taylor",
  recipient: "Élodie Rivera",
  backup: "Morgan Chen",
  partner: "Alex Morgan",
  spouse: "Alex Morgan",
  children: "Avery Morgan, Quinn Morgan",
  care: "River Lin",
  trustee: "Robin Taylor",
  coTrustee: "Drew Patel",
  multiple: "Élodie Rivera, Morgan Chen",
  formChildren: "Avery Morgan, Quinn Morgan",
  familyGuardian: "River Lin",
  custodian: "Jordan Lee",
  oneAdult: "Élodie Rivera",
};
export function fixture(place, overrides = {}) {
  const p = profile(place),
    answers = {};
  for (let i = 0; i < 64 + Object.keys(overrides).length * 7; i++) {
    const q = questions(p, answers).find((k) => !(k.id in answers));
    if (!q) break;
    const input = overrides[q.id] ?? choiceValues[q.id] ?? q.values[0];
    const res = readAnswer(q, input, answers);
    if (!res.value) throw Error(q.id + " " + JSON.stringify(res));
    answers[q.id] = res.value;
  }
  return { version: 2, place, answers };
}
