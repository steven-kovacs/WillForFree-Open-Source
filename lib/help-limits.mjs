import {createHmac, randomBytes, timingSafeEqual} from "node:crypto";
import {isIP} from "node:net";

const MINUTE=60_000, HOUR=60*MINUTE, DAY=24*HOUR;
const browserLimits=[{limit:3, period:MINUTE, reason:"browser_minute"},{limit:8, period:HOUR, reason:"browser_hour"}];
const networkLimits=[{limit:18, period:MINUTE, reason:"network_minute"},{limit:40, period:HOUR, reason:"network_hour"}];
const providerLimits=[{limit:24, period:HOUR, reason:"provider_hour"}];
const networkPrefix=address=>{
  if (address?.startsWith("::ffff:") && isIP(address.slice(7))===4) address=address.slice(7);
  if (isIP(address||"")!==6) return isIP(address||"")===4 ? address : "unknown";
  const [left, right=""]=address.split("%")[0].split("::");
  const leading=left?left.split(":"):[], trailing=right?right.split(":"):[];
  const groups=[...leading,...Array(Math.max(0,8-leading.length-trailing.length)).fill("0"),...trailing];
  return groups.slice(0,4).map(h=>Number.parseInt(h,16).toString(16)).join(":");
};

export function cookieIdentity(header,key,now,secure=false,hostingCookie=false){
  const cookieName=hostingCookie ? "__session" : "wff_help";
  const cookie=header?.split(";").map(part=>part.trim()).find(part=>part.startsWith(cookieName+"="))?.slice(cookieName.length+1);
  const sign=s=>createHmac("sha256",key).update("cookie:"+s).digest("base64url");
  if(cookie && cookie.length<=128){
    const [id,expires,signature,...extra]=cookie.split(".");
    if(!extra.length && /^[a-zA-Z0-9_-]{22}$/.test(id) && /^\d{10,13}$/.test(expires) &&
       +expires>now && +expires<=now+DAY && /^[a-zA-Z0-9_-]{43}$/.test(signature||"") &&
       timingSafeEqual(Buffer.from(sign(id+"."+expires)),Buffer.from(signature))) return {id};
  }
  const id=randomBytes(16).toString("base64url"), payload=id+"."+(now+DAY);
  return {id,cookie:cookieName+"="+payload+"."+sign(payload)+"; Path=/api/topic; Max-Age=86400; HttpOnly; SameSite=Strict"+(secure?"; Secure":"")};
}

// A store runs the decision atomically across all of its keys. Refused requests do not extend a window.
function reserve(store,entries,now){
  return store.change(entries.map(e=>e.key),state=>{
    const active=entries.map(({key})=>(state.get(key)?.times||[]).filter(t=>t>now-HOUR).sort((a,b)=>a-b));
    let denied;
    entries.forEach(({limits},index)=>{
      for(const {limit,period,reason} of limits){
        const inWindow=active[index].filter(t=>t>now-period);
        if(inWindow.length<limit)continue;
        const until=inWindow[inWindow.length-limit]+period;
        if(!denied || until>denied.until)denied={allowed:false,reason,until};
      }
    });
    if(denied)return {result:denied};
    const updates=new Map(entries.map(({key},i)=>[key,{times:[...active[i],now],expiresAt:now+HOUR}]));
    return {updates,result:{allowed:true}};
  });
}

export function memoryLimitStore({max=8192,clock=Date.now}={}){
  const data=new Map();
  let sweepAt=0;
  return {change(keys,decide){
    const now=clock();
    if(now>=sweepAt){for(const [k,v] of data)if(v.expiresAt<=now)data.delete(k);sweepAt=now+MINUTE;}
    const {updates,result}=decide(new Map(keys.map(k=>[k,data.get(k)])));
    if(updates){
      const fresh=[...updates.keys()].filter(k=>!data.has(k)).length;
      if(data.size+fresh>max)throw Error("Help guard is at capacity.");
      for(const [k,v] of updates)data.set(k,v);
    }
    return result;
  }};
}

export function createHelpGuard({key=randomBytes(32),store=memoryLimitStore(),clock=Date.now,report=()=>{}}={}){
  if(Buffer.byteLength(key)<32)throw Error("The help signing secret must contain at least 32 bytes.");
  const hash=s=>createHmac("sha256",key).update(s).digest("hex").slice(0,32);
  const blocked=new Map(), quiet=new Map(), deliveries=new Map();
  let lastSweep=0;
  let unavailableUntil=0;
  function notify(reason){
    if(deliveries.has(reason))return deliveries.get(reason);
    if((quiet.get(reason)||0)>clock())return;
    const delivery=Promise.resolve().then(()=>report(reason)).then(()=>{
      quiet.set(reason,clock()+HOUR);
    },()=>{
      quiet.set(reason,clock()+MINUTE);
      console.error("WillForFree could not deliver an AI limit event.");
    }).finally(()=>deliveries.delete(reason));
    deliveries.set(reason,delivery);
    return delivery;
  }
  async function check(entries){
    const now=clock();
    if(now>=lastSweep+MINUTE){
      for(const [k,v] of blocked)if(v.until<=now)blocked.delete(k);
      lastSweep=now;
    }
    if(unavailableUntil>now){
      await notify("guard_unavailable");
      return {allowed:false,reason:"guard_unavailable",until:unavailableUntil};
    }
    for(const {key} of entries){
      const saved=blocked.get(key);
      if(saved && saved.until>now){
        await notify(saved.reason);
        return saved;
      }
    }
    try{
      const result=await reserve(store,entries,now);
      if(!result.allowed){
        const entry=entries.find(e=>e.limits.some(l=>l.reason===result.reason));
        if(blocked.size<8192)blocked.set(entry.key,result);
        await notify(result.reason);
      }
      return result;
    }catch{
      unavailableUntil=now+MINUTE;
      const result={allowed:false,reason:"guard_unavailable",until:unavailableUntil};
      await notify(result.reason);
      return result;
    }
  }
  return {
    async request({address,cookie,secure,hostingCookie}){
      const now=clock(),visitor=cookieIdentity(cookie,key,now,secure,hostingCookie);
      const entries=[{key:"b-"+hash("browser:"+visitor.id),limits:browserLimits},
        {key:"n-"+hash("network:"+networkPrefix(address)),limits:networkLimits}];
      const result=await check(entries);
      return {...result,cookie:visitor.cookie,retryAfter:result.allowed?0:Math.max(1,Math.ceil((result.until-now)/1000))};
    },
    async provider(){
      return (await check([{key:"global-provider",limits:providerLimits}])).allowed;
    }
  };
}
