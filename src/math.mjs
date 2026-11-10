export const UNIT=1_000_000_000n;
export const U64=(1n<<64n)-1n;
export function amount(s){if(!/^(0|[1-9]\d*)(\.\d{1,9})?$/.test(String(s)))throw Error('Use a positive amount with at most 9 decimals.');const [w,f='']=s.split('.');const n=BigInt(w)*UNIT+BigInt(f.padEnd(9,'0'));if(n<=0n||n>U64)throw Error('Amount is outside the supported range.');return n;}
export function fmt(n,d=4){n=BigInt(n);const f=(n%UNIT).toString().padStart(9,'0').slice(0,d).replace(/0+$/,'');return `${(n/UNIT).toLocaleString('en-US')}${f?'.'+f:''}`;}
export function exact(n){return `${n/UNIT}.${(n%UNIT).toString().padStart(9,'0')}`;}
export function fee(n){return n/100n;}
export function quote(n,rin,rout,buy=true){if(n<=0n||rin<=0n||rout<=0n)return 0n;if(buy){const net=n-fee(n);return net*rout/(rin+net);}const gross=n*rout/(rin+n);return gross-fee(gross);}
export function minOut(n,bps){return n*(10000n-BigInt(bps))/10000n;}
export function encode(...numbers){const b=new Uint8Array(numbers.length*8);const v=new DataView(b.buffer);numbers.forEach((n,i)=>{if(BigInt(n)<0n||BigInt(n)>U64)throw Error('Integer overflow');v.setBigUint64(i*8,BigInt(n),true);});return b;}
export function readLE(hex){if(!hex)return 0n;const b=Uint8Array.from(hex.match(/../g).map(x=>parseInt(x,16)));return new DataView(b.buffer).getBigUint64(0,true);}
export function liquidity(n,maxToken,p){const [f,t,l]=p;if(l===0n)throw Error('Pool has not been initialized.');let token=(n*t+f-1n)/f;let used=n;if(token>maxToken){token=maxToken;used=(token*f+t-1n)/t;}const shares=[used*l/f,token*l/t].reduce((a,b)=>a<b?a:b);return {token,used,shares};}
