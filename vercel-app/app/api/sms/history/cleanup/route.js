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
  let removed=0;
  // All deletes are scoped to sms/ and only to campaigns predating this request.
  for(let page=0;page<100;page++){
   const result=await list({prefix:"sms/campaigns/",limit:1000});
   const old=[];
   for(const entry of result.blobs){
    if(new Date(entry.uploadedAt)>new Date(CUTOFF))continue;
    const record=await get(entry.pathname,{access:"private"});
    if(!record)continue;
    const data=JSON.parse(await new Response(record.stream).text());
    if(data.createdAt<=CUTOFF)old.push({id:data.id,path:entry.pathname});
   }
   if(!old.length)break;
   for(const campaign of old){
    for(const prefix of ["sms/results/"+campaign.id+"/","sms/claims/"+campaign.id+"/"]){
     for(let i=0;i<100;i++){
      const blobs=await list({prefix,limit:1000});
      if(!blobs.blobs.length)break;
      await del(blobs.blobs.map(item=>item.pathname));
      if(blobs.blobs.length<1000)break;
     }
    }
    await del(campaign.path);
    removed++;
   }
   if(old.length<1000)break;
  }
  return NextResponse.json({ok:true,removed},{headers:{"cache-control":"no-store"}});
 }catch(error){console.error("SMS history cleanup failure",error?.name);return NextResponse.json({error:"ისტორიის გასუფთავება ვერ დასრულდა"},{status:503});}
}
