/* v2.4 account frontend. Auth is Supabase Auth; billing and plan limits are server-enforced. */
(()=>{'use strict';
const $=id=>document.getElementById(id);let client=null,me=null,config=null,records={farm:[],formulation:[]};
function status(message,error=false){const el=$('rw24Status');el.textContent=message;el.className='rw24-status'+(error?' rw24-error':'');}
function setText(id,text){const e=$(id);if(e)e.textContent=text;}
function showSigned(yes){$('rw24Login').hidden=yes;$('rw24Signed').hidden=!yes;$('rw24Features').hidden=!yes;}
async function token(){const {data,error}=await client.auth.getSession();if(error||!data?.session)throw Error('Please sign in again');return data.session.access_token;}
async function api(path,method='GET',data=undefined){
 const opts={method,headers:{Authorization:'Bearer '+await token()}};
 if(data!==undefined){opts.headers['content-type']='application/json';opts.body=JSON.stringify(data);}
 const res=await fetch('/api/'+path,opts);const body=await res.json().catch(()=>({error:'Invalid server response'}));if(!res.ok)throw Error(body.error||`HTTP ${res.status}`);return body;
}
async function refresh(){
 if(!client)return;const {data:{user}}=await client.auth.getUser();showSigned(!!user);if(!user){me=null;status('Sign in to save private farm profiles and formulation documents.');return;}
 try{me=await api('me');setText('rw24Who',me.email);setText('rw24Plan',`${me.plan.toUpperCase()} · billing ${me.billingStatus}`);await Promise.all([list('farm'),list('formulation')]);status('Your signed-in records are stored in your private account.');}
 catch(e){status(e.message,true);}
}
async function list(kind){const {rows}=await api('saves?kind='+kind);records[kind]=rows;const root=$(kind==='farm'?'rw24Farms':'rw24Formulas');root.replaceChildren();if(!rows.length){root.textContent='No saved records yet.';return;}
 for(const row of rows){const div=document.createElement('div');div.className='rw24-saved';const s=document.createElement('span');const rec=row.record||{};s.textContent=(rec.farmLabel||rec.stageId||rec.schema||'Saved record')+' · '+new Date(row.createdAt).toLocaleDateString();
 const download=document.createElement('button');download.type='button';download.textContent='Download JSON';download.onclick=()=>downloadRecord(row.record,`RationWise_${kind}_${row.id}.json`);
 const del=document.createElement('button');del.type='button';del.textContent='Delete';del.onclick=async()=>{if(!confirm('Delete this saved record?'))return;try{await api('saves?kind='+kind+'&id='+encodeURIComponent(row.id),'DELETE');await list(kind);status('Record deleted.');}catch(e){status(e.message,true);}};
 div.append(s,download,del);root.append(div);
 }
}
function downloadRecord(obj,name){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function saveFarm(){try{if(!window.RationWiseFarm?.get)throw Error('Farm editor unavailable');const record=window.RationWiseFarm.get();await api('saves?kind=farm','POST',{record});await list('farm');status('Farm profile securely saved.');}catch(e){status(e.message,true);}}
async function saveFormula(){try{const file=$('rw24FormulaFile').files?.[0];if(!file)throw Error('Choose a RationWise JSON formulation file first.');if(file.size>250000)throw Error('File must be smaller than 250 KB');const record=JSON.parse(await file.text());await api('saves?kind=formulation','POST',{record});await list('formulation');$('rw24FormulaFile').value='';status('Formulation JSON securely saved.');}catch(e){status(e.message,true);}}
async function signup(){const email=$('rw24Email').value.trim(),password=$('rw24Password').value;if(!email||password.length<12){status('Enter an email and a password with at least 12 characters.',true);return;}
 const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/#account'}});status(error?error.message:'Check your email and verify your account before logging in.',!!error);
}
async function signin(){const email=$('rw24Email').value.trim(),password=$('rw24Password').value;const {error}=await client.auth.signInWithPassword({email,password});$('rw24Password').value='';if(error)status(error.message,true);else await refresh();}
async function resetPassword(){const email=$('rw24Email').value.trim();if(!email)return status('Enter your email address first.',true);const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/#account'});status(error?error.message:'If the email is registered, a recovery link will be sent.',!!error);}
async function updatePassword(){const pass=prompt('Enter a NEW password of at least 12 characters (after following your email recovery link)');if(pass===null)return;if(pass.length<12)return status('Password must have at least 12 characters.',true);const {error}=await client.auth.updateUser({password:pass});status(error?error.message:'Password updated.',!!error);}
async function checkout(plan){try{if(!config.billingReady)throw Error('Checkout is not configured by the site owner.');if(config.billingMode==='live'&&!confirm('Continue to a secure Stripe checkout for a real paid subscription?'))return;const {url}=await api('checkout','POST',{plan});window.location.assign(url);}catch(e){status(e.message,true);}}
async function portal(){try{const {url}=await api('portal','POST',{});window.location.assign(url);}catch(e){status(e.message,true);}}
async function init(){
 const res=await fetch('/api/config',{cache:'no-store'});if(!res.ok)throw Error('Server API is not deployed. Publish the full v2.4 Pages Functions package, not just a standalone HTML file.');config=await res.json();if(!config.authReady)throw Error('Supabase is not configured by the site owner. The original calculators remain available.');
 if(!window.supabase?.createClient)throw Error('Supabase authentication library did not load. Check your internet connection or content restrictions.');
 client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 for(const [id,fn] of Object.entries({rw24Signup:signup,rw24Signin:signin,rw24Reset:resetPassword,rw24UpdatePassword:updatePassword,rw24SaveFarm:saveFarm,rw24SaveFormula:saveFormula,rw24Portal:portal}))$(id).addEventListener('click',fn);
 $('rw24Signout').addEventListener('click',async()=>{await client.auth.signOut();me=null;records={farm:[],formulation:[]};showSigned(false);status('Signed out.');});
 for(const button of document.querySelectorAll('[data-rw-plan]')){const p=button.dataset.rwPlan;button.disabled=!config.billingReady||!config.plans.includes(p);button.addEventListener('click',()=>checkout(p));}
 setText('rw24BillingMode',config.billingReady?`Stripe ${config.billingMode==='live'?'LIVE':'TEST'} checkout configured`:'Checkout awaits owner configuration');
 client.auth.onAuthStateChange((_event,_session)=>{setTimeout(()=>refresh().catch(e=>status(e.message,true)),0);});await refresh();
 if(new URLSearchParams(window.location.search).get('checkout')==='success')status('Checkout returned. Subscription access will appear after Stripe confirms it via webhook.');
}
showSigned(false);init().catch(e=>status(e.message,true));
})();
