import {del,get,list} from "@vercel/blob";
import {NextResponse} from "next/server";
import {isAuthenticated,checkOrigin} from "../../../../../lib/auth";
export const runtime="nodejs";
export const maxDuration=60;
const CUTOFF="2026-11-21T20:51:29.342Z";
export async function POST(request){
 if(!checkOrigin(request))return NextResponse.json({error:"არასწორი წყარო"},{status:403});
 if(!(await isAuthenticated(request)))return NextResponse.json({error:"ავტორიზაცია აუცილებელია"},{status:401});
 try{
  let cursor,removed=0;
  // Delete ONLY SMS campaigns created before the user's reset request.
  // Links, rate-limits and login/session records are never touched.
  do{
   const page=await list({prefix:"sms/campaigns/",limit:100,...(cursor?{cursor}:{})});
   const old=[];
   for(const entry of page.blobs){
    if(new Date(entry.uploadedAt).toISOString()>CUTOFF)continue;
    const source=await get(entry.pathname,{access:"private"});
    if(!source)continue;
    const c=JSON.parse(await new Response(source.stream).text());
    if(c.createdAt<=CUTOFF)old.push({id:c.id,path:entry.pathname});
   }
   for(const campaign of old){
    for(const prefix of ["sms/results/"+campaign.id+"/","sms/claims/"+campaign.id+"/"]){
     let found;
     do{
      found=await list({prefix,limit:1000});
      if(found.blobs.length)await del(found.blobs.map(b=>b.pathname));
     }while(found.blobs.length===1000);
    }
    await del(campaign.path);
    removed++;
   }
   cursor=page.cursor;
   // Avoid paging offsets while removing current pages; any remainder is cleaned on next run.
  }while(cursor && removed===0);
  return NextResponse.json({ok:true,removed},{headers:{"cache-control":"no-store"}});
 }catch(error){console.error("SMS history cleanup failure",error?.name);return NextResponse.json({error:"ისტორიის გასუფთავება ვერ დასრულდა"},{status:503});}
}
