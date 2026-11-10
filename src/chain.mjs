import {Client} from '@blockula/sdk';
import {bech32m} from '@scure/base';
import {readLE} from './math.mjs';
export const RPC='https://demo.blockula.app';
export const PIN={chainId:'blockula-demo-2',genesisHash:'e712d9376917f0c9d10c164fa7c1a53fef7c8dc1c24100e7924037d0250f705e',prefix:'boo',genesisClock:{createdAtMs:1794193062992,blockTimeMs:2000}};
export const client=new Client(RPC,PIN);
export const addressBytes=s=>bech32m.fromWords(bech32m.decode(s).words);
export const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export async function storage(program){let after='',entries=[],height=null;for(let i=0;i<100;i++){const res=await fetch(`${RPC}/api/program/${program}/storage?limit=100${after?'&after='+after:''}`);if(!res.ok)throw Error(`Pool state unavailable (${res.status}).`);const page=await res.json();if(height!==null&&height!==page.height)throw Error('Chain advanced while reading balances; refreshing.');height=page.height;entries.push(...page.entries);if(!page.next)return {map:new Map(entries.map(e=>[e.key,e.value])),height};after=page.next;}throw Error('Pool state exceeds this reader’s pagination limit.');}
export const u64=(map,key)=>readLE(map.get(key));
