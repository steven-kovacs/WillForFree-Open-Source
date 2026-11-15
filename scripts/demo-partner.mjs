import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { areaName } from "../lib/partners/campaigns.mjs";
import { getFirestore } from "firebase-admin/firestore";

// These credentials belong exclusively to the local Firebase Auth emulator.
const uid = "willforfree-demo-partner";
const email = "partner@example.test";
const password = "PreviewPartner42!";
const organization = "Willow Creek Credit Union (demo)";
const partner = "willow-creek-demo";

function campaign(id, title, area, startOffset, endOffset, downloads) {
  const today = Date.now();
  const dateIn = days => new Date(today + days * 86_400_000).toISOString().slice(0, 10);
  return {
    id, partner, name: organization, title, kind: "paid", areas: [area], downloads, maxDownloads:500,
    start: dateIn(startOffset), end: dateIn(endOffset),
    message: "Explore a planning session with our member services team.",
    url: "https://example.org/"
  };
}

export async function seedDemoPartner(projectId) {
  if (projectId !== "demo-willforfree" || process.env.GCLOUD_PROJECT !== projectId ||
      ![process.env.FIREBASE_AUTH_EMULATOR_HOST, process.env.FIRESTORE_EMULATOR_HOST].every(host=>/^127\.0\.0\.1:\d+$/.test(host || ""))) {
    throw Error("The demo account requires the WillForFree loopback emulators.");
  }
  const campaigns = [
    campaign("demo-ontario", "Ontario member planning sessions", "CA-ON", -12, 15, 92),
    campaign("demo-canada", "Member newsletter", "CA", -55, -25, 36),
    campaign("demo-bc", "British Columbia member workshops", "CA-BC", 8, 38, 0)
  ];
  const app = initializeApp({ projectId }, "development-seed");
  try {
    const auth = getAuth(app);
    try {
      await auth.createUser({ uid, email, password, displayName: organization });
    } catch (error) {
      if (error.code !== "auth/uid-already-exists" && error.code !== "auth/email-already-exists") throw error;
      const existing = await auth.getUser(uid);
      if (existing.email !== email) throw Error("The demo UID belongs to another local account.");
      await auth.updateUser(uid, { password, disabled: false });
    }
    const db = getFirestore(app);

    // The examples live only in the dashboard. No counting window or consumer offer is created.
    await db.runTransaction(async tx => {
      const refs = campaigns.map(c => db.doc("partnerTotals/"+c.id));
      const existing = await tx.getAll(...refs);
      tx.set(db.doc("partnerMembers/"+uid), {partner,name:organization,active:true,validAfter:0});
      tx.set(db.doc("partnerReports/"+partner), {campaigns:campaigns.map(c=>({
        id:c.id,title:c.title,start:c.start,end:c.end,areas:c.areas.map(areaName)
      })).sort((a,b)=>b.start.localeCompare(a.start))});
      campaigns.forEach((c,i)=>{
        tx.set(refs[i],{partner,downloads:existing[i].exists ? existing[i].get("downloads") ?? c.downloads : c.downloads});
        tx.delete(db.doc("partnerWindows/"+c.id));
      });
    });
  } finally {
    await deleteApp(app);
  }
  return { campaigns, email, password };
}
