const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_KEY=process.env.ADMIN_KEY;
function h(extra={}){return{apikey:SUPABASE_KEY||'',Authorization:`Bearer ${SUPABASE_KEY||''}`,'Content-Type':'application/json',...extra}}
function auth(req){return ADMIN_KEY && req.headers['x-admin-key']===ADMIN_KEY}
export default async function handler(req,res){
 if(!auth(req))return res.status(401).json({error:'Neplatné administrátorské heslo.'});
 if(!SUPABASE_URL||!SUPABASE_KEY)return res.status(500).json({error:'Databáze není nastavená.'});
 try{
  if(req.method==='GET'){
   const r=await fetch(`${SUPABASE_URL}/rest/v1/orinaya_messages?status=eq.pending&select=id,message,name,anonymous,created_at&order=created_at.asc`,{headers:h()});
   if(!r.ok)throw new Error(await r.text());
   return res.status(200).json({messages:await r.json()});
  }
  const id=String(req.body?.id||'').trim();
  if(!id)return res.status(400).json({error:'Chybí id.'});
  if(req.method==='PATCH'&&req.body?.action==='approve'){
   const r=await fetch(`${SUPABASE_URL}/rest/v1/orinaya_messages?id=eq.${encodeURIComponent(id)}`,{
     method:'PATCH',headers:h({Prefer:'return=minimal'}),
     body:JSON.stringify({status:'approved',approved_at:new Date().toISOString()})
   });
   if(!r.ok)throw new Error(await r.text());
   return res.status(200).json({ok:true});
  }
  if(req.method==='DELETE'){
   const r=await fetch(`${SUPABASE_URL}/rest/v1/orinaya_messages?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:h()});
   if(!r.ok)throw new Error(await r.text());
   return res.status(200).json({ok:true});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){
   console.error(e);
   return res.status(500).json({error:'Něco se nepovedlo.'});
 }
}