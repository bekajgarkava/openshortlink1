"use client";
import {useEffect,useState} from "react";
const paginationButton={display:"inline-flex",flex:"0 0 auto",alignItems:"center",justifyContent:"center",width:36,height:36,minWidth:36,minHeight:36,padding:0,margin:0,border:"1px solid #d7e1ef",borderRadius:8,background:"#fff",color:"#28509a",fontSize:14,fontWeight:700,lineHeight:1};
export default function SmsHistory(){
 const [items,setItems]=useState([]),[page,setPage]=useState(1),[lastKnown,setLastKnown]=useState(1),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError("");setItems([]);
  (async()=>{
   try{
    const r=await fetch("/api/sms/history?page="+page,{cache:"no-store",signal:controller.signal});
    const data=await r.json();if(!r.ok)throw Error(data.error||"ისტორია ვერ ჩაიტვირთა");
    if(controller.signal.aborted)return;
    setItems(data.records);setMore(data.hasMore);
    setLastKnown(prev=>data.hasMore?Math.max(prev,page+1):Math.min(prev,page));
   }catch(e){if(!controller.signal.aborted)setError(e.message);}
   finally{if(!controller.signal.aborted)setLoading(false);}
  })();
  return ()=>controller.abort();
 },[page]);
 const pages=Array.from({length:Math.min(lastKnown,7)},(_,i)=>Math.max(1,Math.min(page-3,lastKnown-6))+i);
 const go=n=>{if(!loading&&n>=1&&n<=lastKnown&&n!==page){setLoading(true);setPage(n);}};
 return <main className="shell"><div className="container">
  <header className="topbar"><a className="brand" href="/"><span className="brandmark">↗</span><span>ISURVE<small>TOOLS</small></span></a><a className="sms-history-link" href="/">← უკან დაბრუნება</a></header>
  <section className="panel sms-history-page"><h1>SMS-ის ისტორია</h1>
   <div className="sms-history-table-wrap"><table className="sms-history-table"><thead><tr><th>ნომერი</th><th>SMS-ის ტექსტი</th><th>გაგზავნის თარიღი</th></tr></thead><tbody>{items.map((item,i)=><tr key={item.id+"-"+i}><td className="sms-number">{item.number}</td><td className="sms-body">{item.text}</td><td>{new Date(item.date).toLocaleString("ka-GE",{timeZone:"Asia/Tbilisi"})}</td></tr>)}</tbody></table></div>
   {!loading&&!items.length&&!error&&<p className="sms-empty">ისტორია ჯერ ცარიელია.</p>}
   {error&&<p role="alert" className="message">{error}</p>}
   {loading&&<p className="sms-empty">იტვირთება...</p>}
   {(lastKnown>1||page>1)&&<nav aria-label="ისტორიის გვერდები" style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",alignItems:"center",marginTop:24}}>
    <button type="button" style={paginationButton} aria-label="წინა გვერდი" disabled={loading||page===1} onClick={()=>go(page-1)}>‹</button>
    {pages[0]>1&&<button type="button" style={paginationButton} disabled={loading} onClick={()=>go(1)}>1</button>}
    {pages[0]>2&&<span style={{padding:"0 2px",color:"#64748b"}}>…</span>}
    {pages.map(n=><button key={n} type="button" style={{...paginationButton,...(n===page?{background:"#2563eb",borderColor:"#2563eb",color:"white",opacity:1}:null)}} aria-current={n===page?"page":undefined} aria-label={"გვერდი "+n} disabled={loading||n===page} onClick={()=>go(n)}>{n}</button>)}
    <button type="button" style={paginationButton} aria-label="შემდეგი გვერდი" disabled={loading||(!more&&page>=lastKnown)} onClick={()=>go(page+1)}>›</button>
   </nav>}
  </section>
 </div></main>;
}
