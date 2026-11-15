import { readFile, writeFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { offerCatalog, operatorProject, provision, pruneReceipts } from "../lib/partners/registry.mjs";
const [action, argument, ...extra] = process.argv.slice(2);
const config = new URL("../config/partner-campaigns.json",import.meta.url);
const catalog = new URL("../public/sponsor-offers.json",import.meta.url);
if (action === "check" && !argument) {
  const expected = offerCatalog(JSON.parse(await readFile(config,"utf8")));
  const actual = JSON.parse(await readFile(catalog,"utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw Error("The public catalog does not match the campaign configuration.");
  console.log("Public sponsor catalog verified ("+expected.length+" campaigns).");
} else if (action === "apply" && !argument) {
  const entries = await provision(config);
  await writeFile(catalog,JSON.stringify(entries,null,2)+"\n");
  console.log("Campaigns prepared. The browser catalog and runtime are published separately.");
} else if (action === "prune" && argument && !extra.length) {
  const app = initializeApp({projectId:await operatorProject()});
  try {console.log("Expired campaign receipts removed:",await pruneReceipts(getFirestore(app),argument));}
  finally {await deleteApp(app);}
} else throw Error("Use check, apply, or prune CAMPAIGN_ID.");
