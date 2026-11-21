import { NextResponse } from "next/server";
import { cookieName, cookieOptions, revokeSession, checkOrigin } from "../../../lib/auth";
export async function POST(request) {
 if(!checkOrigin(request))return NextResponse.json({error:"მოთხოვნის არასწორი წყარო"},{status:403});
 if(!(await revokeSession(request)))return NextResponse.json({error:"სესიის გაუქმება ვერ შესრულდა"},{status:503});
 const response=NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
 response.cookies.set(cookieName,"",{...cookieOptions,maxAge:0});
 return response;
}
