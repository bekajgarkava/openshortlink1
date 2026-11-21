"use client";
import {useEffect,useState} from "react";
export default function SmsHistory(){
 const [items,setItems]=useState([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(nextOffset=0){
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/sms/history?offset="+nextOffset,{cache:"no-store"});
   const data=await r.json();if(!r.ok)throw Error(data.error||"ისტორია ვერ ჩაიტვირთა");
   setItems(prev=>nextOffset?prev.concat(data.records):data.records);
   setOffset(nextOffset+data.records.length);
   setMore(data.hasMore);
  }catch(e){setError(e.message);}finally{setLoading(false);}
 }
 useEffect(()=>{(async()=>{try{await fetch("/api/sms/history/cleanup",{method:"POST"});}catch{}await load();})();},[]);
 return <main className="shell"><div className="container">
  <header className="topbar"><a className="brand" href="/"><span className="brandmark">↗</span><span>ISURVE<small>SMS HISTORY</small></span></a><a className="sms-history-link" href="/">← უკან დაბრუნება</a></header>
  <section className="panel sms-history-page"><h1>SMS-ის ისტორია</h1>
   <div className="sms-history-table-wrap"><table className="sms-history-table"><thead><tr><th>ნომერი</th><th>SMS-ის ტექსტი</th><th>გაგზავნის თარიღი</th></tr></thead><tbody>{items.map((item,i)=><tr key={item.id+"-"+i}><td className="sms-number">{item.number}</td><td className="sms-body">{item.text}</td><td>{new Date(item.date).toLocaleString("ka-GE",{timeZone:"Asia/Tbilisi"})}</td></tr>)}</tbody></table></div>
   {!loading&&!items.length&&!error&&<p className="sms-empty">ისტორია ჯერ ცარიელია.</p>}
   {error&&<p role="alert" className="message">{error}</p>}
   {loading&&<p className="sms-empty">იტვირთება...</p>}
   {more&&!loading&&<button type="button" className="sms-secondary" onClick={()=>load(offset)}>მეტის ნახვა</button>}
  </section>
 </div></main>;
}
