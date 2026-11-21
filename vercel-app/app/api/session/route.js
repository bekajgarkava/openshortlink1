import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/auth";
export async function GET(request) {
 return NextResponse.json({authenticated:await isAuthenticated(request)},{headers:{"cache-control":"no-store"}});
}
