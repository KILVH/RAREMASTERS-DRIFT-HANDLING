const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const old={version:1,selected:'bmw',owned:['baseline','bmw'],tires:34,money:12345,custom:{},achievements:[],npcImported:{'green:forward':true},cosmeticMigration:1,independentCosmetics:1,audioChannels:1,bonusEconomyV2:1};const memory=new Map([['raremasters.replay.progress.v1.qa',JSON.stringify(old)]]);
const rows={'raremasters-runs-qa':{runs:[{id:'old',mode:'competition',score:50}],summaries:[{id:'old',mode:'competition',score:50}],npcReplays:[]},'raremasters-replay-runs-qa':{runs:[{id:'recent',mode:'competition',score:80}],summaries:[{id:'recent',mode:'competition',score:80}],npcReplays:[{id:'npc',bucket:'green:forward',date:1}]},'raremasters-handling-runs-qa':{runs:[],summaries:[],npcReplays:[]}};
const indexedDB={open(name){const req={};queueMicrotask(()=>{
 req.result={objectStoreNames:{contains:s=>s in rows[name]},transaction(store){
  const tx={objectStore(s=store){
   const all=rows[name][s],read=value=>{const q={};queueMicrotask(()=>{q.result=value;q.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return q;};
   return {get:id=>read(all.find(r=>r.id===id)),getAll:()=>read([...all]),index:()=>({getAll:b=>read(all.filter(r=>r.bucket===b))})};
  }};return tx;
 }};req.onsuccess();
 });return req;}};
const ctx={console,URLSearchParams,location:{search:'?qa'},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},indexedDB,window:{},Map,Math,Date};vm.createContext(ctx);for(const file of ['storage','tuning'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),ctx);
(async()=>{const r=await vm.runInContext(`(async()=>{const imported=[];Save.npcPut=async r=>imported.push(r);const list=await Save.list();await Save.npcList('green:forward');const oldRun=await Save.get('old'),recent=await Save.get('recent');const tireA=Save.state.tires;Save.state.selected='baseline';const tireB=Save.state.tires;Save.persist();return{list:list.map(r=>r.id),imported:imported.map(r=>r.id),oldRun:oldRun.id,recent:recent.id,tireA,tireB,money:Save.state.money};})()`,ctx);assert.deepEqual(r.list,['recent','old']);assert.deepEqual(r.imported,['npc']);assert.equal(r.tireA,34);assert.equal(r.tireB,100);assert.equal(r.money,12345);assert.equal(memory.get('raremasters.replay.progress.v1.qa'),JSON.stringify(old));console.log('PASS legacy progress, both replay databases, NPC import despite old migration flags, independent tires, legacy save unchanged');})();
