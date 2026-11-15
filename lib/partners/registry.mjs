import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { campaignsFrom, areaName, validId } from "./campaigns.mjs";

const projectFile = new URL("../../public/partner-service.json", import.meta.url);
export async function operatorProject(env = process.env) {
  const project = env.WFF_PARTNER_PROJECT;
  if (!project || (env.WFF_PARTNER_DATABASE && env.WFF_PARTNER_DATABASE !== "(default)")) throw Error("Set the reporting project and use its default database.");
  const hosts = [env.FIREBASE_AUTH_EMULATOR_HOST, env.FIRESTORE_EMULATOR_HOST];
  if (project.startsWith("demo-")) {
    if (!hosts.every(host => /^127\.0\.0\.1:\d+$/.test(host || ""))) throw Error("Use both loopback emulators for development.");
  } else {
    const target = JSON.parse(await readFile(projectFile,"utf8")).projectId;
    if (target !== project || hosts.some(Boolean) || [env.GCLOUD_PROJECT,env.GOOGLE_CLOUD_PROJECT].some(hint => hint && hint !== project))
      throw Error("The reporting project must match the site's dedicated Firebase configuration.");
  }
  return project;
}
export function offerCatalog(campaigns) {
  return campaignsFrom(campaigns).map(({id,name,kind,title,message,url,start,end,areas}) => ({id,name,kind,title,message,url,start,end,areas}));
}
export async function saveCampaigns(db, campaigns) {
  campaignsFrom(campaigns);
  const keys = new Set(campaigns.map(c => c.id));
  // Read the installed registry and switch all requested windows in a single transaction.
  await db.runTransaction(async tx => {
    const windows = await tx.get(db.collection("partnerWindows"));
    const removed = windows.docs.filter(doc => doc.get("enabled") && !keys.has(doc.id));
    const organizations = new Set([...campaigns.map(c=>c.partner),...removed.map(doc=>doc.get("partner"))]);
    if (!organizations.size) return;
    const reportRefs = [...organizations].map(org => db.doc("partnerReports/"+org));
    const reports = new Map((await tx.getAll(...reportRefs)).map(doc => [doc.id,
      new Map((doc.exists ? doc.get("campaigns") : []).map(row=>[row.id,row]))]));
    const refs = campaigns.map(c=>db.doc("partnerTotals/"+c.id));
    const totals = refs.length ? await tx.getAll(...refs) : [];
    for (const doc of removed) {
      const rows = reports.get(doc.get("partner"));
      rows.set(doc.id,{...rows.get(doc.id),paused:true});
      tx.update(doc.ref,{enabled:false});
    }
    campaigns.forEach((c,i) => {
      const rows = reports.get(c.partner), old = rows.get(c.id);
      const row = {id:c.id,title:c.title,start:c.start,end:c.end,areas:c.areas.map(areaName)};
      if (totals[i].exists && (!old || totals[i].get("partner") !== c.partner || old.start !== c.start || old.end !== c.end ||
          JSON.stringify(old.areas) !== JSON.stringify(row.areas))) throw Error("Campaign ownership, territory and dates are immutable. Use a new ID.");
      if (!totals[i].exists) {
        tx.create(refs[i],{partner:c.partner,downloads:0});
        tx.create(db.doc("partnerCursors/"+c.id),{receipt:""});
      }
      tx.set(db.doc("partnerWindows/"+c.id),{partner:c.partner, enabled:true, start:Timestamp.fromMillis(Date.parse(c.start)),
        end:Timestamp.fromMillis(Date.parse(c.end)+86400000),maxDownloads:c.maxDownloads});
      rows.set(c.id,row);
    });
    for (const ref of reportRefs) tx.set(ref,{campaigns:[...reports.get(ref.id).values()].sort((a,b)=>b.start.localeCompare(a.start))});
  });
}
export async function localReporting() {
  if (!process.env.WFF_PARTNER_PROJECT) return {};
  if (!process.env.WFF_PARTNER_PROJECT.startsWith("demo-")) throw Error("The local website only connects to Firebase emulators.");
  const projectId = await operatorProject();
  return {config:{projectId, apiKey:"local-emulator", firestoreEmulator:process.env.FIRESTORE_EMULATOR_HOST,
    authEmulator:process.env.FIREBASE_AUTH_EMULATOR_HOST}, offers:[]};
}
export async function provision(file) {
  const projectId = await operatorProject();
  const campaigns = JSON.parse(await readFile(file,"utf8"));
  const catalog = offerCatalog(campaigns);
  const app = initializeApp({projectId},"campaigns-" + randomUUID());
  try {await saveCampaigns(getFirestore(app), campaigns);}
  finally {await deleteApp(app);}
  return catalog;
}
export async function pruneReceipts(db, id, now=Date.now()) {
  if (!validId(id)) throw Error("Invalid campaign ID.");
  const window = await db.doc("partnerWindows/"+id).get();
  if (!window.exists || window.get("end").toMillis()+30*86400000 > now) throw Error("Receipts can be removed 30 days after the campaign ends.");
  const receipts = db.collection("partnerReceipts/"+id+"/entries");
  let count=0;
  while (count < 1000) {
    const page = await receipts.limit(100).get();
    if (page.empty) return count;
    const batch = db.batch(); page.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
    count += page.size;
  }
  return count;
}
