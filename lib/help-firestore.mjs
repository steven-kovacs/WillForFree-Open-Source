// Only the backend identity can reach this collection. Public Firebase clients have no allow rule.
export function firestoreLimitStore(db,{clock=Date.now}={}){
  const collection=db.collection("helpRateLimits");
  let cleanupAt=0;
  let cleaning=false;
  async function cleanup(now){
    if(cleaning || now<cleanupAt)return;
    cleaning=true;
    cleanupAt=now+15*60_000;
    try{
      const stale=await collection.where("expiresAt","<=",now).limit(100).get();
      // A concurrent request may have renewed a bucket since the query.
      const deletions=await Promise.allSettled(stale.docs.map(snap=>snap.ref.delete({lastUpdateTime:snap.updateTime})));
      if(deletions.some(item=>item.status==="rejected" && ![5,9].includes(item.reason?.code)))
        throw Error("A counter could not be pruned.");
    }catch{cleanupAt=now+60_000;console.error("WillForFree could not prune expired help counters.");}
    finally{cleaning=false;}
  }
  return {async change(keys,decide){
    const refs=keys.map(k=>collection.doc(k));
    const result=await db.runTransaction(async tx=>{
      const snapshots=await tx.getAll(...refs);
      const current=new Map(snapshots.map((doc,i)=>[keys[i],doc.data()]));
      const {updates,result}=decide(current);
      if(updates)for(const [k,v] of updates)tx.set(collection.doc(k),v);
      return result;
    });
    await cleanup(clock());
    return result;
  }};
}
