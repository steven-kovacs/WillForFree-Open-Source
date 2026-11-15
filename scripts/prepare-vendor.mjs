import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
const root=new URL("../",import.meta.url);
const libs=[
 ["pdf-lib/dist/pdf-lib.min.js","pdf-lib.min.js","0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f"],
 ["@pdf-lib/fontkit/dist/fontkit.umd.min.js","fontkit-1.1.1.min.js","d8df561b9fba98e24f2e5130e40948809281bbbc55a20c412359f1a0a5eb35a6"],
 ["fflate/umd/index.js","fflate-0.8.3.min.js","462ef8041fc970e3615a20a9dd2b2e3047a073b2da729ef4f02b634bba8b7b83"]
];
await mkdir(new URL("public/vendor/",root),{recursive:true});
for(const [src,dest,sha] of libs) {
  const bytes=await readFile(new URL("node_modules/"+src,root));
  if(createHash("sha256").update(bytes).digest("hex")!==sha) throw Error("Unexpected upstream distribution: "+src);
  await writeFile(new URL("public/vendor/"+dest,root),bytes);
}
console.log("Verified and staged three browser libraries.");
