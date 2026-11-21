import { put } from "@vercel/blob";
import { createHash, randomBytes } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import { NextResponse } from "next/server";
import { isAuthenticated, checkOrigin } from "../../../lib/auth";
export const runtime = "nodejs";
const fail=(error,status,headers={})=>NextResponse.json({error},{status,headers:{"cache-control":"no-store",...headers}});
// Fixed 60-second windows, 10 successful reservations per client IP.
// Each slot is a write-once Blob key. Concurrent requests compete for the same slots.
async function consumeQuota(request){
 const ip=ipAddress(request)||"unknown";
 const ipHash=createHash("sha256").update(ip).digest("hex");
 const minute=Math.floor(Date.now()/60000);
 for(let slot=0;slot<10;slot++){
  try{
   await put("rate-limit/"+minute+"/"+ipHash+"/"+slot+".txt","1",{
    access:"private",addRandomSuffix:false,allowOverwrite:false,ttlDays:1,
    contentType:"text/plain"
   });
   return {allowed:true};
  }catch(error){
   if(error?.name==="BlobAlreadyExistsError"||error?.code==="BLOB_ALREADY_EXISTS"||error?.message?.includes("already exists"))continue;
   console.error("Rate limit storage failure",error);
   return {allowed:false,unavailable:true};
  }
 }
 return {allowed:false,unavailable:false,retryAfter:60-Math.floor(Date.now()/1000)%60};
}
export async function POST(request){
 if(!checkOrigin(request))return fail("მოთხოვნის არასწორი წყარო",403);
 if(!(await isAuthenticated(request)))return fail("ავტორიზაცია აუცილებელია",401);
 let body;try{body=await request.json();}catch{return fail("არასწორი მოთხოვნა",400)}
 if(typeof body?.url!=="string"||body.url.length>2048)return fail("შეიყვანეთ სწორი ბმული",400);
 let target;try{target=new URL(body.url.trim());}catch{return fail("არასწორი URL",400)}
 const host=target.hostname.toLowerCase();
 if(!["http:","https:"].includes(target.protocol)||target.username||target.password||target.port||!(host==="isurve.ge"||host.endsWith(".isurve.ge")))return fail("ნებადართულია მხოლოდ isurve.ge-ის ბმულები",400);
 if(!process.env.BLOB_READ_WRITE_TOKEN)return fail("საცავი ჯერ არ არის დაკავშირებული",503);
 const quota=await consumeQuota(request);
 if(!quota.allowed)return quota.unavailable?fail("სერვისი დროებით მიუწვდომელია",503):fail("ლიმიტი ამოიწურა: მაქსიმუმ 10 ბმული წუთში",429,{"retry-after":String(quota.retryAfter)});
 for(let i=0;i<4;i++){
  const slug=randomBytes(6).toString("base64url");
  try{await put("links/"+slug+".txt",target.toString(),{access:"private",addRandomSuffix:false,contentType:"text/plain; charset=utf-8"});
   const shortUrl="https://isurve.link/"+slug;return NextResponse.json({shortUrl,slug},{headers:{"cache-control":"no-store"}});
  }catch(error){if(error?.code==="BLOB_ALREADY_EXISTS")continue;console.error("Link creation failure",error);return fail("ბმული ვერ შეიქმნა",500);}
 }
 return fail("სცადეთ თავიდან",503);
}
