/* ===== יועץ הפרויקט (דמו) =====
   Shows how the per-project AI advisor will look inside the site, before it is switched on.
   - Admin: a project tab with recommendations (approve / reject), a chat, change requests and the project file,
     plus a "how the client sees it" preview and a switch that shows the advisor to that project's client.
   - Client: only when the admin switched it on for the project (client_visibility.advisor), from the side menu.
   - Demo: a project's recommendations, answers and update log live on the project itself (p.advisor_demo, written by the admin),
     never in this public file; projects without one show what will appear. Nothing here changes project data: approvals and requests
     are kept only in this browser. The live advisor (AI over the project file) needs the Anthropic key. */
function adA(){return window.__app||{};}
function adEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function adNis(v){return (v<0?'−':'')+'₪'+Math.abs(Math.round(v)).toLocaleString('he-IL');}
var AD_TAB='advisor',adPreviewClient=false,adSection='recs';

// ---------- demo content: stored on the project itself (p.advisor_demo), never in this public file ----------
// {recs:[{id,type,state,title,what,why,impact,who,src}], qa:{admin:[{q,a,req?}], client:[...]}}. Client data stays in the database, behind its access rules.
function adDemo(p){var d=p&&p.advisor_demo;return d&&Array.isArray(d.recs)?d:null;}

// ---------- state kept in this browser only (demo) ----------
function adKey(pid){return 'aronstein_advisor_demo_'+pid;}
function adState(pid){var s=null;try{s=JSON.parse(localStorage.getItem(adKey(pid))||'null');}catch(e){}
  if(!s)s={recs:{},reqs:[],chat:{admin:[],client:[]}};if(!s.chat)s.chat={admin:[],client:[]};return s;}
function adSave(pid,s){try{localStorage.setItem(adKey(pid),JSON.stringify(s));}catch(e){}}
function adProj(){var A=adA();return A.getCurrentProject&&A.getCurrentProject();}
function adViewAsClient(){var A=adA();return !(A.isAdmin&&A.isAdmin())||adPreviewClient;}

