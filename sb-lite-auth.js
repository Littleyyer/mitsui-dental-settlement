/* 整合密碼驗證的 Supabase 連線模組 */
(function(){
function createClient(url,key){
var base=String(url).replace(/\/+$/,'')+'/rest/v1/';
var session=null;
var authCallbacks=[];
var PASSWORD='5487';

// 從 localStorage 載入 session
function loadSession(){
try{
var stored=localStorage.getItem('mitsui.auth.session');
if(stored==='authenticated'){session='authenticated';}
}catch(e){}
}

function saveSession(s){
session=s;
try{
if(s){localStorage.setItem('mitsui.auth.session','authenticated');}
else{localStorage.removeItem('mitsui.auth.session');}
}catch(e){}
notifyAuth();
}

function notifyAuth(){
authCallbacks.forEach(function(cb){try{cb(session);}catch(e){}});
}

function getHeaders(){
var h={'apikey':key};
if(session){
h['Authorization']='Bearer '+key;
}else{
h['Authorization']='Bearer '+key;
}
return h;
}

function enc(v){return encodeURIComponent(v);}
function request(method,path,headers,body){
if(!session&&(method==='POST'||method==='DELETE')){
return Promise.resolve({data:null,error:{message:'請先登入',status:401}});
}
var h=getHeaders();
Object.keys(headers||{}).forEach(function(k){h[k]=headers[k];});
return fetch(base+path,{method:method,headers:h,body:body==null?undefined:JSON.stringify(body)}).then(function(r){
return r.text().then(function(t){
var j=null;
if(t){try{j=JSON.parse(t);}catch(e){j=null;}}
if(!r.ok)return {data:null,error:{message:(j&&(j.message||j.hint))||('HTTP '+r.status),status:r.status}};
return {data:j,error:null};
});
},function(e){
return {data:null,error:{message:(e&&e.message)||'network error',status:0}};
});
}

function from(table){
var q={mode:'select',cols:'*',f:[],rows:null,opts:{}};
var b={};
b.select=function(c){q.cols=c||'*';return b;};
b.eq=function(c,v){q.f.push(c+'=eq.'+enc(v));return b;};
b.like=function(c,p){q.f.push(c+'=like.'+enc(String(p).replace(/%/g,'*')));return b;};
b.delete=function(){q.mode='delete';return b;};
b.upsert=function(rows,o){q.mode='upsert';q.rows=Array.isArray(rows)?rows:[rows];q.opts=o||{};return b;};
function run(){
if(q.mode==='select')return request('GET',table+'?select='+enc(q.cols)+(q.f.length?'&'+q.f.join('&'):''),{'Accept':'application/json'});
if(q.mode==='delete'){
if(!q.f.length)return Promise.resolve({data:null,error:{message:'delete needs a filter',status:0}});
return request('DELETE',table+'?'+q.f.join('&'),{'Prefer':'return=minimal'});
}
var oc=q.opts.onConflict?'?on_conflict='+enc(q.opts.onConflict):'';
return request('POST',table+oc,{'Content-Type':'application/json','Prefer':'resolution='+(q.opts.ignoreDuplicates?'ignore':'merge')+'-duplicates,return=minimal'},q.rows);
}
b.then=function(res,rej){return run().then(res,rej);};
return b;
}

function channel(){
var subs=[],timers=[],ch={};
ch.on=function(type,cfg,cb){subs.push({cfg:cfg||{},cb:cb});return ch;};
ch.subscribe=function(cb){
if(!session){
if(typeof cb==='function')setTimeout(function(){cb('SUBSCRIBED');},0);
return ch;
}
subs.forEach(function(s){
var f=[],m=/^(\w+)=eq\.(.*)$/.exec(s.cfg.filter||'');
if(m)f.push(m[1]+'=eq.'+enc(m[2]));
var table=s.cfg.table||'clinic_items',snap=null;
function emit(t,n,o){try{s.cb({eventType:t,new:n,old:o,schema:'public',table:table});}catch(e){}}
function poll(){
if(typeof document!=='undefined'&&document.hidden)return;
request('GET',table+'?select=*'+(f.length?'&'+f.join('&'):'')).then(function(r){
if(r.error||!Array.isArray(r.data))return;
var cur={};
r.data.forEach(function(row){cur[row.clinic_id+'|'+row.item_key]=row;});
if(snap){
Object.keys(cur).forEach(function(k){
var n=cur[k],o=snap[k];
if(!o||JSON.stringify(o.entries)!==JSON.stringify(n.entries))emit(o?'UPDATE':'INSERT',n,o||{});
});
Object.keys(snap).forEach(function(k){
if(!cur[k])emit('DELETE',{},{clinic_id:snap[k].clinic_id,item_key:snap[k].item_key});
});
}
snap=cur;
});
}
poll();
timers.push(setInterval(poll,6000));
});
if(typeof cb==='function')setTimeout(function(){cb('SUBSCRIBED');},0);
return ch;
};
ch.unsubscribe=function(){timers.forEach(clearInterval);timers=[];return Promise.resolve('ok');};
return ch;
}

// Auth methods
var auth={
signInWithPassword:function(params){
return new Promise(function(resolve){
if(params.password===PASSWORD){
saveSession('authenticated');
resolve({data:{user:{email:'user'},session:'authenticated'},error:null});
}else{
resolve({data:{user:null,session:null},error:{message:'密碼錯誤'}});
}
});
},
signOut:function(){
saveSession(null);
return Promise.resolve({error:null});
},
getSession:function(){
return Promise.resolve({data:{session:session},error:null});
},
onAuthStateChange:function(cb){
authCallbacks.push(cb);
return {data:{subscription:{unsubscribe:function(){}}}};
}
};

loadSession();
return {from:from,channel:channel,removeChannel:function(c){return c&&c.unsubscribe?c.unsubscribe():Promise.resolve('ok');},auth:auth};
}
window.supabase={createClient:createClient};
})();
