import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import './style.css';

const SUPABASE_URL = 'https://eexhnynncmsnpmmzwmeo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JqujEHHPpUqAkhqsdY1bzA_kWS-fak7';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app=document.querySelector('#app');

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(d){return d?new Date(d).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}):'-'}
function today(){return new Date().toISOString().slice(0,10)}

async function getProfile(){
 const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const {data}=await supabase.from('profiles').select('*').eq('id',user.id).single(); return data;
}

async function login(){
 app.innerHTML=`<main class="auth"><section class="card"><h1>📋 Absensi Karyawan</h1><p>Masuk untuk melakukan absensi.</p>
 <input id="email" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Password">
 <button id="login">Masuk</button><div id="msg"></div></section></main>`;
 document.querySelector('#login').onclick=async()=>{
  const email=document.querySelector('#email').value.trim(), password=document.querySelector('#pw').value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  document.querySelector('#msg').textContent=error?error.message:'Berhasil masuk...'; if(!error)render();
 };
}

async function render(){
 const p=await getProfile(); if(!p){login();return}
 if(p.role==='HRD') return hrd(p); return employee(p);
}

async function employee(p){
 const {data:rows}=await supabase.from('attendance').select('*').eq('user_id',p.id).order('attendance_date',{ascending:false}).limit(30);
 const r=rows||[], t=today(), rec=r.find(x=>x.attendance_date===t);
 app.innerHTML=`<main><header><div><b>Absensi Karyawan</b><small>${esc(p.full_name)}${p.nik?' · NIK '+esc(p.nik):''}</small></div><button class="ghost" id="out">Keluar</button></header>
 <section class="card hero"><h2>${rec?'Absensi hari ini':'Siap absen hari ini?'}</h2><p>${t}</p>
 <div class="actions">${!rec?'<button id="in">🟢 Absen Masuk</button>':rec&&!rec.check_out?'<button id="outabs">🔴 Absen Pulang</button>':'<span class="ok">✓ Absensi hari ini lengkap</span>'}</div>
 <div class="info"><span>Status<br><b>${rec?.status||'Belum Absen'}</b></span><span>Masuk<br><b>${rec?.check_in?fmt(rec.check_in):'-'}</b></span><span>Pulang<br><b>${rec?.check_out?fmt(rec.check_out):'-'}</b></span></div></section>
 <section class="card"><h3>Riwayat Absensi</h3><div class="table">${r.map(x=>`<div class="row"><span>${x.attendance_date}</span><span>${x.status}</span><span>${x.check_in?new Date(x.check_in).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-'} / ${x.check_out?new Date(x.check_out).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-'}</span></div>`).join('')||'<p>Belum ada data.</p>'}</div></section></main>`;
 document.querySelector('#out').onclick=()=>supabase.auth.signOut().then(render);
 const ins=document.querySelector('#in'), outs=document.querySelector('#outabs');
 if(ins)ins.onclick=()=>absen(p,'in'); if(outs)outs.onclick=()=>absen(p,'out');
}

async function absen(p,type){
 const t=today();
 if(type==='in'){
  const now=new Date().toISOString();
  const {error}=await supabase.from('attendance').insert({user_id:p.id,attendance_date:t,check_in:now,status:'HADIR'});
  if(error)alert(error.message);
 } else {
  const {error}=await supabase.from('attendance').update({check_out:new Date().toISOString()}).eq('user_id',p.id).eq('attendance_date',t);
  if(error)alert(error.message);
 }
 render();
}

async function hrd(p){
 const {data:rows}=await supabase.from('attendance').select('attendance_date,check_in,check_out,status,notes,user_id,profiles!inner(nik,full_name)').order('attendance_date',{ascending:false}).limit(1000);
 const data=rows||[];
 app.innerHTML=`<main><header><div><b>Dashboard HRD</b><small>${esc(p.full_name)}</small></div><button class="ghost" id="out">Keluar</button></header>
 <section class="stats"><div><b>${data.length}</b><span>Total data</span></div><div><b>${data.filter(x=>x.status==='HADIR').length}</b><span>Hadir</span></div><div><b>${data.filter(x=>x.status==='TERLAMBAT').length}</b><span>Terlambat</span></div></section>
 <section class="card"><div class="bar"><h3>Rekap Absensi</h3><button id="xls">⬇ Export Excel</button></div>
 <div class="table"><div class="row head"><span>Tanggal</span><span>NIK / Nama</span><span>Masuk / Pulang</span><span>Status</span></div>
 ${data.map(x=>`<div class="row"><span>${x.attendance_date}</span><span>${esc(x.profiles?.nik||'-')}<br>${esc(x.profiles?.full_name||'-')}</span><span>${x.check_in?fmt(x.check_in):'-'}<br>${x.check_out?fmt(x.check_out):'-'}</span><span>${x.status}</span></div>`).join('')||'<p>Belum ada data absensi.</p>'}</div></section></main>`;
 document.querySelector('#out').onclick=()=>supabase.auth.signOut().then(render);
 document.querySelector('#xls').onclick=()=>exportXls(data);
}
function exportXls(data){
 const rows=data.map(x=>({Tanggal:x.attendance_date,NIK:x.profiles?.nik||'',Nama:x.profiles?.full_name||'',Jam_Masuk:x.check_in?fmt(x.check_in):'',Jam_Pulang:x.check_out?fmt(x.check_out):'',Status:x.status,Keterangan:x.notes||''}));
 const ws=XLSX.utils.json_to_sheet(rows), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Rekap'); XLSX.writeFile(wb,`Rekap_Absensi_${today().slice(0,7)}.xlsx`);
}
supabase.auth.onAuthStateChange(()=>setTimeout(render,0)); render();
