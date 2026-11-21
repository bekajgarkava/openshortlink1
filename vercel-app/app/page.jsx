"use client";
import { useEffect, useState } from "react";
const inputStyle={width:"100%",boxSizing:"border-box",padding:15,fontSize:16,border:"1px solid #ccd3df",borderRadius:10};
const btnStyle={marginTop:14,padding:"12px 22px",border:0,borderRadius:10,background:"#14213d",color:"white",fontSize:16,cursor:"pointer"};
export default function Home() {
 const [authenticated,setAuthenticated]=useState(null);
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [url,setUrl]=useState("");
 const [result,setResult]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/session",{cache:"no-store"}).then(r=>r.json()).then(d=>setAuthenticated(!!d.authenticated)).catch(()=>setAuthenticated(false));},[]);
 async function login(e) {
  e.preventDefault();setBusy(true);setError("");
  try {const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||"შეცდომა");setAuthenticated(true);setPassword("");}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function logout() {await fetch("/api/logout",{method:"POST"});setAuthenticated(false);setResult("");setError("");}
 async function submit(e) {
  e.preventDefault();setBusy(true);setError("");setResult("");
  try {const r=await fetch("/api/shorten",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url})});const data=await r.json();if(r.status===401){setAuthenticated(false);throw new Error("გთხოვთ თავიდან შეხვიდეთ");}if(!r.ok)throw new Error(data.error||"შეცდომა");setResult(data.shortUrl);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <main style={{maxWidth:620,margin:"12vh auto",padding:24}}><section style={{background:"white",padding:32,borderRadius:20,boxShadow:"0 8px 30px #14213d15"}}>
  <h1 style={{marginTop:0}}>ISURVE Link Shortener</h1>
  {authenticated===null?<p>იტვირთება...</p>:authenticated?
   <><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><button onClick={logout} style={{padding:9,cursor:"pointer"}}>გასვლა</button></div>
   <form onSubmit={submit}><input aria-label="ბმული" type="url" required placeholder="https://isurve.ge/products/..." value={url} onChange={e=>setUrl(e.target.value)} style={inputStyle}/><button disabled={busy} style={btnStyle}>{busy?"მუშავდება...":"შემოკლება"}</button></form>
   {result&&<div style={{marginTop:22,overflowWrap:"anywhere",display:"flex",flexDirection:"column",gap:12}}><a href={result} target="_blank" rel="noreferrer" style={{fontSize:16,wordBreak:"break-all"}}>{result}</a><button type="button" onClick={()=>navigator.clipboard.writeText(result)} style={{...btnStyle,marginTop:0,width:"100%",minHeight:52,fontWeight:600,touchAction:"manipulation"}}>კოპირება</button></div>}
   </>:
   <form onSubmit={login}><p>ადმინისტრატორის შესვლა</p><label htmlFor="username">მომხმარებელი</label><input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required style={{...inputStyle,margin:"8px 0 16px"}}/><label htmlFor="password">პაროლი</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required style={{...inputStyle,marginTop:8}}/><button disabled={busy} style={btnStyle}>{busy?"მუშავდება...":"შესვლა"}</button></form>}
  {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
 </section></main>;
}
