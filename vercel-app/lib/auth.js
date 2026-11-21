import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
const COOKIE = "isurve_admin_session";
const MAX_AGE = 60 * 60 * 24 * 7;
function sig(value) {
  const secret = process.env.SHORTENER_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function validCredentials(username,password) {
  const stored = process.env.SHORTENER_PASSWORD_SCRYPT || "";
  const [salt, expected] = stored.split(":");
  if (!salt || !expected || typeof password !== "string" || password.length > 256 || typeof username !== "string") return false;
  const expectedBytes = Buffer.from(expected,"hex");
  if (expectedBytes.length !== 64) return false;
  const derived = scryptSync(password,Buffer.from(salt,"hex"),64);
  const userGood = username === process.env.SHORTENER_ADMIN_USER;
  return timingSafeEqual(expectedBytes,derived) && userGood;
}
export function makeSession() {
  const expiry = String(Math.floor(Date.now()/1000) + MAX_AGE);
  return expiry+"."+sig(expiry);
}
export function isAuthenticated(request) {
  const cookie = request.cookies?.get(COOKIE)?.value;
  if (!cookie || !process.env.SHORTENER_SESSION_SECRET) return false;
  const [expiry, signature, extra] = cookie.split(".");
  if (!expiry || !signature || extra || !/^\d{10,12}$/.test(expiry)) return false;
  if (Number(expiry) <= Math.floor(Date.now()/1000)) return false;
  const expected = sig(expiry);
  if (!expected || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(expected,"hex"));
}
export const cookieOptions = {httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:MAX_AGE};
export const cookieName = COOKIE;
