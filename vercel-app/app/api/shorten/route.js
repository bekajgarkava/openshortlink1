import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
const fail=(error,status)=>NextResponse.json({error},{status,headers:{"cache-control":"no-store"}});
export async function POST(request){
 let body;try{body=await request.json();}catch{return fail("არასწორი მოთხოვნა",400)}
 if(typeof body?.url!=="string"||body.url.length>2048)return fail("შეიყვანეთ სწორი ბმული",400);
 let target;try{target=new URL(body.url.trim());}catch{return fail("არასწორი URL",400)}
 const host=target.hostname.toLowerCase();
 if(!["http:","https:"].includes(target.protocol)||target.username||target.password||target.port||!(host==="isurve.ge"||host.endsWith(".isurve.ge")))return fail("ნებადართულია მხოლოდ isurve.ge-ის ბმულები",400);
 if(!process.env.BLOB_READ_WRITE_TOKEN)return fail("საცავი ჯერ არ არის დაკავშირებული",503);
 for(let i=0;i<4;i++){
  const slug=randomBytes(6).toString("base64url");
  try{await put("links/"+slug+".txt",target.toString(),{access:"private",addRandomSuffix:false,contentType:"text/plain; charset=utf-8"});
   const shortUrl=new URL("/"+slug,request.url).toString();return NextResponse.json({shortUrl,slug},{headers:{"cache-control":"no-store"}});
  }catch(error){if(error?.code==="BLOB_ALREADY_EXISTS")continue;console.error("Link creation failure",error);return fail("ბმული ვერ შეიქმნა",500);}
 }
 return fail("სცადეთ თავიდან",503);
}
