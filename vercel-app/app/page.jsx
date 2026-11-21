"use client";
import { useEffect, useState } from "react";
function Icon({name,size=20}) {
 const attrs={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true};
 if(name==="eye")return <svg {...attrs}><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
 if(name==="eye-off")return <svg {...attrs}><path d="M3 3l18 18M10.6 5.1A11.2 11.2 0 0 1 12 5c6.3 0 10 7 10 7a15.9 15.9 0 0 1-3.1 3.9M6.3 6.4C3.5 8.1 2 12 2 12s3.7 7 10 7c1.6 0 3-.4 4.3-1.1"/><path d="M10 10a3 3 0 0 0 4 4"/></svg>;
 if(name==="copy")return <svg {...attrs}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>;
 if(name==="check")return <svg {...attrs}><path d="m5 12 4 4L19 6"/></svg>;
 if(name==="link")return <svg {...attrs}><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"/></svg>;
 if(name==="shield")return <svg {...attrs}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
 if(name==="bolt")return <svg {...attrs}><path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/></svg>;
 return <svg {...attrs}><path d="M4 7h16v10H4z"/><path d="m4 10 8 5 8-5"/></svg>;
}
export default function Home(){
 const [authenticated,setAuthenticated]=useState(null),[username,setUsername]=useState(""),[password,setPassword]=useState(""),[showPassword,setShowPassword]=useState(false);
 const [url,setUrl]=useState(""),[result,setResult]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const [tab,setTab]=useState("links"),[phones,setPhones]=useState(""),[smsText,setSmsText]=useState(""),[consent,setConsent]=useState(false);
 const [preview,setPreview]=useState(null),[smsBusy,setSmsBusy]=useState(false),[campaign,setCampaign]=useState(null),[history,setHistory]=useState([]),[smsInfo,setSmsInfo]=useState("");
 const [smsError,setSmsError]=useState("");
 useEffect(()=>{fetch("/api/session",{cache:"no-store"}).then(r=>r.json()).then(d=>setAuthenticated(!!d.authenticated)).catch(()=>setAuthenticated(false));},[]);
 async function login(e){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||"შეცდომა");setAuthenticated(true);setPassword("");}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function logout(){try{const r=await fetch("/api/logout",{method:"POST"});if(!r.ok)throw new Error("გასვლა ვერ შესრულდა");setAuthenticated(false);setResult("");setError("");}catch(e){setError(e.message);}}
 async function submit(e){e.preventDefault();setBusy(true);setError("");setResult("");setCopied(false);try{const r=await fetch("/api/shorten",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url})});const d=await r.json();if(r.status===401){setAuthenticated(false);throw new Error("გთხოვთ თავიდან შეხვიდეთ");}if(!r.ok)throw new Error(d.error||"შეცდომა");setResult(d.shortUrl);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(result);setCopied(true);}catch{setError("კოპირება ვერ მოხერხდა");}}
 async function loadHistory(){
  try{const r=await fetch("/api/sms/campaigns",{cache:"no-store"});if(r.ok){const d=await r.json();setHistory(d.items||[]);}}catch{}
 }
 async function validateSms(){
  setSmsError("");setSmsInfo("");setPreview(null);
  const r=await fetch("/api/sms/validate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({numbers:phones,text:smsText})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||"შემოწმება ვერ შესრულდა");
  setPreview(d);return d;
 }
 async function readCampaign(id){
  const r=await fetch("/api/sms/campaigns/"+id,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"ისტორია ვერ ჩაიტვირთა");
  setCampaign(d);return d;
 }
 async function dispatchCampaign(id,initial){
  setSmsBusy(true);setSmsError("");
  try{
   const current=initial||await readCampaign(id);
   for(let i=0;i<current.batches;i++){
    if(current.completed.includes(i))continue;
    if(current.blocked.includes(i))throw new Error("ერთი ან მეტი ჯგუფის სტატუსი გაურკვეველია. ავტომატური ხელახალი გაგზავნა დაბლოკილია.");
    const r=await fetch("/api/sms/campaigns/"+id+"/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({batchIndex:i})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"ჯგუფის გაგზავნა შეჩერდა");
    setCampaign(prev=>({...prev,completeBatches:i+1,attempted:(prev?.attempted||0)+(data.attempted||0),uncertain:(prev?.uncertain||0)+(data.uncertain||0),rejected:(prev?.rejected||0)+(data.rejected||0),completed:[...(prev?.completed||[]),i]}));
   }
   await readCampaign(id);await loadHistory();
   setSmsInfo("კამპანიის ყველა ჯგუფის დამუშავება დასრულდა. საბოლოო მიწოდება პროვაიდერის სტატუსით უნდა შემოწმდეს.");
  }catch(e){setSmsError(e.message);try{await readCampaign(id)}catch{}}
  finally{setSmsBusy(false);}
 }
 async function createSms(e){
  e.preventDefault();if(smsBusy)return;
  setSmsError("");setSmsInfo("");
  try{
   const checked=await validateSms();
   if(!checked.count)throw new Error("ნომრები არ არის");
   if(checked.invalidCount)throw new Error("აღმოჩენილია "+checked.invalidCount+" არასწორი ნომერი. ჯერ გაასწორეთ.");
   if(!consent)throw new Error("დაადასტურეთ, რომ მიმღებებს SMS-ის მიღებაზე თანხმობა აქვთ.");
   if(!window.confirm("გსურთ SMS კამპანიის გაგზავნა "+checked.count+" ნომერზე? რეალური SMS-ები შეიძლება იყოს ფასიანი."))return;
   setSmsBusy(true);
   const r=await fetch("/api/sms/campaigns",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({numbers:phones,text:smsText,consent:true,confirmed:true})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"კამპანია ვერ შეიქმნა");
   const state=await readCampaign(data.id);await loadHistory();
   await dispatchCampaign(data.id,state);
  }catch(e){setSmsError(e.message);setSmsBusy(false);}
 }
 async function resumeCampaign(id){
  if(smsBusy)return;
  try{const state=await readCampaign(id);await dispatchCampaign(id,state);}catch(e){setSmsError(e.message);}
 }

 return <main className="shell"><div className="container">
   <header className="topbar"><a href="https://isurve.ge" className="brand"><span className="brandmark"><Icon name="link" size={23}/></span><span>ISURVE<small>LINK SHORTENER</small></span></a>{authenticated===true&&<button className="exit" type="button" onClick={logout}>გასვლა</button>}</header>
   <div className="main-grid">
    <section className="panel form-panel">
     <div className="eyebrow"><Icon name="link" size={14}/> ISURVE.LINK</div>
     
     {authenticated===null?<p>იტვირთება...</p>:authenticated?<>
      <form onSubmit={submit}><label className="field-label" htmlFor="longUrl">შეიყვანე ბმული</label><div className="field-group"><input id="longUrl" aria-label="ბმული" className="field" type="url" required placeholder="https://isurve.ge/products/..." value={url} onChange={e=>setUrl(e.target.value)}/></div><button className="primary" type="submit" disabled={busy}><Icon name="link"/>{busy?"მუშავდება...":"ბმულის შემოკლება"}</button></form>
      {result&&<div className="result"><div className="result-title">შექმნილი მოკლე ბმული</div><a className="result-link" href={result} target="_blank" rel="noreferrer">{result}</a><button className="copy" type="button" onClick={copy}><Icon name={copied?"check":"copy"}/>{copied?"დაკოპირებულია":"კოპირება"}</button></div>}
     </>:<div className="sms-workspace">
      <form onSubmit={createSms}>
       <label htmlFor="smsNumbers" className="field-label">მიმღებების ნომრები (მაქსიმუმ 10 000)</label>
       <textarea id="smsNumbers" className="field sms-phones" value={phones} onChange={e=>{setPhones(e.target.value);setPreview(null);}} placeholder={"+995 555123456\n555 234 567\n995 555/345/678"} required />
       <p className="sms-help">ნომრები შეგიძლიათ ჩაწეროთ სლეშებით, სივრცეებით, დეფისებით ან მათ გარეშე; სისტემა ავტომატურად გადააქცევს ფორმატში +995 555123456. დუბლირებული ნომრები გამოირიცხება.</p>
       <label htmlFor="smsText" className="field-label">SMS-ის ტექსტი</label>
       <textarea id="smsText" className="field sms-message" value={smsText} onChange={e=>{setSmsText(e.target.value);setPreview(null);}} required placeholder="შეიყვანეთ SMS-ის ტექსტი..." />
       <div className="sms-counter">{[...smsText].length} / 320 სიმბოლო</div>
       <label className="sms-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> ვადასტურებ, რომ მიმღებებს SMS-ის მიღებაზე შესაბამისი თანხმობა აქვთ.</label>
       <button type="button" className="sms-secondary" onClick={async()=>{try{await validateSms()}catch(e){setSmsError(e.message)}}} disabled={smsBusy}>ნომრების შემოწმება</button>
       {preview&&<div className="sms-preview"><strong>{preview.count} უნიკალური ნომერი</strong><div>დუბლიკატი: {preview.duplicates} · არასწორი: {preview.invalidCount} · ჯგუფი: {preview.batches}</div>{preview.invalidCount>0&&<div className="message">ნაპოვნია არასწორი ნომრები: {preview.invalidExamples.join(", ")}</div>}</div>}
       <button className="primary" type="submit" disabled={smsBusy||[...smsText].length>320||!smsText.trim()||!phones.trim()||!consent}>{smsBusy?"იგზავნება...":"SMS-ის გაგზავნა"}</button>
      </form>
      {campaign&&<div className="sms-progress"><strong>კამპანია: {campaign.recipientCount} მიმღები</strong><div>დამუშავებული ჯგუფები: {campaign.completeBatches} / {campaign.batches}</div><div>პროვაიდერთან მიმართვები: {campaign.attempted} · უარყოფილი: {campaign.rejected} · დაუზუსტებელი: {campaign.uncertain}</div>{!smsBusy&&campaign.status!=="finished"&&<button type="button" className="sms-secondary" onClick={()=>resumeCampaign(campaign.id)}>გაგრძელება</button>}</div>}
      {smsError&&<p className="message" role="alert">{smsError}</p>}
      {smsInfo&&<p className="sms-note">{smsInfo}</p>}
      <section className="sms-history"><h3>გაგზავნების ისტორია</h3>{!history.length?<p>ისტორია ჯერ ცარიელია.</p>:history.map(item=><button type="button" key={item.id} className="sms-history-item" onClick={async()=>{try{await readCampaign(item.id)}catch(e){setSmsError(e.message)}}}><span>{new Date(item.createdAt).toLocaleString("ka-GE")}</span><strong>{item.recipientCount} ნომერი · {item.processedBatches}/{item.batches} ჯგუფი</strong><small>{item.text.slice(0,85)}</small></button>)}</section>
     </div>}
     </>:<form onSubmit={login}>
      <div className="field-group"><label className="field-label" htmlFor="username">მომხმარებელი</label><input className="field" id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required/></div>
      <div className="field-group"><label className="field-label" htmlFor="password">პაროლი</label><div className="password-wrap"><input className="field" id="password" type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="eye" type="button" onClick={()=>setShowPassword(x=>!x)} aria-label={showPassword?"პაროლის დამალვა":"პაროლის ჩვენება"} title={showPassword?"დამალვა":"ჩვენება"}><Icon name={showPassword?"eye-off":"eye"}/></button></div></div>
      <button className="primary" type="submit" disabled={busy}>{busy?"მუშავდება...":"შესვლა"}</button>
     </form>}
     {error&&<p role="alert" className="message">{error}</p>}
    </section>
    <section className="panel visual" aria-label="ISURVE ბრენდული ილუსტრაცია"></section>
   </div>
   <footer className="footer">© 2017–2026 <a href="https://isurve.ge" target="_blank" rel="noreferrer">ISURVE.GE</a> · ყველა უფლება დაცულია</footer>
 </div></main>;
}