// ---------- screen ----------
function renderAdvisorTabHtml(p,isAdminUser,activeTab){
  var on=activeTab===AD_TAB;
  var h='<div id="tab-'+AD_TAB+'" class="tab-content'+(on?' active':'')+'">'+AD_CSS;
  if(!p)return h+'</div>';
  var asClient=!isAdminUser||adPreviewClient,demo=adDemo(p),st=adState(p.id);
  var shown=!!((p.client_visibility||{}).advisor);
  h+='<div class="ad-head"><div><h2 class="ad-title">'+svgSpark()+' יועץ הפרויקט <span class="ad-demo">דמו</span></h2>'+
    '<p class="ad-sub">'+(asClient?'יועץ שמכיר את הבית שלכם: התוכניות, התקציב ולוח הזמנים. אפשר להתייעץ איתו, וכל שינוי עובר לאישור המפקח.':'יועץ AI שקורא את כל תיק הפרויקט, ממליץ על שינויים ועל מה לשים לב, ועונה לך וללקוח. כל שינוי שהלקוח מבקש מחכה לאישור שלך.')+'</p></div>'+
    (isAdminUser?'<div class="ad-admin"><button type="button" class="btn btn-outline btn-sm" onclick="adTogglePreview()">'+(adPreviewClient?'חזרה לתצוגת מפקח':'איך הלקוח רואה את זה')+'</button>'+
      '<button type="button" class="btn btn-sm '+(shown?'btn-outline':'btn-primary')+'" onclick="adToggleClient()">'+(shown?'הסתר מהלקוח':'הצג ללקוח בתפריט')+'</button></div>':'')+'</div>';
  if(isAdminUser&&adPreviewClient)h+='<div class="ad-note">כך הלקוח יראה את היועץ'+(shown?' (מוצג לו בתפריט).':'. כרגע הוא מוסתר מהלקוח.')+'</div>';
  h+='<div class="ad-note ad-soon">זהו דמו של המסך. '+(demo?'ההמלצות והתשובות כאן נכתבו מתוך התיק האמיתי של הפרויקט (תוכניות, תקציב ולוח זמנים). ':'')+'היועץ החי, שעונה על כל שאלה ומתעדכן לבד מכל שינוי בפרויקט, יופעל אחרי חיבור מפתח ה-AI.</div>';
  var secs=asClient?[['recs','המלצות'],['chat','שאלו את היועץ'],['reqs','הבקשות שלי']]:[['recs','המלצות'],['chat','שיחה'],['reqs','בקשות שינוי'],['file','תיק הפרויקט']];
  if(!secs.some(function(s){return s[0]===adSection;}))adSection='recs';
  var pend=st.reqs.filter(function(r){return r.state==='pending';}).length;
  h+='<div class="ad-tabs" role="tablist">'+secs.map(function(s){return '<button type="button" role="tab" aria-selected="'+(adSection===s[0])+'" onclick="adGo(\''+s[0]+'\')">'+s[1]+(s[0]==='reqs'&&pend?'<span class="ad-count">'+pend+'</span>':'')+'</button>';}).join('')+'</div>';
  h+='<div class="ad-body">';
  if(adSection==='recs')h+=adRecsHtml(p,demo,st,asClient);
  else if(adSection==='chat')h+=adChatHtml(p,demo,st,asClient);
  else if(adSection==='reqs')h+=adReqsHtml(p,st,asClient);
  else h+=adFileHtml(p,demo);
  return h+'</div></div>';
}
function svgSpark(){return '<svg class="ad-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';}
var AD_TYPE={plan:['ad-plan','שינוי תכנוני'],save:['ad-save','חיסכון'],watch:['ad-watch','שים לב'],time:['ad-time','לוח זמנים']};
function adRecState(st,r){return st.recs[r.id]||r.state;}
function adRecsHtml(p,demo,st,asClient){
  if(!demo)return '<div class="ad-empty">היועץ עוד לא ניתח את הפרויקט הזה. בגרסה החיה הוא יעבור על התוכניות, התקציב ולוח הזמנים, ויציע כאן המלצות'+(asClient?' שהמפקח אישר.':' לאישורך.')+'</div>';
  var list=demo.recs.filter(function(r){return !asClient||adRecState(st,r)==='ok';});
  if(!list.length)return '<div class="ad-empty">עוד אין המלצות שהמפקח אישר. כשיאשר, הן יופיעו כאן.</div>';
  return '<p class="ad-lead">'+(asClient?'המלצות שהמפקח בדק ואישר עבור הבית שלכם.':'הלקוח רואה רק המלצות שאישרת.')+'</p><div class="ad-cards">'+list.map(function(r){
    var t=AD_TYPE[r.type]||AD_TYPE.watch,s=adRecState(st,r),sl=s==='ok'?['ad-ok','אושר · הלקוח רואה']:s==='no'?['ad-no','נדחה']:['ad-pend','ממתין לאישורך'];
    return '<article class="ad-card"><div class="ad-meta"><span class="ad-chip '+t[0]+'">'+t[1]+'</span>'+(asClient?'':'<span class="ad-chip '+sl[0]+'">'+sl[1]+'</span>')+'</div><h3>'+adEsc(r.title)+'</h3>'+
      '<dl class="ad-kv"><dt>מה</dt><dd>'+adEsc(r.what)+'</dd><dt>למה</dt><dd>'+adEsc(r.why)+'</dd>'+(r.impact?'<dt>השפעה</dt><dd>תוספת '+adNis(r.impact)+'</dd>':'')+'<dt>מי בודק</dt><dd>'+adEsc(r.who)+'</dd></dl>'+
      (asClient?'':'<div class="ad-src">מקור בתיק: '+adEsc(r.src)+'</div>')+
      (!asClient&&s==='pending'?'<div class="ad-actions"><button type="button" class="btn btn-primary btn-sm" onclick="adRec(\''+r.id+'\',\'ok\')">אישור ושליחה ללקוח</button><button type="button" class="btn btn-outline btn-sm" onclick="adRec(\''+r.id+'\',\'no\')">דחייה</button></div>':'')+'</article>';}).join('')+'</div>';
}
function adChatHtml(p,demo,st,asClient){
  var role=asClient?'client':'admin',turns=st.chat[role]||[],qa=(demo&&demo.qa&&demo.qa[role])||[];
  var hello=asClient?'שלום! אני היועץ של הבית שלכם. אני מכיר את התוכניות, התקציב ולוח הזמנים, ואפשר לשאול אותי כל שאלה. כל שינוי שתרצו אני מעביר למפקח לאישור.':'שלום. אני מכיר את כל תיק הפרויקט: התוכניות, התקציב, לוח הזמנים וההחלטות הפתוחות. על מה נעבוד?';
  var msgs='<div class="ad-msg ad-ai">'+adEsc(hello)+'</div>'+turns.map(function(t){return '<div class="ad-msg '+(t.sys?'ad-sys':t.me?'ad-me':'ad-ai')+'">'+adEsc(t.text)+'</div>';}).join('');
  return '<section class="ad-chat"><div class="ad-msgs" id="ad-msgs" role="log" aria-live="polite">'+msgs+'</div>'+
    (demo?'<div class="ad-qs">'+qa.map(function(x,i){return '<button type="button" onclick="adAsk('+i+')">'+adEsc(x.q)+'</button>';}).join('')+'</div>':'')+
    '<form class="ad-compose" onsubmit="adFree(event)"><input id="ad-in" type="text" placeholder="'+(demo?'בדמו: בחרו שאלה למעלה':'השיחה תיפתח כשהיועץ יופעל')+'" aria-label="שאלה ליועץ" autocomplete="off"><button class="btn btn-primary btn-sm">שליחה</button></form></section>';
}
function adReqsHtml(p,st,asClient){
  if(!st.reqs.length)return '<div class="ad-empty">'+(asClient?'אין בקשות. כשתבקשו שינוי בשיחה, הוא יופיע כאן עד שהמפקח יאשר.':'אין בקשות שינוי. נסה בתצוגת לקוח: בשיחה, "מה יקרה אם נוותר על חיפוי הבריקים?".')+'</div>';
  return '<p class="ad-lead">'+(asClient?'שום דבר לא משתנה בפרויקט לפני שהמפקח מאשר.':'בדמו האישור לא משנה את התקציב או הפרויקט. בגרסה החיה, רק אחרי שתאשר, השינוי נכנס לתיק.')+'</p><div class="ad-cards">'+st.reqs.map(function(r){
    var sl=r.state==='ok'?['ad-ok','אושר']:r.state==='no'?['ad-no','נדחה']:['ad-pend','ממתין לאישור המפקח'];
    return '<article class="ad-card"><div class="ad-meta"><span class="ad-chip '+sl[0]+'">'+sl[1]+'</span><span class="ad-src">מ'+adEsc(r.by)+' · '+adEsc(r.when)+'</span></div><h3>'+adEsc(r.title)+'</h3>'+
      '<dl class="ad-kv"><dt>פרטים</dt><dd>'+adEsc(r.details)+'</dd><dt>השפעה</dt><dd>'+adEsc(r.impact)+'</dd><dt>נדרש</dt><dd>'+adEsc(r.needs)+'</dd></dl>'+
      (!asClient&&r.state==='pending'?'<div class="ad-actions"><button type="button" class="btn btn-primary btn-sm" onclick="adReq(\''+r.id+'\',\'ok\')">אישור</button><button type="button" class="btn btn-outline btn-sm" onclick="adReq(\''+r.id+'\',\'no\')">דחייה</button></div>':'')+'</article>';}).join('')+'</div>';
}
function adFileHtml(p,demo){
  var A=adA(),items=(p.approvedBudgetId&&A.getBudgetItems&&A.getBudgetItems(p.approvedBudgetId))||[];
  var docs=(p.documents||[]).length,phases=(p.phases||[]).length,pays=(p.payments||[]).length;
  var tiles=[[items.length?items.length+' שורות תקציב':'אין תקציב מאושר','מהתקציב המאושר, שורה בשורה'],[phases+' שלבים','מלוח הזמנים'],[docs+' מסמכים','תוכניות, דוחות והיתרים שהועלו'],[pays+' תשלומים','ממעקב התשלומים']];
  return '<p class="ad-lead">כל מה שהיועץ יודע על הבית. בגרסה החיה, כל שינוי בפרויקט (תוכנית חדשה, מחיר, תשלום, דוח פיקוח) מעדכן את התיק לבד, והיועץ בודק אם צריך המלצה חדשה.</p>'+
    '<div class="ad-tiles">'+tiles.map(function(t){return '<div class="ad-tile"><b>'+adEsc(t[0])+'</b><span>'+adEsc(t[1])+'</span></div>';}).join('')+'</div>'+
    (demo&&demo.log&&demo.log.length?'<h3 class="ad-h3">דוגמה: עדכונים שהיועץ קלט לבד</h3><ul class="ad-log">'+demo.log.map(function(x){return '<li><time>'+adEsc(x[0])+'</time>'+adEsc(x[1])+'</li>';}).join('')+'</ul>':'');
}

