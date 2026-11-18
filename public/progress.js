import { sentence, wording } from "./locale.js";
// Progress uses stable milestones: a newly discovered follow-up never makes the bar run backwards.
// In particular, a family or optional note may need more answers than a single-beneficiary kit.
export function interviewProgress(list, active, stage, part=0, parts=1) {
  if (stage === "helper" || stage==="route") return null;
  if (stage === "finished") return { label: "Kit ready", count: "Complete", value: 100 };
  if (stage === "review") return { label: "Review your answers", count: "Step 4 of 4", value: 94 };
  const i = list.findIndex(q => q.id === active);
  const maker = list.findIndex(q => q.id === "maker");
  const extras = list.findIndex(q => q.id === "pets" || q.id === "extra");
  const afterExtras=extras>=0 && i>extras && list[i]?.values?.[0]==="Yes, all apply";
  if(afterExtras) {
    const index=list.slice(extras+1,i).filter(q=>q.values?.[0]==="Yes, all apply").length;
    return {label:"Final checks",count:"Step 4 of 4",value:92+Math.min(1,index/12)};
  }
  const phase = extras >= 0 && i >= extras ? 2 : maker >= 0 && i >= maker ? 1 : 0;
  const labels = ["Getting started", "Your people and choices", "Anything else?"];
  const start = [4, 36, 78][phase], end = [33, 75, 92][phase];
  const n = Math.max(0, i - [0, maker, extras][phase])+(parts>1?part/parts:0);
  return { label: labels[phase], count: sentence("Step {0} of 4", phase + 1), value: Math.round(start + (end-start)*n/(n+3)) };
}
