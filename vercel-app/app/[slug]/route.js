import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function GET(_request,{params}){
 const {slug}=await params;
 if(!/^[A-Za-z0-9_-]{8}$/.test(slug))return new Response("Not found",{status:404});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return new Response("Unavailable",{status:503});
 let blob;try{blob=await get("links/"+slug+".txt",{access:"private"});}catch(error){console.error("Link lookup failure",error);return new Response("Unavailable",{status:503});}
 if(!blob)return new Response("Not found",{status:404});
 const target=await new Response(blob.stream).text();
 let url;try{url=new URL(target);}catch{return new Response("Invalid target",{status:500});}
 const host=url.hostname.toLowerCase();if(!["http:","https:"].includes(url.protocol)||!(host==="isurve.ge"||host.endsWith(".isurve.ge")))return new Response("Invalid target",{status:500});
 return NextResponse.redirect(url,302,{headers:{"cache-control":"public, max-age=60"}});
}
