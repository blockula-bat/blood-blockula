import fs from 'node:fs';
// Blockula interface format 1: sorted methods, fixed-size byte fields where composite.
const u64=4, addr=10, bytes=n=>[13,n&255,(n>>8)&255,0,0];
const methods=[
 ['init',2,0,[['treasury',addr]],null],['fee_recipient',1,0,[],addr],['fees_collected',1,0,[],u64],['total_supply',1,0,[],u64],['decimals',1,0,[],1],['symbol',1,0,[],bytes(5)],
 ['balance_of',1,0,[['account',addr]],u64],['lp_balance',1,0,[['account',addr]],u64],['reserves',1,0,[],bytes(24)],
 ['transfer',0,0,[['to',addr],['amount',u64]],null],['approve',0,0,[['spender',addr],['amount',u64]],null],
 ['allowance',1,0,[['owner',addr],['spender',addr]],u64],['transfer_from',0,0,[['from',addr],['to',addr],['amount',u64]],null],
 ['quote_buy',1,0,[['amount',u64]],u64],['quote_sell',1,0,[['amount',u64]],u64],
 ['buy',0,1,[['min_out',u64],['deadline',u64]],u64],['sell',0,0,[['amount',u64],['min_out',u64],['deadline',u64]],u64],
 ['add_liquidity',0,1,[['max_token',u64],['min_shares',u64],['deadline',u64]],u64],
 ['remove_liquidity',0,0,[['shares',u64],['min_fang',u64],['min_token',u64],['deadline',u64]],null],
].sort((a,b)=>a[0]<b[0]?-1:1);
const ident=s=>[s.length,...Buffer.from(s)];
const out=[1,methods.length];
for(const [n,k,p,args,r] of methods){out.push(...ident(n),k,p,args.length);for(const [an,t]of args)out.push(...ident(an),...[t].flat());out.push(r===null?0:1);if(r!==null)out.push(...[r].flat());}
fs.mkdirSync('artifacts',{recursive:true});fs.copyFileSync('contract/target/wasm32v1-none/release/blood.wasm','artifacts/blood.wasm');fs.writeFileSync('artifacts/blood.iface',Buffer.from(out));fs.writeFileSync('artifacts/interface.json',JSON.stringify(methods,null,2));console.log({wasm:fs.statSync('artifacts/blood.wasm').size,interface:out.length});
