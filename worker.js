// Only public Blockula API requests are proxied. Never forward the hosting session or cookies.
const RPC='https://demo.blockula.app';
const HEADERS={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'Permissions-Policy':'publickey-credentials-create=(self), publickey-credentials-get=(self)',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
export default {async fetch(request,env){
 const url=new URL(request.url);let response;
 if(url.pathname.startsWith('/api/')){
  const allowed=request.method==='GET'||(request.method==='POST'&&['/api/tx','/api/faucet'].includes(url.pathname));
  if(!allowed)return new Response('Method not allowed',{status:405});
  const size=Number(request.headers.get('Content-Length')||0);if(size>262144)return new Response('Request too large',{status:413});
  const body=request.method==='POST'?await request.arrayBuffer():undefined;if(body&&body.byteLength>262144)return new Response('Request too large',{status:413});
  const upstream=await fetch(RPC+url.pathname+url.search,{method:request.method,headers:{'Content-Type':'application/json','Accept':'application/json'},body,redirect:'manual'});
  response=new Response(upstream.body,{status:upstream.status,headers:{'Content-Type':upstream.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});
 }else response=await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);for(const [k,v]of Object.entries(HEADERS))headers.set(k,v);return new Response(response.body,{status:response.status,headers});
}};
