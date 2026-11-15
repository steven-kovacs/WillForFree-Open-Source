import {applicationDefault, getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {createHelpGuard} from "./help-limits.mjs";
import {firestoreLimitStore} from "./help-firestore.mjs";

const reasons=new Set(["browser_minute","browser_hour","network_minute","network_hour","provider_hour","guard_unavailable"]);

export function cloudAlertWriter(project,tokenProvider,{fetcher=fetch,timeout=5000}={}){
  return async reason=>{
    if(!reasons.has(reason))throw Error("Unknown reason for a help alert.");
    const signal=AbortSignal.timeout(timeout);
    const token=await Promise.race([tokenProvider(),new Promise((_,reject)=>
      signal.addEventListener("abort",()=>reject(signal.reason),{once:true}))]);
    const result=await fetcher("https://logging.googleapis.com/v2/entries:write",{method:"POST",redirect:"error",signal,
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","x-goog-user-project":project},
      body:JSON.stringify({logName:"projects/"+project+"/logs/willforfree-ai-abuse",resource:{type:"global",labels:{project_id:project}},
        entries:[{severity:"WARNING",jsonPayload:{event:"ai_help_limited",reason}}]})});
    if(!result.ok)throw Error("Cloud Logging declined the help limit event.");
  };
}

export function runtimeHelpGuard({report}={}){
  const project=process.env.WFF_HELP_PROJECT;
  if(!project){
    if(process.env.NODE_ENV==="production")throw Error("Configure shared help limits before enabling production AI.");
    return createHelpGuard({report:report || (reason=>console.warn("WillForFree AI limit:",reason))});
  }
  const logProject=process.env.WFF_HELP_LOG_PROJECT || project;
  const database=process.env.WFF_HELP_DATABASE || "(default)";
  if([project,logProject].some(id=>!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(id) || id.startsWith("demo-")) || process.env.FIRESTORE_EMULATOR_HOST)
    throw Error("Use the dedicated help project without an emulator for shared production limits.");
  const key=process.env.WFF_HELP_SIGNING_SECRET;
  if(!key || Buffer.byteLength(key)<32)throw Error("Configure one shared random signing secret for all AI helper instances.");
  const credential=applicationDefault();
  const app=getApps().find(a=>a.name==="wff-help") ||
    initializeApp({projectId:project,credential},"wff-help");
  return createHelpGuard({key,store:firestoreLimitStore(getFirestore(app,database)),report:cloudAlertWriter(logProject,async()=>(await credential.getAccessToken()).access_token)});
}
