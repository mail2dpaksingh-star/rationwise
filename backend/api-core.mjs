/* RationWise v2.4: Cloudflare Pages Functions server-side account/billing API.
   No API keys should be committed or served by the static site. */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
export function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});}
const knownPlans={farmer_monthly:'STRIPE_PRICE_FARMER_MONTHLY',farmer_annual:'STRIPE_PRICE_FARMER_ANNUAL',professional_monthly:'STRIPE_PRICE_PRO_MONTHLY',feedmill_monthly:'STRIPE_PRICE_FEEDMILL_MONTHLY'};
export function isPaid(subscription){return !!subscription && ['active','trialing'].includes(subscription.subscription_status) && (!!subscription.current_period_end && Date.parse(subscription.current_period_end)>Date.now());}
export function tier(subscription){if(!isPaid(subscription))return 'free';const p=String(subscription.plan||'');if(p==='professional_monthly')return 'professional';if(p==='feedmill_monthly')return 'feedmill';return 'farmer';}
export function limits(subscription){return ({free:{farm:1,formulation:2},farmer:{farm:20,formulation:100},professional:{farm:200,formulation:1000},feedmill:{farm:1000,formulation:5000}})[tier(subscription)];}
const safeUrl=s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
function scrub(s){return String(s||'').replace(/\/+$/,'');}
export function configured(env){return {auth:!!(safeUrl(env.SUPABASE_URL)&&env.SUPABASE_PUBLISHABLE_KEY),billing:!!(env.BILLING_ENABLED==='true'&&env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&safeUrl(env.SITE_URL)&&Object.values(knownPlans).some(k=>env[k]))};}
function headers(env){return {apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'application/json'};}
async function db(env,table,{method='GET',filters='',body=null,extra={}}={}){
 if(!/^[a-z0-9_]+$/i.test(table))throw new Error('Invalid table');
 const url=`${scrub(env.SUPABASE_URL)}/rest/v1/${table}${filters}`;
 const r=await fetch(url,{method,headers:{...headers(env),...extra},...(body===null?{}:{body:JSON.stringify(body)})});
 if(!r.ok)throw new Error(`Database request failed (${r.status})`);
 const raw=await r.text();return raw?JSON.parse(raw):null;
}
async function fromDb(env,table,uid,other=''){
 return await db(env,table,{filters:`?user_id=eq.${encodeURIComponent(uid)}${other}`});
}
async function identity(request,env){
 const auth=request.headers.get('authorization')||'';
 if(!/^Bearer [\w.\-]+$/.test(auth))return null;
 const r=await fetch(`${scrub(env.SUPABASE_URL)}/auth/v1/user`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:auth}});
 if(!r.ok)return null;const u=await r.json();return /^[a-f0-9-]{36}$/i.test(u.id||'')&&u.email_confirmed_at?u:null;
}
async function requireUser(req,env){const u=await identity(req,env);if(!u)throw Object.assign(new Error('Sign in with a verified email address'),{status:401});return u;}
function bodyLimited(req,n=260000){if(Number(req.headers.get('content-length')||0)>n)throw Object.assign(new Error('Payload too large'),{status:413});return req.text().then(s=>{if(s.length>n)throw Object.assign(new Error('Payload too large'),{status:413});try{return JSON.parse(s);}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}});}
function validPayload(kind,input){
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 if(kind==='farm')return typeof input.stageId==='string'&&typeof input.country==='string'&&input.stageId.length<80&&/^[A-Z]{2}$/.test(input.country);
 return typeof input.schema==='string'&&input.schema.startsWith('rationwise')&&input.schema.length<100;
}
async function countOwned(env,table,uid){
 const resp=await fetch(`${scrub(env.SUPABASE_URL)}/rest/v1/${table}?user_id=eq.${encodeURIComponent(uid)}&select=id&limit=1`,
 {method:'GET',headers:{...headers(env),Prefer:'count=exact'}});
 if(!resp.ok)throw new Error(`Count request failed (${resp.status})`);
 const range=resp.headers.get('content-range')||'';
 const m=range.match(/\/(\d+)$/);
 if(!m)throw new Error('Database count was not returned; cannot enforce quota');
 return Number(m[1]);
}
async function billingRow(env,uid){const r=await fromDb(env,'rw_billing_subscriptions',uid,'&select=*');return r?.[0]||null;}
async function stripe(env,route,params=null,method='POST',idempotencyKey=null){
 const r=await fetch('https://api.stripe.com/v1/'+route,{method,headers:{authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,...(method!=='GET'?{'content-type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(params?{body:new URLSearchParams(params)}:{})});
 const body=await r.json();if(!r.ok)throw new Error('Payment provider request failed ('+r.status+')');return body;
}
async function verifyStripe(raw,signature,secret,now=Date.now()){
 const part=Object.fromEntries((signature||'').split(',').map(x=>x.split('=',2)));
 const t=Number(part.t);if(!Number.isFinite(t)||Math.abs(now-t*1000)>300000)return false;
 const signatures=(signature||'').match(/(?:^|,)v1=([0-9a-f]{64})/g)||[];
 if(!signatures.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${t}.${raw}`));
 const expected=new Uint8Array(digest);
 for(const str of signatures){const h=str.match(/v1=([0-9a-f]{64})/)[1];const candidate=new Uint8Array(h.match(/.{2}/g).map(x=>parseInt(x,16)));let mismatch=0;for(let i=0;i<32;i++)mismatch|=expected[i]^candidate[i];if(!mismatch)return true;}
 return false;
}
export {verifyStripe};
async function syncSubscription(env,sub,session=null){
 const uid=sub.metadata?.rw_user_id||session?.client_reference_id;
 if(!uid||!/^[0-9a-f-]{36}$/i.test(uid))throw new Error('Missing verified billing user mapping');
 const existing=await billingRow(env,uid);
 if(existing?.stripe_customer_id&&existing.stripe_customer_id!==sub.customer)throw new Error('Billing customer mismatch');
 const stripeCustomer=String(sub.customer||session?.customer||'');if(!stripeCustomer)throw new Error('Missing Stripe customer');
 const other=await db(env,'rw_billing_subscriptions',{filters:`?stripe_customer_id=eq.${encodeURIComponent(stripeCustomer)}&select=user_id`});
 if(other.length&&other[0].user_id!==uid)throw new Error('Customer already associated with another account');
 // Entitlements are derived from the CURRENT Stripe price, never user-supplied plan metadata.
 const priceId=sub.items?.data?.[0]?.price?.id||null;
 const plan=Object.keys(knownPlans).find(p=>env[knownPlans[p]]===priceId)||null;
 if(!plan)throw new Error('Subscription price is not an approved RationWise plan');
 const period=sub.current_period_end||sub.items?.data?.[0]?.current_period_end;
 const update={user_id:uid,stripe_customer_id:stripeCustomer,stripe_subscription_id:sub.id,price_id:priceId,plan:plan,subscription_status:sub.status||'incomplete',current_period_end:period?new Date(period*1000).toISOString():null,updated_at:new Date().toISOString()};
 // Upsert only server-side, never grant user update permissions.
 await db(env,'rw_billing_subscriptions',{method:'POST',filters:'?on_conflict=user_id',body:update,extra:{Prefer:'resolution=merge-duplicates,return=minimal'}});
}
async function webhook(req,env){
 if(!env.STRIPE_WEBHOOK_SECRET)return reply({error:'Webhook unavailable'},503);
 const raw=await req.text();if(raw.length>1000000)return reply({error:'Webhook payload too large'},413);
 if(!await verifyStripe(raw,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))return reply({error:'Invalid webhook signature'},400);
 const evt=JSON.parse(raw);if(!/^evt_[\w]+$/.test(evt.id||''))return reply({error:'Malformed event'},400);
 const old=await db(env,'rw_billing_events',{filters:`?event_id=eq.${encodeURIComponent(evt.id)}&select=event_id`});
 if(old.length)return reply({received:true,duplicate:true});
 const obj=evt.data?.object||{};
 if(evt.type==='checkout.session.completed'&&obj.mode==='subscription'&&obj.subscription){
  const sub=await stripe(env,'subscriptions/'+encodeURIComponent(obj.subscription),null,'GET');await syncSubscription(env,sub,obj);
 }else if(evt.type.startsWith('customer.subscription.')&&obj.id){
  const sub=await stripe(env,'subscriptions/'+encodeURIComponent(obj.id),null,'GET');await syncSubscription(env,sub);
 }else if(['invoice.paid','invoice.payment_failed'].includes(evt.type)){
  const subId=typeof obj.subscription==='string'?obj.subscription:obj.parent?.subscription_details?.subscription;
  if(subId){const sub=await stripe(env,'subscriptions/'+encodeURIComponent(subId),null,'GET');await syncSubscription(env,sub);}
 }
 await db(env,'rw_billing_events',{method:'POST',body:{event_id:evt.id,event_type:evt.type},extra:{Prefer:'return=minimal'}});
 return reply({received:true});
}
export async function route(ctx){
 const {request:req,env}=ctx;const url=new URL(req.url);const path=url.pathname.replace(/^\/api\/?/,'');
 try{
  if(req.method==='GET'&&path==='config'){
   const state=configured(env);return reply({authReady:state.auth,billingReady:state.billing,billingMode:env.STRIPE_SECRET_KEY?.startsWith('sk_live_')?'live':'test',supabaseUrl:state.auth?env.SUPABASE_URL:null,supabasePublishableKey:state.auth?env.SUPABASE_PUBLISHABLE_KEY:null,plans:Object.keys(knownPlans).filter(p=>!!env[knownPlans[p]])});
  }
  if(req.method==='POST'&&path==='webhooks/stripe')return await webhook(req,env);
  if(!configured(env).auth||!env.SUPABASE_SERVICE_ROLE_KEY)return reply({error:'Account backend not configured'},503);
  if(path==='health'&&req.method==='GET')return reply({accountBackend:'configured',billingConfigured:configured(env).billing});
  const user=await requireUser(req,env);const uid=user.id;
  if(req.method==='GET'&&path==='me'){
   const sub=await billingRow(env,uid);return reply({email:user.email,userId:uid,plan:tier(sub),limits:limits(sub),billingStatus:sub?.subscription_status||'none',periodEnd:sub?.current_period_end||null});
  }
  if(path==='saves'){
   const kind=url.searchParams.get('kind')||'farm';if(!['farm','formulation'].includes(kind))return reply({error:'Invalid record type'},400);
   const table=kind==='farm'?'rw_farm_profiles':'rw_formulations';const field=kind==='farm'?'profile_json':'formulation_json';
   if(req.method==='GET'){
    const rows=await fromDb(env,table,uid,`&select=id,${field},created_at,updated_at&order=updated_at.desc&limit=100`);
    return reply({rows:rows.map(r=>({id:r.id,record:r[field],createdAt:r.created_at,updatedAt:r.updated_at}))});
   }
   if(req.method==='POST'){
    const body=await bodyLimited(req);if(!validPayload(kind,body.record))return reply({error:'Invalid or incompatible data format'},400);
    const count=await countOwned(env,table,uid);const lim=limits(await billingRow(env,uid))[kind];
    if(count>=lim)return reply({error:`Plan limit reached (${lim} ${kind} records). Upgrade to save more.`},403);
    await db(env,table,{method:'POST',body:{user_id:uid,[field]:body.record},extra:{Prefer:'return=minimal'}});
    return reply({saved:true},201);
   }
   if(req.method==='DELETE'){
    const id=url.searchParams.get('id')||'';if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'Invalid ID'},400);
    await db(env,table,{method:'DELETE',filters:`?user_id=eq.${encodeURIComponent(uid)}&id=eq.${encodeURIComponent(id)}`});return reply({deleted:true});
   }
  }
  if(path==='checkout'&&req.method==='POST'){
   if(!configured(env).billing)return reply({error:'Billing not yet enabled'},503);
   if(env.STRIPE_SECRET_KEY.startsWith('sk_live_')&&env.ENABLE_LIVE_BILLING!=='true')return reply({error:'Live payments not enabled'},503);
   const body=await bodyLimited(req,2000),price=knownPlans[body.plan];if(!price||!env[price])return reply({error:'Unknown or unavailable plan'},400);
   const billing=await billingRow(env,uid);if(isPaid(billing))return reply({error:'Already subscribed. Open the billing portal to make changes.'},409);
   const params={'mode':'subscription','line_items[0][price]':env[price],'line_items[0][quantity]':'1','success_url':`${scrub(env.SITE_URL)}/?checkout=success#account`,'cancel_url':`${scrub(env.SITE_URL)}/?checkout=canceled#account`,'client_reference_id':uid,'subscription_data[metadata][rw_user_id]':uid,'subscription_data[metadata][rw_plan]':body.plan,'metadata[rw_plan]':body.plan};
   if(billing?.stripe_customer_id)params.customer=billing.stripe_customer_id;else params.customer_email=user.email;
   const session=await stripe(env,'checkout/sessions',params,'POST',`rw24-${uid}-${body.plan}-${Math.floor(Date.now()/600000)}`);if(!safeUrl(session.url)||!session.url.startsWith('https://checkout.stripe.com/'))throw new Error('Unexpected checkout response');
   return reply({url:session.url});
  }
  if(path==='portal'&&req.method==='POST'){
   if(!configured(env).billing)return reply({error:'Billing not enabled'},503);
   const billing=await billingRow(env,uid);if(!billing?.stripe_customer_id)return reply({error:'No customer billing record'},404);
   const session=await stripe(env,'billing_portal/sessions',{customer:billing.stripe_customer_id,return_url:`${scrub(env.SITE_URL)}/#account`});
   if(!safeUrl(session.url)||!session.url.startsWith('https://billing.stripe.com/'))throw new Error('Unexpected portal response');return reply({url:session.url});
  }
  return reply({error:'API route not found'},404);
 }catch(e){
  // Avoid exposing provider, database, or authentication secrets through error responses.
  const status=e.status||500;return reply({error:status<500?e.message:'Server operation failed. Please try again or contact support.'},status);
 }
}
