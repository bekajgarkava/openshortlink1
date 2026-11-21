import {get,list} from "@vercel/blob";
import {NextResponse} from "next/server";
import {isAuthenticated} from "../../../../lib/auth";
import {SMS_BATCH_SIZE} from "../../../../lib/sms";
const HISTORY_RESET_AT="2026-11-21T20:51:29.342Z";
export const runtime="nodejs";
export const maxDuration=60;
const fail=(error,status)=>NextResponse.json({error},{status,headers:{"cache-control":"no-store"}});
export async function GET(request){
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 try{
  const url=new URL(request.url),offset=Math.min(Math.max(Number(url.searchParams.get("offset"))||0,0),500000);
  const campaigns=[];let cursor;
  // Read the campaign ledger in pages; numbers never leave the authenticated API.
  for(let page=0;page<100;page++){
   const result=await list({prefix:"sms/campaigns/",limit:100,...(cursor?{cursor}:{})});
   for(const record of result.blobs){
    const file=await get(record.pathname,{access:"private"});
    if(file){const c=JSON.parse(await new Response(file.stream).text());if(c.createdAt>HISTORY_RESET_AT)campaigns.push(c);}
   }
   cursor=result.cursor;if(!cursor)break;
  }
  campaigns.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const records=[];let skipped=0;
  for(const c of campaigns){
   const receipts=await list({prefix:"sms/results/"+c.id+"/",limit:1000});
   const completed=new Set(receipts.blobs.map(b=>Number(b.pathname.match(/\/(\d+)\.json$/)?.[1])));
   for(let i=0;i<c.numbers.length;i++){
    if(!completed.has(Math.floor(i/SMS_BATCH_SIZE)))continue;
    if(skipped++<offset)continue;
    if(records.length<101)records.push({number:c.numbers[i],text:c.text,date:c.createdAt,id:c.id});
   }
   if(records.length>=101)break;
  }
  return NextResponse.json({records:records.slice(0,100),hasMore:records.length>100},{headers:{"cache-control":"no-store"}});
 }catch(e){console.error("SMS history request failed",e?.name);return fail("ისტორიის ჩატვირთვა ვერ მოხერხდა",503);}
}
