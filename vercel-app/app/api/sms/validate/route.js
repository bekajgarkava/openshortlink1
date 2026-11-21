import { NextResponse } from "next/server";
import { isAuthenticated, checkOrigin } from "../../../../lib/auth";
import { normalizePhones, assertMessage, SMS_MAX_RECIPIENTS, SMS_BATCH_SIZE } from "../../../../lib/sms";
export const runtime="nodejs";
export async function POST(request){
 if(!checkOrigin(request))return NextResponse.json({error:"არასწორი წყარო"},{status:403});
 if(!(await isAuthenticated(request)))return NextResponse.json({error:"ავტორიზაცია აუცილებელია"},{status:401});
 try{
  const body=await request.json();
  const result=normalizePhones(body.numbers);
  const msg=assertMessage(body.text);
  if(result.numbers.length>SMS_MAX_RECIPIENTS)throw Error("დასაშვებია მაქსიმუმ 10 000 ნომერი");
  return NextResponse.json({count:result.numbers.length,duplicates:result.duplicates,invalidCount:result.invalidCount,invalidExamples:result.invalid,totalFound:result.totalFound,textLength:msg.length,unicode:msg.unicode,batches:Math.ceil(result.numbers.length/SMS_BATCH_SIZE)},{headers:{"cache-control":"no-store"}});
 }catch(error){return NextResponse.json({error:error.message||"შეცდომა"},{status:400});}
}
