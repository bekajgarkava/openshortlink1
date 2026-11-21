import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthenticated, checkOrigin } from "../../../../../../lib/auth";
import { SMS_BATCH_SIZE } from "../../../../../../lib/sms";
export const runtime="nodejs";
export const maxDuration=60;
const fail=(error,status)=>NextResponse.json({error},{status,headers:{"cache-control":"no-store"}});
async function sendOne(number,text,unicode){
 const query=new URLSearchParams({
  username:process.env.SMSREKLAMA_USERNAME,
  password:process.env.SMSREKLAMA_PASSWORD,
  brand:process.env.SMSREKLAMA_BRAND||"1",
  numbers:number.slice(4),
  text,
  unicode:String(unicode)
 });
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  // Provider contract supplied by the account owner: HTTP GET with one local 9-digit mobile number.
  const response=await fetch("https://api2.smsreklama.ge/sms/send/?"+query.toString(),{
   method:"GET",cache:"no-store",signal:controller.signal
  });
  const body=(await response.text()).slice(0,500);
  if(!response.ok)return {status:"rejected"};
  // Response format isn't documented for this provider. Do not report carrier delivery
  // or success merely because the HTTP request received 200.
  if(/^(error|failed|false|invalid|unauthorized|forbidden|\-\d+)/i.test(body.trim())||/"success"\s*:\s*false/i.test(body))return {status:"rejected"};
  return {status:"uncertain"};
 }catch{return {status:"uncertain"};}
 finally{clearTimeout(timeout);}
}
export async function POST(request,{params}){
 if(!checkOrigin(request))return fail("არასწორი წყარო",403);
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 if(!process.env.SMSREKLAMA_USERNAME||!process.env.SMSREKLAMA_PASSWORD||!process.env.BLOB_READ_WRITE_TOKEN)return fail("SMS-ის სერვისი არ არის კონფიგურირებული",503);
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return fail("არასწორი კამპანია",400);
 let body;try{body=await request.json();}catch{return fail("არასწორი მოთხოვნა",400);}
 const batchIndex=Number(body?.batchIndex);
 if(!Number.isInteger(batchIndex)||batchIndex<0)return fail("არასწორი ჯგუფი",400);
 try{
  const stored=await get("sms/campaigns/"+id+".json",{access:"private"});
  if(!stored)return fail("კამპანია ვერ მოიძებნა",404);
  const campaign=JSON.parse(await new Response(stored.stream).text());
  if(batchIndex>=campaign.batches)return fail("არასწორი ჯგუფი",400);
  const receiptPath="sms/results/"+id+"/"+batchIndex+".json";
  const claimPath="sms/claims/"+id+"/"+batchIndex+".txt";
  const previous=await get(receiptPath,{access:"private"});
  if(previous)return NextResponse.json({alreadyProcessed:true,batchIndex},{headers:{"cache-control":"no-store"}});
  // Before contacting the provider, reserve this batch with a write-once key.
  // A failure after reservation is intentionally NOT retried automatically.
  try{await put(claimPath,new Date().toISOString(),{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"text/plain"});}
  catch(err){
   if(err?.name==="BlobAlreadyExistsError"||err?.code==="BLOB_ALREADY_EXISTS"||err?.message?.includes("already exists"))return fail("ეს ჯგუფი უკვე დაიწყო. განახლება და შემოწმება სჭირდება.",409);
   throw err;
  }
  const batch=campaign.numbers.slice(batchIndex*SMS_BATCH_SIZE,(batchIndex+1)*SMS_BATCH_SIZE);
  let next=0;
  const outcomes=Array(batch.length);
  async function worker(){
   while(next<batch.length){
    const i=next++;
    outcomes[i]=await sendOne(batch[i],campaign.text,campaign.unicode);
   }
  }
  await Promise.all(Array.from({length:Math.min(5,batch.length)},()=>worker()));
  const accepted=outcomes.filter(x=>x.status==="accepted").length;
  const rejected=outcomes.filter(x=>x.status==="rejected").length;
  const uncertain=outcomes.filter(x=>x.status==="uncertain").length;
  const record={batchIndex,attempted:batch.length,accepted,rejected,uncertain,finishedAt:new Date().toISOString()};
  await put(receiptPath,JSON.stringify(record),{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"application/json"});
  return NextResponse.json(record,{headers:{"cache-control":"no-store"}});
 }catch(error){
  console.error("SMS dispatch error",error?.name);
  return fail("ჯგუფის გაგზავნის სტატუსი გაურკვეველია. თავიდან ავტომატურად არ გავაგზავნით, რათა დუბლირება ავიცილოთ.",503);
 }
}
