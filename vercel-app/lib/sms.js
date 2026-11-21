import { randomUUID } from "node:crypto";
export const SMS_BATCH_SIZE=25;
export const SMS_MAX_RECIPIENTS=10000;
export function normalizePhones(input){
 if(typeof input!=="string"||input.length>350000)throw Error("ნომრების სია ძალიან დიდია");
 // Supports +995, 995, 0, and 9-digit local phones, including slashes/spaces/hyphens.
 const pattern=/(?:\+?995[\s/().-]*|0[\s/().-]*)?5(?:[\s/().-]*\d){8}/g;
 const matches=[...input.matchAll(pattern)];
 const found=[],invalid=[];
 let cursor=0;
 for(const m of matches){
  const before=input.slice(cursor,m.index).trim();
  if(before.replace(/[\s,;|/().+\-]+/g,"")) invalid.push(before.slice(0,48));
  const previous=m.index>0?input[m.index-1]:"";
  const next=input[m.index+m[0].length]||"";
  const digits=m[0].replace(/\D/g,"");
  let local=digits.startsWith("995")?digits.slice(3):digits.startsWith("0")?digits.slice(1):digits;
  if(/\d/.test(previous)||/\d/.test(next)||!/^[5]\d{8}$/.test(local))invalid.push(m[0].slice(0,48));
  else found.push("+995"+local);
  cursor=m.index+m[0].length;
 }
 const remaining=input.slice(cursor).trim();
 if(remaining.replace(/[\s,;|/().+\-]+/g,""))invalid.push(remaining.slice(0,48));
 const numbers=[...new Set(found)];
 return {numbers,totalFound:found.length,duplicates:found.length-numbers.length,invalid:invalid.slice(0,20),invalidCount:invalid.length};
}
export function assertMessage(message){
 if(typeof message!=="string"||!message.trim())throw Error("შეიყვანეთ SMS-ის ტექსტი");
 const length=Array.from(message).length;
 if(length>320)throw Error("SMS-ის ტექსტი 320 სიმბოლოს აჭარბებს");
 return {text:message,length,unicode:/[^\x00-\x7F]/.test(message)?1:0};
}
export function verifyNumbers(numbers){
 if(!Array.isArray(numbers)||numbers.length<1||numbers.length>SMS_MAX_RECIPIENTS||numbers.some(n=>typeof n!=="string"||!/^\+9955\d{8}$/.test(n))||new Set(numbers).size!==numbers.length)throw Error("არასწორი ნომრების სია");
 return numbers;
}
export function campaignId(){return randomUUID();}
export function redactProviderResponse(response){
 return (typeof response==="string"?response:JSON.stringify(response)).slice(0,200).replace(/\+?995\d{9}/g,"[number]");
}
export function isProviderAccepted(body,status){
 if(!status)return false;
 const plain=String(body).trim();
 if(!plain)return false;
 if(/^(error|failed|false|invalid|unauthorized|forbidden)/i.test(plain))return false;
 if(/^(-?\d{1,3})(?:\s|$)/.test(plain) && !/^0(?:\s|$)/.test(plain))return false;
 try{const obj=JSON.parse(plain);if(obj.success===false||obj.error||obj.status==="error"||obj.status===false)return false;}catch{}
 return true;
}
