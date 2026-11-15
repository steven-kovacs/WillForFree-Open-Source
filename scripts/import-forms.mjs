import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
const dir=process.argv[2];
if(!dir) throw Error("Pass the directory containing the authorized publisher PDFs named in docs/forms.md.");
const root=new URL("../",import.meta.url);
const index=JSON.parse(await readFile(new URL("config/official-forms.json",root),"utf8"));
const valid=[];
for (const {name,sha256} of index) {
  let bytes;
  try {bytes=await readFile(path.join(dir,name+".pdf"));} catch(e) {if(e.code==="ENOENT")continue;throw e;}
  if (createHash("sha256").update(bytes).digest("hex")!==sha256) throw Error("Publisher file did not match: "+name);
  valid.push([name,bytes]);
}
if(!valid.length)throw Error("No recognized PDFs found.");
await mkdir(new URL("public/forms/",root),{recursive:true});
for(const [name,bytes] of valid) await writeFile(new URL("public/forms/"+name+".pdf",root),bytes);
console.log("Installed "+valid.length+" verified publisher files.");
