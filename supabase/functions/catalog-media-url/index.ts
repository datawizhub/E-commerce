import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'Content-Type':'application/json','Cache-Control':'private, no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async request=>{
  const started=Date.now(),requestId=crypto.randomUUID();
  try{
    if(request.method!=='POST')return reply({error:'Method not allowed'},405);
    const reader=request.body?.getReader();if(!reader)return reply({error:'Invalid request'},400);
    let size=0;const parts:Uint8Array[]=[];
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'Request too large'},413);}parts.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    const text=new TextDecoder().decode(bytes);
    let body;try{body=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
    if(typeof body.assetId!=='string'||!uuid.test(body.assetId))return reply({error:'Image not found'},404);
    const url=Deno.env.get('SUPABASE_URL')!;
    const publicKey=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??'{}').default??Deno.env.get('SUPABASE_ANON_KEY');
    const secretKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}').default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!publicKey||!secretKey)throw new Error('Missing runtime configuration');
    const authorization=request.headers.get('Authorization')??'';
    let scoped=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const token=authorization.replace(/^Bearer\s+/i,'');
    if(token.split('.').length===3){
      const verified=await scoped.auth.getUser(token);
      if(verified.data.user)scoped=createClient(url,publicKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    }
    // This RPC validates reachability using the verified caller, before any privileged signing.
    const access=await scoped.rpc('media_access',{asset_id:body.assetId});
    if(access.error)throw access.error;
    if(!access.data)return reply({error:'Image not found'},404);
    const asset=access.data as {bucket:string;path:string;admin:boolean};
    const expiresIn=asset.admin?60:300;
    const signingHeaders:Record<string,string>={'apikey':secretKey,'Content-Type':'application/json'};
    if(!secretKey.startsWith('sb_secret_'))signingHeaders.Authorization=`Bearer ${secretKey}`;
    const signed=await fetch(`${url}/storage/v1/object/sign/${asset.bucket}/${asset.path}`,{method:'POST',headers:signingHeaders,body:JSON.stringify({expiresIn})});
    if(!signed.ok)throw new Error('Storage signing failed');
    const result=await signed.json();
    return reply({url:new URL(`/storage/v1${result.signedURL}`,url).href,expiresIn});
  }catch{
    console.error(JSON.stringify({requestId,operation:'media-sign',durationMs:Date.now()-started,result:'failed'}));
    return reply({error:'Image is temporarily unavailable'},503);
  }
});