// ---------- actions ----------
function adRerender(){var el=document.getElementById('tab-'+AD_TAB),p=adProj(),A=adA();if(!el||!p)return;var box=document.createElement('div');
  box.innerHTML=renderAdvisorTabHtml(p,A.isAdmin&&A.isAdmin(),el.classList.contains('active')?AD_TAB:'');el.replaceWith(box.firstElementChild);
  var m=document.getElementById('ad-msgs');if(m)m.scrollTop=m.scrollHeight;}
function adGo(s){adSection=s;adRerender();}
function adTogglePreview(){adPreviewClient=!adPreviewClient;adRerender();}
async function adToggleClient(){var A=adA();if(!A.isAdmin||!A.isAdmin())return;var data=A.getData(),cur=adProj(),p=cur&&data.projects.find(function(x){return x.id===cur.id;});if(!p)return;
  p.client_visibility=Object.assign({},p.client_visibility||{});p.client_visibility.advisor=!p.client_visibility.advisor;
  if(!await A.saveData(data))return;A.showToast&&A.showToast(p.client_visibility.advisor?'היועץ מוצג עכשיו ללקוח בתפריט':'היועץ הוסתר מהלקוח');A.renderProjectDetail(document.getElementById('main-content'));}
function adRec(id,s){var p=adProj();if(!p)return;var st=adState(p.id);st.recs[id]=s;adSave(p.id,st);adRerender();}
function adReq(id,s){var p=adProj();if(!p)return;var st=adState(p.id);st.reqs.forEach(function(r){if(r.id===id)r.state=s;});adSave(p.id,st);adRerender();}
function adAsk(i){var p=adProj();if(!p)return;var d=adDemo(p),role=adViewAsClient()?'client':'admin',x=d&&d.qa&&d.qa[role]&&d.qa[role][i];if(!x)return;var st=adState(p.id);
  st.chat[role].push({me:true,text:x.q});st.chat[role].push({text:x.a});
  if(x.req&&!st.reqs.some(function(r){return r.title===x.req.title;})){st.reqs.unshift({id:'q'+Date.now(),title:x.req.title,details:x.req.details,impact:x.req.impact,needs:x.req.needs,by:role==='client'?'הלקוח':'המפקח',when:new Date().toLocaleDateString('he-IL'),state:'pending'});
    st.chat[role].push({sys:true,text:'📋 נוצרה בקשת שינוי: "'+x.req.title+'". היא ממתינה לאישור המפקח, ושום דבר בפרויקט לא השתנה.'});}
  adSave(p.id,st);adRerender();}
