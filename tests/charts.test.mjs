import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartWindow,poolHistory} from '../src/charts.mjs';
import {decode,apply} from '../src/history.mjs';
const point=(height,n,vol=0n)=>({height,p:[n,100n,1n],vol,id:String(height),method:'buy'});
test('24h window keeps pre-window reserves and includes the latest trade, without launch-day scaling',()=>{
 const r=chartWindow([point(0,100n),point(10,177n),point(90,181n,10n)],x=>x,100,24);
 assert.equal(r.t0,76);assert.equal(r.pts[0].t,76);assert.equal(r.pts[0].p[0],177n);assert.equal(r.pts[0].vol,0n);
 assert.equal(r.pts[1].p[0],181n);assert.equal(r.pts[1].vol,10n);
 const all=chartWindow([point(0,100n),point(90,181n)],x=>x,100,0);assert.equal(all.t0,0);assert.equal(all.pts[0].p[0],100n);
});
test('quiet time windows retain the last known price without inventing volume',()=>{
 const r=chartWindow([point(0,100n),point(10,177n,4n)],x=>x,100,24);
 assert.equal(r.pts.length,1);assert.equal(r.pts[0].p[0],177n);assert.equal(r.pts[0].vol,0n);assert.equal(r.t0,76);
});
test('incremental refresh incorporates a new finalized pool transaction without reload',async t=>{
 const fx=JSON.parse(readFileSync(new URL('./fixtures/pool-txs.json',import.meta.url)));
 const p='boo1d9r5ph0e7k2vezt0tp2ns3wqvs2psyhcrmelzjfl4990xtuj8qvs96nq80',ops=fx.txs.slice().reverse().flatMap(tx=>decode(tx,p)),cut=ops.at(-1).height-1;
 let snapshot=fx.txs.filter(tx=>tx.height<=cut),pre=[0n,0n,0n];for(const op of ops.filter(op=>op.height<=cut))pre=apply(pre,op);
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});globalThis.fetch=async(url,options)=>{assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({txs:snapshot,next:null})};};
 const h=poolHistory('https://example.invalid',p);await h.sync(pre,cut);assert.equal(h.error,null);const count=h.result.points.length;
 snapshot=fx.txs;await h.sync(fx.live.map(BigInt),108029);assert.equal(h.error,null);assert.ok(h.result.points.length>count);assert.deepEqual(h.result.points.at(-1).p,fx.live.map(BigInt));
});
