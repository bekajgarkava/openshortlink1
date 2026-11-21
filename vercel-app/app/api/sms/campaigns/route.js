import { put,list,get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthenticated, checkOrigin } from "../../../../lib/auth";
import { normalizePhones,assertMessage,verifyNumbers,campaignId,SMS_BATCH_SIZE,SMS_MAX_RECIPIENTS } from "../../../../lib/sms";
export const runtime="nodejs";
export const maxDuration=60;
const fail=(error,status)=>NextResponse.json({error},{status,headers:{"cache-control":"no-store"}});
export async function POST(request){
 if(!checkOrigin(request))return fail("არასწორი წყარო",403);
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 if(!process.env.BLOB_READ_WRITE_TOKEN)return fail("საცავი მიუწვდომელია",503);
 try{
  const body=await request.json();
  if(body.consent!==true || body.confirmed!==true)return fail("აუცილებელია მიმღებების თანხმობისა და გაგზავნის დადასტურება",400);
  const {numbers,duplicates,invalidCount}=normalizePhones(body.numbers);
  const message=assertMessage(body.text);
  if(invalidCount) return fail("სიაში არასწორი ნომრებია; გაასწორეთ ისინი გაგზავნამდე",400);
  if(!numbers.length||numbers.length>SMS_MAX_RECIPIENTS)return fail("მიმღებების რაოდენობა უნდა იყოს 1-დან 10 000-მდე",400);
  verifyNumbers(numbers);
  const id=campaignId(),now=new Date().toISOString();
  const data={id,createdAt:now,text:message.text,unicode:message.unicode,numbers,recipientCount:numbers.length,batches:Math.ceil(numbers.length/SMS_BATCH_SIZE),duplicates};
  await put("sms/campaigns/"+id+".json",JSON.stringify(data),{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"application/json"});
  return NextResponse.json({id,createdAt:now,recipientCount:numbers.length,batches:data.batches},{headers:{"cache-control":"no-store"}});
 }catch(error){console.error("SMS campaign create error",error?.name);return fail(error?.message||"კამპანია ვერ შეიქმნა",400);}
}
export async function GET(request){
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 try {
  const records=await list({prefix:"sms/campaigns/",limit:100});
  const latest=records.blobs.sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt)).slice(0,30);
  const items=[];
  for(const blob of latest){
    const data=await get(blob.pathname,{access:"private"});
    if(!data)continue;
    const c=JSON.parse(await new Response(data.stream).text());
    const receipts=await list({prefix:"sms/results/"+c.id+"/",limit:1000});
    items.push({id:c.id,createdAt:c.createdAt,text:c.text,recipientCount:c.recipientCount,batches:c.batches,processedBatches:receipts.blobs.length});
  }
  return NextResponse.json({items,hasMore:!!records.cursor},{headers:{"cache-control":"no-store"}});
 }catch(error){console.error("SMS history error",error?.name);return fail("ისტორიის წაკითხვა ვერ მოხერხდა",503);}
}