function adFree(e){e.preventDefault();var i=document.getElementById('ad-in');if(!i||!i.value.trim())return;var p=adProj();if(!p)return;var role=adViewAsClient()?'client':'admin',st=adState(p.id);
  st.chat[role].push({me:true,text:i.value.trim()});st.chat[role].push({sys:true,text:'בדמו אפשר לבחור אחת מהשאלות המוכנות. אחרי שהיועץ יופעל, הוא יענה כאן על כל שאלה מתוך תיק הפרויקט.'});adSave(p.id,st);adRerender();}
// client side menu: open the advisor of the client's own project
function adOpen(){var A=adA(),u=A.getUser&&A.getUser();if(!u||!u.projectId)return;if(A.setTab)A.setTab(AD_TAB);if(window.showView)window.showView('project',u.projectId);}

var AD_CSS='<style>'+
'#tab-advisor .ad-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}.ad-title{margin:0;font-size:22px;color:var(--primary,#1B2B5E);display:flex;align-items:center;gap:8px}.ad-ic{width:22px;height:22px;color:#b9821a}'+
'.ad-demo{font-size:12px;font-weight:700;background:#fbf1dc;color:#8a5a00;border-radius:999px;padding:1px 9px}.ad-sub{margin:4px 0 0;color:var(--text-muted,#56657a);max-width:70ch}.ad-admin{display:flex;gap:8px;flex-wrap:wrap}'+
'.ad-note{font-size:14px;border-radius:10px;padding:9px 14px;background:#e7eefc;color:#1a2332;margin-bottom:10px}.ad-soon{background:#fbf1dc}'+
'.ad-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 14px}.ad-tabs button{border:1px solid var(--border,#dde3ea);background:var(--card,#fff);border-radius:999px;padding:7px 14px;cursor:pointer;font:inherit;font-weight:600;color:inherit}.ad-tabs button[aria-selected="true"]{background:var(--primary,#1B2B5E);border-color:var(--primary,#1B2B5E);color:#fff}'+
'.ad-count{display:inline-block;min-width:18px;font-size:12px;background:#b9821a;color:#fff;border-radius:999px;padding:0 6px;margin-inline-start:6px}'+
'.ad-lead{color:var(--text-muted,#56657a);margin:0 0 10px}.ad-cards{display:grid;gap:12px}.ad-card{background:var(--card,#fff);border:1px solid var(--border,#dde3ea);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-width:0}.ad-card h3{margin:0;font-size:17px;line-height:1.35}'+
'.ad-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ad-chip{font-size:12.5px;font-weight:700;border-radius:999px;padding:1px 9px}.ad-plan{background:#e7eefc;color:#1d4ed8}.ad-save{background:#e5f5ea;color:#15803d}.ad-watch{background:#fdf0dc;color:#b45309}.ad-time{background:#fbf1dc;color:#8a5a00}.ad-ok{background:#e5f5ea;color:#15803d}.ad-no{background:#fde9e7;color:#b42318}.ad-pend{background:#fdf0dc;color:#b45309}'+
'.ad-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:15px}.ad-kv dt{color:var(--text-muted,#56657a);font-weight:600}.ad-kv dd{margin:0;min-width:0}.ad-src{font-size:13px;color:var(--text-muted,#56657a)}.ad-actions{display:flex;gap:8px;flex-wrap:wrap}'+
'.ad-empty{padding:26px 16px;text-align:center;color:var(--text-muted,#56657a);background:var(--card,#fff);border:1px dashed var(--border,#dde3ea);border-radius:14px;line-height:1.7}'+
'.ad-chat{background:var(--card,#fff);border:1px solid var(--border,#dde3ea);border-radius:14px;display:flex;flex-direction:column}.ad-msgs{padding:14px;display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto}'+
'.ad-msg{max-width:88%;padding:9px 13px;border-radius:14px;white-space:pre-line;overflow-wrap:anywhere;font-size:15px}.ad-me{align-self:flex-start;background:var(--primary,#1B2B5E);color:#fff}.ad-ai{align-self:flex-end;background:var(--bg,#f0f4f8)}.ad-sys{align-self:center;background:#fdf0dc;font-size:14px;max-width:95%}'+
'.ad-qs{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 10px}.ad-qs button{border:1px solid var(--border,#dde3ea);background:var(--card,#fff);border-radius:999px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer;color:inherit;text-align:right}'+
'.ad-compose{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border,#dde3ea)}.ad-compose input{flex:1;min-width:0;font:inherit;font-size:16px;padding:9px 12px;border:1px solid var(--border,#dde3ea);border-radius:10px;background:var(--bg,#f0f4f8);color:inherit}'+
'.ad-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px;margin-bottom:14px}.ad-tile{background:var(--card,#fff);border:1px solid var(--border,#dde3ea);border-radius:12px;padding:12px 14px}.ad-tile b{display:block;font-size:18px;color:var(--primary,#1B2B5E)}.ad-tile span{font-size:13px;color:var(--text-muted,#56657a)}'+
'.ad-h3{font-size:16px;margin:4px 0 8px}.ad-log{list-style:none;margin:0;padding:0;display:grid;gap:8px}.ad-log li{border-inline-start:3px solid #b9821a;padding:4px 12px;background:var(--card,#fff);border-radius:0 8px 8px 0;font-size:15px}.ad-log time{display:block;font-size:12.5px;color:var(--text-muted,#56657a)}'+
'@media (max-width:640px){.ad-title{font-size:19px}.ad-msg{max-width:94%}.ad-admin .btn{flex:1 1 calc(50% - 4px)}}'+
'</style>';
/* ===== end advisor ===== */
