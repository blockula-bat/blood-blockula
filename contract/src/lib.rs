//! BLOOD: immutable, fixed-supply fungible token and native-FANG constant-product AMM.
//! 9 decimals on both assets. No mint, admin, fee withdrawal, or upgrade path.
//! Storage: s=supply; r=[FANG,BLOOD,LP] u64 LE; b+address=token; l+address=LP;
//! a+owner+spender=allowance. Pool tokens are reserves, NOT an address balance.
#![no_std]
use abi::*;
const SUPPLY: u64 = 1_000_000_000_000_000;
const LOCK: u64 = 1_000;
const FEE_BPS:u64=100;
fn fee(n:u64)->u64 { muldiv(n,FEE_BPS,10_000) }
fn fee_to()->Address { get::<32>(b"t").unwrap_or_else(||abort(12,b"missing treasury")) }
fn pay_fee(n:u64) { if n>0 { put(b"f",&add(get_u64(b"f"),n).to_le_bytes());pay(&fee_to(),n,0);emit(b"protocol_fee",&n.to_le_bytes()); } }
fn require(ok: bool, msg: &[u8]) { if !ok { abort(10, msg); } }
fn add(a:u64,b:u64)->u64 { a.checked_add(b).unwrap_or_else(||abort(11,b"overflow")) }
fn narrow(n:u128)->u64 { u64::try_from(n).unwrap_or_else(|_|abort(11,b"overflow")) }
fn key(t:u8,a:&Address)->[u8;33] { let mut k=[0;33]; k[0]=t; k[1..].copy_from_slice(a); k }
fn ak(a:&Address,b:&Address)->[u8;65] { let mut k=[0;65]; k[0]=b'a'; k[1..33].copy_from_slice(a); k[33..].copy_from_slice(b); k }
fn set(k:&[u8], n:u64) { if n==0 { remove(k); } else { put(k,&n.to_le_bytes()); } }
fn balance(t:u8,a:&Address)->u64 { get_u64(&key(t,a)) }
fn credit(t:u8,a:&Address,n:u64) { set(&key(t,a),add(balance(t,a),n)); }
fn debit(t:u8,a:&Address,n:u64) { let b=balance(t,a); require(b>=n,b"insufficient balance"); set(&key(t,a),b-n); }
fn pool()->[u64;3] { let d=get::<24>(b"r").unwrap_or([0;24]); [u64_at(&d,0),u64_at(&d,8),u64_at(&d,16)] }
fn save(p:[u64;3]) { let mut d=[0;24]; for i in 0..3 { d[i*8..i*8+8].copy_from_slice(&p[i].to_le_bytes()); } put(b"r",&d); require(self_balance()>=p[0],b"native reserve deficit"); }
fn deadline(d:u64) { require(block_height()<=d,b"expired"); }
fn output(n:u64,min:u64) { require(n>0 && n>=min,b"slippage or dust"); }
fn muldiv(a:u64,b:u64,d:u64)->u64 { require(d>0,b"zero divisor"); narrow(a as u128*b as u128/d as u128) }
fn ceildiv(a:u64,b:u64,d:u64)->u64 { require(d>0,b"zero divisor"); narrow((a as u128*b as u128).div_ceil(d as u128)) }
fn quote(n:u64,rin:u64,rout:u64)->u64 {
    require(n>0 && rin>0 && rout>0,b"empty amount or pool");
    narrow(n as u128*rout as u128/(rin as u128+n as u128))
}
fn sqrt(n:u128)->u64 { if n==0{return 0} let mut x=n; let mut y=(x+1)/2; while y<x {x=y;y=(x+n/x)/2;} narrow(x) }
fn moved(from:&Address,to:&Address,n:u64) {
    require(n>0 && *to!=[0;32] && *to!=self_address(),b"invalid transfer");
    debit(b'b',from,n); credit(b'b',to,n);
    let mut d=[0;72]; d[..32].copy_from_slice(from);d[32..64].copy_from_slice(to);d[64..].copy_from_slice(&n.to_le_bytes());emit(b"transfer",&d);
}
fn swap_event(who:&Address,buy:bool,n:u64,out:u64) {let mut d=[0;49];d[..32].copy_from_slice(who);d[32]=buy as u8;d[33..41].copy_from_slice(&n.to_le_bytes());d[41..].copy_from_slice(&out.to_le_bytes());emit(b"swap",&d);}
#[unsafe(no_mangle)] pub extern "C" fn bk_init() {
    nonpayable();let treasury=input::<32>();require(get::<8>(b"s").is_none(),b"already initialized");require(treasury!=[0;32] && treasury!=self_address(),b"invalid treasury");put(b"t",&treasury);
    put(b"s",&SUPPLY.to_le_bytes());credit(b'b',&caller(),SUPPLY);save([0,0,0]);emit(b"mint",&SUPPLY.to_le_bytes());
}
#[unsafe(no_mangle)] pub extern "C" fn bk_total_supply(){nonpayable();input::<0>();ret(&get_u64(b"s").to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_decimals(){nonpayable();input::<0>();ret(&[9]);}
#[unsafe(no_mangle)] pub extern "C" fn bk_symbol(){nonpayable();input::<0>();ret(b"BLOOD");}
#[unsafe(no_mangle)] pub extern "C" fn bk_balance_of(){nonpayable();let a=input::<32>();ret(&balance(b'b',&a).to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_lp_balance(){nonpayable();let a=input::<32>();ret(&balance(b'l',&a).to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_reserves(){nonpayable();input::<0>();ret(&get::<24>(b"r").unwrap_or([0;24]));}
#[unsafe(no_mangle)] pub extern "C" fn bk_transfer(){nonpayable();let d=input::<40>();moved(&caller(),&addr_at(&d,0),u64_at(&d,32));}
#[unsafe(no_mangle)] pub extern "C" fn bk_allowance(){nonpayable();let d=input::<64>();ret(&get_u64(&ak(&addr_at(&d,0),&addr_at(&d,32))).to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_approve(){
    nonpayable();let d=input::<40>();let a=caller();let b=addr_at(&d,0);let n=u64_at(&d,32);let k=ak(&a,&b);
    require(b!=[0;32],b"invalid spender");require(n==0 || get_u64(&k)==0,b"reset allowance first");set(&k,n);emit(b"approval",&d);
}
#[unsafe(no_mangle)] pub extern "C" fn bk_transfer_from(){
    nonpayable();let d=input::<72>();let a=addr_at(&d,0);let b=addr_at(&d,32);let n=u64_at(&d,64);let k=ak(&a,&caller());let allowed=get_u64(&k);
    require(allowed>=n,b"insufficient allowance");set(&k,allowed-n);moved(&a,&b,n);
}
#[unsafe(no_mangle)] pub extern "C" fn bk_quote_buy(){nonpayable();let d=input::<8>();let p=pool();let n=u64_at(&d,0);ret(&quote(n-fee(n),p[0],p[1]).to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_quote_sell(){nonpayable();let d=input::<8>();let p=pool();let gross=quote(u64_at(&d,0),p[1],p[0]);ret(&(gross-fee(gross)).to_le_bytes());}
#[unsafe(no_mangle)] pub extern "C" fn bk_buy(){
    let d=input::<16>();deadline(u64_at(&d,8));let mut p=pool();let n=value();let tax=fee(n);let net=n-tax;let out=quote(net,p[0],p[1]);output(out,u64_at(&d,0));
    p[0]=add(p[0],net);p[1]-=out;credit(b'b',&caller(),out);save(p);pay_fee(tax);swap_event(&caller(),true,n,out);ret(&out.to_le_bytes());
}
#[unsafe(no_mangle)] pub extern "C" fn bk_sell(){
    nonpayable();let d=input::<24>();deadline(u64_at(&d,16));let mut p=pool();let n=u64_at(&d,0);let gross=quote(n,p[1],p[0]);let tax=fee(gross);let out=gross-tax;output(out,u64_at(&d,8));
    debit(b'b',&caller(),n);p[1]=add(p[1],n);p[0]-=gross;save(p);pay_fee(tax);pay(&caller(),out,0);swap_event(&caller(),false,n,out);ret(&out.to_le_bytes());
}
#[unsafe(no_mangle)] pub extern "C" fn bk_add_liquidity(){
    let d=input::<24>();deadline(u64_at(&d,16));let max_token=u64_at(&d,0);let n=value();let mut p=pool();require(n>0 && max_token>0,b"zero liquidity");
    let (token,shares,refund)=if p[2]==0 {
        let root=sqrt(n as u128*max_token as u128);require(root>LOCK,b"initial liquidity too small");p[2]=LOCK;(max_token,root-LOCK,0)
    } else {
        let token=ceildiv(n,p[1],p[0]);
        if token<=max_token {(token,muldiv(n,p[2],p[0]).min(muldiv(token,p[2],p[1])),0)}
        else {let used=ceildiv(max_token,p[0],p[1]);require(used<=n,b"liquidity rounding");(max_token,muldiv(used,p[2],p[0]).min(muldiv(max_token,p[2],p[1])),n-used)}
    };
    output(shares,u64_at(&d,8));debit(b'b',&caller(),token);credit(b'l',&caller(),shares);p[0]=add(p[0],n-refund);p[1]=add(p[1],token);p[2]=add(p[2],shares);save(p);
    if refund>0{pay(&caller(),refund,0)}emit(b"liquidity_added",&shares.to_le_bytes());ret(&shares.to_le_bytes());
}
#[unsafe(no_mangle)] pub extern "C" fn bk_remove_liquidity(){
    nonpayable();let d=input::<32>();deadline(u64_at(&d,24));let shares=u64_at(&d,0);let mut p=pool();require(shares>0,b"zero shares");
    let fang=muldiv(shares,p[0],p[2]);let token=muldiv(shares,p[1],p[2]);output(fang,u64_at(&d,8));output(token,u64_at(&d,16));
    debit(b'l',&caller(),shares);p[0]-=fang;p[1]-=token;p[2]-=shares;credit(b'b',&caller(),token);save(p);pay(&caller(),fang,0);emit(b"liquidity_removed",&shares.to_le_bytes());
}

#[unsafe(no_mangle)] pub extern "C" fn bk_fee_recipient(){nonpayable();input::<0>();ret(&fee_to());}
#[unsafe(no_mangle)] pub extern "C" fn bk_fees_collected(){nonpayable();input::<0>();ret(&get_u64(b"f").to_le_bytes());}
