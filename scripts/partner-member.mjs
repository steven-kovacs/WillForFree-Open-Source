import { initializeApp, applicationDefault } from "firebase-admin/app";
import { operatorProject } from "../lib/partners/registry.mjs";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { validId } from "../lib/partners/campaigns.mjs";

// Provision an existing Firebase UID. Never take a password, send an invitation or create a customer on startup.
const [action,uid,partner,name,...extra] = process.argv.slice(2);
const projectId = await operatorProject();
if (!projectId || !uid || /[\/\u0000-\u001f]/u.test(uid) || uid.length>128 || extra.length ||
    !((action==="grant" && validId(partner) && name?.trim() && name.length <= 80) || (action==="revoke" && !partner && !name)))
  throw Error("Set WFF_PARTNER_PROJECT, then run partner-member.mjs grant UID partner-id 'Organization' or revoke UID.");
const emulated = projectId.startsWith("demo-");
const app=initializeApp({projectId,...(emulated?{}:{credential:applicationDefault()})});
const member=getFirestore(app,process.env.WFF_PARTNER_DATABASE || "(default)").collection("partnerMembers").doc(uid);
if(action==="grant") {
  await getAuth(app).getUser(uid);
  await member.firestore.runTransaction(async tx => {
    const report = member.firestore.doc("partnerReports/"+partner);
    const [prior, existingReport] = await tx.getAll(member,report);
    if (!existingReport.exists) tx.create(report,{campaigns:[]});
    const validAfter = prior.exists && prior.get("active") && prior.get("partner") === partner
      ? prior.get("validAfter") || 0 : Math.floor(Date.now()/1000) + 1;
    tx.set(member,{partner,name:name.trim(),active:true,validAfter});
  });
} else {
  await member.delete();
}
console.log("Partner membership updated in "+projectId+".");
