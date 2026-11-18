import { currentLanguage, sentence, translatedList, wording } from "../locale.js";
import { partnerConfig, readReport } from "../partner-api.js";

const $ = id=>document.getElementById(id);
let config, identity, timer, epoch = 0;
const signIn = $("sign-in");
const fmt = {format(value){return new Intl.NumberFormat(currentLanguage()).format(value);}};
let lastReport;
document.addEventListener("wff:language",()=>{if(identity && lastReport)showReport(lastReport);});
function signedOut(message="") {
  epoch++; clearTimeout(timer); identity = null; lastReport=null; $("password").value = "";
  $("dashboard").hidden=true; $("entry").hidden=false; $("login-status").textContent=message;
  $("organization").textContent=""; $("total").textContent="0"; $("campaign-list").replaceChildren();
  $("report-date").textContent=""; $("report-status").textContent="";
}
function node(tag,text) {const element=document.createElement(tag);element.textContent=text;return element;}
function showReport(report) {
  lastReport=report;
  $("entry").hidden=true; $("dashboard").hidden=false;
  $("organization").textContent=report.name; $("report-date").textContent=sentence("Updated {0}", new Date(report.asOf).toLocaleString(currentLanguage()));
  $("total").textContent=fmt.format(report.campaigns.reduce((sum,c)=>sum+c.downloads,0));
  $("empty").hidden=report.campaigns.length>0;
  $("campaign-list").replaceChildren(...report.campaigns.map(c=>{
    const card=node("article",""), detail=node("div",""); card.className="campaign";
    const name=node("h2",c.title);name.dataset.verbatim="";
    detail.append(name,node("p",translatedList(c.areas," · ")),node("p",sentence("{0} to {1} UTC · {2}", c.start, c.end, wording(c.status))));
    card.append(detail,node("strong",sentence(c.downloads===1?"{0} download":"{0} downloads",fmt.format(c.downloads))));return card;
  }));
}
async function auth(action,body) {
  const emulator = config.authEmulator;
  const useLocal = ["localhost","127.0.0.1","[::1]"].includes(location.hostname) && /^127\.0\.0\.1:\d+$/.test(emulator || "");
  const base = useLocal ? "http://"+emulator+"/identitytoolkit.googleapis.com" : "https://identitytoolkit.googleapis.com";
  const res = await fetch(base+"/v1/accounts:"+action+"?key="+encodeURIComponent(config.apiKey),{
    method:"POST",credentials:"omit",referrerPolicy:"no-referrer",redirect:"error",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
  if (!res.ok) throw Error("Sign-in failed.");return res.json();
}
async function refresh() {
  const version = epoch;
  if (!identity || Date.now()>=identity.expires) { signedOut("Your session has ended. Please sign in again."); return; }
  const report = await readReport(config,identity);
  if (version === epoch) showReport(report);
}
async function login() {
  $("login-status").textContent="Signing in…";$("enter").disabled=true;
  try {
    const user = await auth("signInWithPassword",{email:$("email").value.trim(),password:$("password").value,returnSecureToken:true});
    $("password").value="";identity={uid:user.localId,token:user.idToken,expires:Date.now()+Number(user.expiresIn)*1000};
    timer=setTimeout(()=>signedOut("Your session has ended. Please sign in again."),Math.max(0,identity.expires-Date.now()));
    await refresh();if (identity) $("report-heading").focus();
  } catch(error) {signedOut(error.status===403?error.message:"Couldn’t sign in. Check your email and password, then try again.");}
  finally {$("enter").disabled=false;}
}
signIn.addEventListener("submit",e=>{e.preventDefault(); void login();});
$("refresh").addEventListener("click",async()=>{
  const version=epoch;
  $("refresh").disabled=true;$("report-status").textContent="Refreshing…";
  try {await refresh();if(version===epoch)$("report-status").textContent="Totals updated.";}
  catch(e){if(version===epoch){if([401,403].includes(e.status)) signedOut(e.message); else $("report-status").textContent="Couldn’t refresh. Try again.";}}
  finally {$("refresh").disabled=false;}
});
$("logout").addEventListener("click",()=>{signedOut("You’re signed out.");$("portal-title").focus({preventScroll:true});});
$("reset-password").addEventListener("click",async()=>{
  if (!$("email").value || !$("email").reportValidity()) {$("email").focus();return;}
  $("reset-password").disabled=true;
  try {await auth("sendOobCode",{requestType:"PASSWORD_RESET",email:$("email").value.trim()});}
  catch { /* Keep account existence private. */ }
  finally {$("login-status").textContent="If that address has an account, check its inbox for reset instructions.";$("reset-password").disabled=false;}
});
window.addEventListener("pagehide",()=>signedOut());
try {
  if (!["localhost","127.0.0.1","[::1]","partners.willforfree.com"].includes(location.hostname)) {
    location.replace("https://partners.willforfree.com/");
    throw Error();
  }
  config=await partnerConfig();
  $("availability").textContent="Use the account supplied with your partnership.";signIn.hidden=false;
} catch {$("availability").textContent="Partner sign-in is closed for now.";}
