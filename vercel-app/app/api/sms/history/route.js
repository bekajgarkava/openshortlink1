import {get,list} from "@vercel/blob";
import {NextResponse} from "next/server";
import {isAuthenticated} from "../../../../lib/auth";
import {SMS_BATCH_SIZE} from "../../../../lib/sms";
const HISTORY_RESET_AT="2026-11-21T20:51:29.342Z";
const PAGE_SIZE=10;
export const runtime="nodejs";
export const maxDuration=60;
const headers={"cache-control":"no-store"};
const fail=(error,status)=>NextResponse.json({error},{status,headers});
async function listAll(prefix){
 const blobs=[];let cursor;
 do{
  const result=await list({prefix,limit:1000,...(cursor?{cursor}:{})});
  blobs.push(...result.blobs);cursor=result.cursor;
 }while(cursor);
 return blobs;
}
export async function GET(request){
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 try{
  const url=new URL(request.url);
  const requested=Number(url.searchParams.get("page")||"1");
  const page=Number.isSafeInteger(requested)&&requested>0?Math.min(requested,50001):1;
  const offset=(page-1)*PAGE_SIZE;
  // Campaigns are immutable and uploaded when created. Sort their metadata first,
  // and read only the campaigns needed for this page and one look-ahead record.
  const campaigns=(await listAll("sms/campaigns/"))
   .filter(b=>new Date(b.uploadedAt).getTime()>Date.parse(HISTORY_RESET_AT))
   .sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt)||b.pathname.localeCompare(a.pathname));
  const records=[];let remaining=offset;
  for(const entry of campaigns){
   const id=entry.pathname.slice("sms/campaigns/".length,-5);
   if(!/^[0-9a-f-]{36}$/i.test(id))continue;
   const receipts=await listAll("sms/results/"+id+"/");
   if(!receipts.length)continue;
   const completed=[...new Set(receipts.map(b=>Number(b.pathname.match(/\/(\d+)\.json$/)?.[1])).filter(n=>Number.isSafeInteger(n)&&n>=0))].sort((a,b)=>a-b);
   if(!completed.length)continue;
   const file=await get(entry.pathname,{access:"private"});
   if(!file)continue;
   const c=JSON.parse(await new Response(file.stream).text());
   if(c.createdAt<=HISTORY_RESET_AT)continue;
   for(const batch of completed){
    const start=batch*SMS_BATCH_SIZE,end=Math.min(start+SMS_BATCH_SIZE,c.numbers.length);
    const count=Math.max(0,end-start);
    if(remaining>=count){remaining-=count;continue;}
    for(let i=start+remaining;i<end&&records.length<=PAGE_SIZE;i++){
     records.push({number:c.numbers[i],text:c.text,date:c.createdAt,id:c.id});
    }
    remaining=0;
    if(records.length>PAGE_SIZE)break;
   }
   if(records.length>PAGE_SIZE)break;
  }
  return NextResponse.json({records:records.slice(0,PAGE_SIZE),page,pageSize:PAGE_SIZE,hasMore:records.length>PAGE_SIZE},{headers});
 }catch(e){console.error("SMS history request failed",e?.name);return fail("ისტორიის ჩატვირთვა ვერ მოხერხდა",503);}
}
