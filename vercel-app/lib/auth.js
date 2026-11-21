import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";
const COOKIE = "isurve_admin_session";
const MAX_AGE = 60 * 60 * 24 * 30;
function signature(value) {
 const secret=process.env.SHORTENER_SESSION_SECRET;
 return secret?createHmac("sha256",secret).update(value).digest("hex"):null;
}
export function checkOrigin(request) {
 const origin=request.headers.get("origin");
 if(!origin) return false;
 try {const incoming=new URL(origin);const endpoint=new URL(request.url);
  return incoming.protocol==="https:" && incoming.host===endpoint.host;
 } catch {return false;}
}
export function validCredentials(username,password) {
 const [salt,expected]=(process.env.SHORTENER_PASSWORD_SCRYPT||"").split(":");
 if(typeof username!=="string"||typeof password!=="string"||password.length>256||!salt||!expected)return false;
 const expectedBytes=Buffer.from(expected,"hex");
 if(expectedBytes.length!==64)return false;
 const derived=scryptSync(password,Buffer.from(salt,"hex"),64);
 return timingSafeEqual(expectedBytes,derived)&&username===process.env.SHORTENER_ADMIN_USER;
}
export function makeSession() {
 const expires=String(Math.floor(Date.now()/1000)+MAX_AGE);
 const nonce=randomBytes(24).toString("hex");
 const payload=expires+"."+nonce;
 return payload+"."+signature(payload);
}
function parseSession(request) {
 const token=request.cookies?.get(COOKIE)?.value;
 if(!token||!process.env.SHORTENER_SESSION_SECRET)return null;
 const [expires,nonce,provided,extra]=token.split(".");
 if(extra!==undefined||!/^\d{10,12}$/.test(expires||"")|| !/^[a-f0-9]{48}$/.test(nonce||"")|| !/^[a-f0-9]{64}$/.test(provided||""))return null;
 if(Number(expires)<=Math.floor(Date.now()/1000))return null;
 const expected=signature(expires+"."+nonce);
 if(!expected||!timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(provided,"hex")))return null;
 return {expires,nonce};
}
function revocationPath(nonce){return "sessions/revoked/"+nonce+".txt";}
export async function isAuthenticated(request) {
 const session=parseSession(request);
 if(!session||!process.env.BLOB_READ_WRITE_TOKEN)return false;
 try {return !(await get(revocationPath(session.nonce),{access:"private"}));}
 catch(error){console.error("Session verification error",error);return false;}
}
export async function revokeSession(request) {
 const session=parseSession(request);
 if(!session||!process.env.BLOB_READ_WRITE_TOKEN)return false;
 try {
  await put(revocationPath(session.nonce),"revoked",{access:"private",addRandomSuffix:false,allowOverwrite:true,ttlDays:31,contentType:"text/plain"});
  return true;
 }catch(error){console.error("Session revocation error",error);return false;}
}
export const cookieOptions={httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:MAX_AGE};
export const cookieName=COOKIE;
