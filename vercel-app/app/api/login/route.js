import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import { NextResponse } from "next/server";
import { validCredentials, makeSession, cookieOptions, cookieName, checkOrigin } from "../../../lib/auth";
export const runtime="nodejs";
export async function POST(request) {
  if(!checkOrigin(request))return NextResponse.json({error:"მოთხოვნის არასწორი წყარო"},{status:403});
  const ip = ipAddress(request) || "unknown";
  const bucket = Math.floor(Date.now()/900000);
  const key = createHash("sha256").update(ip).digest("hex");
  // Permit up to 50 login attempts per IP per 15 minutes for shared office networks.
  // Blob write-once reservations also work across separate Vercel instances.
  if(!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({error:"სერვისი დროებით მიუწვდომელია"},{status:503});
  let reserved=false;
  for(let i=0;i<50;i++) {
    try {
      await put("login-limit/v2/"+bucket+"/"+key+"/"+i+".txt","1",{access:"private",addRandomSuffix:false,allowOverwrite:false,ttlDays:1,contentType:"text/plain"});
      reserved=true;break;
    } catch(error) {
      if(error?.name==="BlobAlreadyExistsError"||error?.code==="BLOB_ALREADY_EXISTS"||error?.message?.includes("already exists")) continue;
      console.error("Login rate limit unavailable",error);
      return NextResponse.json({error:"სერვისი დროებით მიუწვდომელია"},{status:503});
    }
  }
  if(!reserved) return NextResponse.json({error:"ბევრი მცდელობა. სცადეთ მოგვიანებით."},{status:429,headers:{"retry-after":String(900-Math.floor(Date.now()/1000)%900)}});
  let body; try {body=await request.json();} catch {return NextResponse.json({error:"არასწორი მოთხოვნა"},{status:400});}
  if(!validCredentials(body?.username,body?.password)) return NextResponse.json({error:"არასწორი მომხმარებელი ან პაროლი"},{status:401,headers:{"cache-control":"no-store"}});
  const response=NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
  response.cookies.set(cookieName,makeSession(),cookieOptions);
  return response;
}
