import { NextResponse } from "next/server";
import { cookieName, cookieOptions } from "../../../lib/auth";
export async function POST() {
 const response=NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
 response.cookies.set(cookieName,"",{...cookieOptions,maxAge:0});
 return response;
}
