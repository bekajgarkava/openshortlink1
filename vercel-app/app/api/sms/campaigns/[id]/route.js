import { get, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../../../lib/auth";
const fail=(error,status)=>NextResponse.json({error},{status,headers:{"cache-control":"no-store"}});
export async function GET(request,{params}){
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return fail("არასწორი კამპანია",400);
 try{
  const record=await get("sms/campaigns/"+id+".json",{access:"private"});
  if(!record)return fail("კამპანია ვერ მოიძებნა",404);
  const info=JSON.parse(await new Response(record.stream).text());
  const saved=await list({prefix:"sms/results/"+id+"/",limit:1000});
  const claims=await list({prefix:"sms/claims/"+id+"/",limit:1000});
  const results=[];
  for(const item of saved.blobs){
   const b=await get(item.pathname,{access:"private"});
   if(!b)continue;
   results.push(JSON.parse(await new Response(b.stream).text()));
  }
  const completed=new Set(results.map(r=>r.batchIndex));
  const claimed=new Set(claims.blobs.map(b=>Number(b.pathname.match(/\/(\d+)\.txt$/)?.[1])));
  const blocked=[...claimed].filter(n=>!completed.has(n));
  return NextResponse.json({
   id,createdAt:info.createdAt,text:info.text,recipientCount:info.recipientCount,batches:info.batches,
   completeBatches:results.length,attempted:results.reduce((s,r)=>s+r.attempted,0),
   accepted:results.reduce((s,r)=>s+r.accepted,0),
   rejected:results.reduce((s,r)=>s+r.rejected,0),
   uncertain:results.reduce((s,r)=>s+r.uncertain,0),
   completed:[...completed],blocked,
   status:results.length===info.batches?"finished":blocked.length?"needs_review":"in_progress",
  },{headers:{"cache-control":"no-store"}});
 }catch(error){console.error("SMS campaign detail failure",error?.name);return fail("ისტორია მიუწვდომელია",503);}
}
