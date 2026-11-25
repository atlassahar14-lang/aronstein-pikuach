/* ===== תקציב וזמנים ללקוח =====
   A client view built from the project's own data, so a change anywhere shows up here:
   - stages, dates, status and planned cost  <- "לוח זמנים" (p.phases, planned_cost)
   - budget sections and total               <- the approved budget from "בניית תקציב" (p.approvedBudgetId); before one is approved, the imported plan
   - money paid / upcoming payments          <- "מעקב תשלומים" (p.payments, approved / pending)
   - client decisions                         <- "בחירות גמרים" (finish_selections)
   proj.client_plan keeps only what has no other home: texts per section, what is not included, site-wide costs (overhead).
   Import (admin) creates the stages, the frame payments and the decisions in those tabs, once. */
function cpA(){return window.__app||{};}
function cpEsc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function cpIc(n){return '<i data-lucide="'+n+'"></i>';}
var CP_DAY=864e5,cpState=null,cpTimer=0,cpLoads={};
function cpNis(x){return Math.round(Number(x)||0).toLocaleString('en-US')+' ₪';}
function cpDate(d){return d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();}
function cpParse(s){if(!s)return null;var p=String(s).slice(0,10).split('-');if(p.length<3)return null;var d=new Date(+p[0],+p[1]-1,+p[2]);return isNaN(d)?null:d;}
function cpIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function cpPlanPhaseDates(plan,ph){var s=cpParse(plan.start);var a=new Date(s.getTime()+(ph.start_week-1)*7*CP_DAY);var b=new Date(a.getTime()+(ph.weeks*7-1)*CP_DAY);return [a,b];}
function cpPlanWeekDate(plan,w){return new Date(cpParse(plan.start).getTime()+((Math.max(1,w)-1)*7+6)*CP_DAY);}
function cpOverhead(plan){if(!plan)return 0;if(plan.overhead!=null)return Number(plan.overhead)||0;return (plan.sections||[]).reduce(function(s,x){return s+(Number(x.spread_all)||0);},0);}
// Load what lives outside app_data (budget items, finish selections) once, then redraw the tab.
function cpEnsureData(p){
  var A=cpA();
  if(p.approvedBudgetId&&A.refreshBudgetItems&&!cpLoads['b'+p.approvedBudgetId]&&!(A.getBudgetItems(p.approvedBudgetId)||[]).length){
    cpLoads['b'+p.approvedBudgetId]=1;A.refreshBudgetItems(p.approvedBudgetId).then(cpRerender);}
  if(A.refreshFinishSelectionsCache&&!cpLoads.fs){cpLoads.fs=1;A.refreshFinishSelectionsCache().then(cpRerender);}
}
function cpRerender(){
  var el=document.getElementById('tab-plan'),A=cpA();if(!el||!A.getCurrentProject)return;
  var r=document.getElementById('cp-r'),w=r?+r.value:null,box=document.createElement('div');
  box.innerHTML=renderClientPlanTabHtml(A.getCurrentProject(),A.isAdmin&&A.isAdmin(),el.classList.contains('active')?'plan':'',w);
  el.replaceWith(box.firstElementChild);if(window.lucide)try{lucide.createIcons();}catch(e){}
}
function cpModel(p){
  var A=cpA(),plan=p.client_plan||null;
  var vat=plan&&plan.vat!=null?Number(plan.vat):(A.vatRate!=null?A.vatRate:0.18);
  var appPh=(p.phases||[]).filter(function(ph){var a=cpParse(ph.start),b=cpParse(ph.end);return a&&b&&b>=a;}).slice().sort(function(x,y){return cpParse(x.start)-cpParse(y.start);});
  if(!appPh.length||(!plan&&!p.approvedBudgetId))return null;
  var planPh={};((plan&&plan.phases)||[]).forEach(function(x){planPh[x.key]=x;});
  var t0=cpParse(appPh[0].start),weekOf=function(d){return Math.floor((d-t0)/(7*CP_DAY))+1;};
  var phases=appPh.map(function(ph){var a=cpParse(ph.start),b=cpParse(ph.end),pp=ph.cp_key&&planPh[ph.cp_key];
    return {id:ph.id,key:ph.cp_key||'',name:ph.name,what:ph.cp_what||(pp&&pp.what)||ph.notes||ph.description||'',a:a,b:b,w0:Math.max(1,weekOf(a)),w1:Math.max(1,weekOf(b)),status:ph.status||'pending',progress:Number(ph.progress)||0,cost:Number(ph.planned_cost)||0};});
  var W=Math.max.apply(null,phases.map(function(x){return x.w1;})),over=cpOverhead(plan);
  var wk=new Array(W+2).fill(0);
  phases.forEach(function(ph){var n=ph.w1-ph.w0+1;for(var w=ph.w0;w<=ph.w1;w++)wk[w]+=ph.cost/n;});
  for(var w1=1;w1<=W;w1++)wk[w1]+=over/W;
  var plannedSum=phases.reduce(function(s,x){return s+x.cost;},0)+over;
  // Budget: the approved budget when there is one, otherwise the imported plan.
  var sections=null,source='',sourceName='';
  if(p.approvedBudgetId){var items=(A.getBudgetItems&&A.getBudgetItems(p.approvedBudgetId))||[];
    if(items.length){var cats=[],by={},sub=0;items.forEach(function(it){var v=(Number(it.quantity)||0)*(Number(it.unitPrice)||0);if(!by[it.category]){by[it.category]=0;cats.push(it.category);}by[it.category]+=v;sub+=v;});
      var before=Number(p.approvedBudgetBeforeVat)||sub,f=sub?before/sub:1,info={};((plan&&plan.sections)||[]).forEach(function(s){info[s.budget_category||s.name]=s;});
      sections=cats.filter(function(c){return by[c]>0;}).map(function(c){var s=info[c]||{};return {name:s.name||c,total:by[c]*f,inc:s.inc||'',qty:s.qty||[],tag:s.tag||'',count:items.filter(function(it){return it.category===c&&(Number(it.unitPrice)||0)>0;}).length};});
      source='budget';sourceName=p.approvedBudgetName||'התקציב המאושר';}}
  if(!sections&&plan&&plan.sections){sections=plan.sections.map(function(s){return {name:s.name,total:Number(s.total)||0,inc:s.inc||'',qty:s.qty||[],tag:s.tag||''};});source='plan';sourceName=plan.estimate||'האומדן';}
  if(!sections){sections=[];source='phases';}
  var total=sections.length?sections.reduce(function(s,x){return s+x.total;},0):plannedSum;
  var cum=[0];for(var w=1;w<=W;w++)cum[w]=cum[w-1]+wk[w]*(1+vat);
  var dateOfWeek=function(w){return new Date(t0.getTime()+(w-1)*7*CP_DAY);};
  var months=[];
  for(var w3=1;w3<=W;w3++){var d=dateOfWeek(w3),key=d.getFullYear()*12+d.getMonth(),m=months.find(function(q){return q.key===key;});
    if(!m){m={key:key,d:d,v:0,paid:0,w0:w3,w1:w3,ph:[]};months.push(m);}m.v+=wk[w3]*(1+vat);m.w1=w3;
    phases.forEach(function(ph){if(ph.w0<=w3&&w3<=ph.w1&&m.ph.indexOf(ph.name)<0)m.ph.push(ph.name);});}
  var byPhKey={};phases.forEach(function(x){if(x.key)byPhKey[x.key]=x;});
  var payDate=function(pay){var ph=pay.cp_phase&&byPhKey[pay.cp_phase];if(ph&&pay.status==='pending'&&pay.cp_frac!=null)return new Date(ph.a.getTime()+Math.round((ph.b-ph.a)*pay.cp_frac));return cpParse(pay.date);};
  var pays=[],paidTotal=0;
  (p.payments||[]).forEach(function(pay){var d=payDate(pay);if(!d)return;var amt=Number(pay.amount)||0;
    if(pay.status!=='pending'){paidTotal+=amt;var key=d.getFullYear()*12+d.getMonth(),m=months.find(function(q){return q.key===key;});if(m)m.paid+=amt;}
    pays.push({d:d,w:weekOf(d),t:pay.desc||'',to:pay.to||'',v:amt,done:pay.status!=='pending',frame:!!pay.cp_frame,pct:pay.cp_pct||null});});
  pays.sort(function(a,b){return a.d-b.d;});
  var frame=pays.filter(function(x){return x.frame;});
  if(!frame.length&&plan&&plan.frame_payments){var fp=plan.frame_payments;frame=(fp.items||[]).map(function(it){var d=cpPlanWeekDate(plan,it.week);return {d:d,w:weekOf(d),t:it.what,v:fp.amount*it.pct/100*(1+vat),done:false,frame:true,pct:it.pct};});}
  var fs=(A.getFinishSelectionsForProject&&A.getFinishSelectionsForProject(p.id))||[],dec;
  if(fs.length)dec=fs.filter(function(s){return cpParse(s.dueDate);}).map(function(s){var d=cpParse(s.dueDate);return {d:d,w:weekOf(d),what:s.title,why:s.description||'',done:s.status==='done'};});
  else dec=((plan&&plan.decisions)||[]).map(function(x){var d=x.week?cpPlanWeekDate(plan,x.week):cpParse(plan.start);return {d:d,w:weekOf(d),what:x.what,why:x.why||'',done:false};});
  dec.sort(function(a,b){return a.d-b.d;});
  return {plan:plan,vat:vat,phases:phases,W:W,wk:wk,cum:cum,total:total,totalVat:total*(1+vat),plannedSum:plannedSum,over:over,sections:sections,source:source,sourceName:sourceName,
    months:months,pays:pays,frame:frame,paidTotal:paidTotal,dateOfWeek:dateOfWeek,weekOf:weekOf,now:weekOf(new Date()),dec:dec};
}
var CP_CSS='<style>'+
'.cp-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.cp-kpi>div{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px}.cp-kpi b{display:block;font-size:24px;line-height:1.25;color:var(--primary);font-variant-numeric:tabular-nums}.cp-kpi span{font-size:13px;color:var(--text-muted)}'+
'.cp-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px}.cp-h{font-size:17px;font-weight:700;margin:22px 0 4px;color:var(--primary)}.cp-lead{color:var(--text-muted);font-size:13.5px;margin:0 0 10px;max-width:70ch}'+
'.cp-model{width:100%;aspect-ratio:16/10;max-height:420px;border:0;display:block;background:transparent}'+
'.cp-wk{display:flex;gap:10px;align-items:center;margin-top:8px}.cp-wk input{flex:1;accent-color:var(--primary)}'+
'.cp-now{display:grid;grid-template-columns:1.3fr 1fr;gap:18px;margin-top:12px}.cp-now h3{margin:2px 0;font-size:18px}.cp-now p{margin:4px 0 0;color:var(--text-muted);font-size:14px}.cp-mut{color:var(--text-muted);font-size:13px}'+
'.cp-big{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}.cp-meter{display:flex;height:10px;background:var(--bg);border-radius:5px;overflow:hidden;margin:8px 0 4px}.cp-meter i{display:block;height:100%;background:var(--primary)}'+
'.cp-nx{margin-top:10px;font-size:13.5px}.cp-nx div{padding:6px 0;border-top:1px solid var(--border)}'+
'.cp-chart{position:relative}.cp-chart svg{display:block;width:100%;height:auto}.cp-tip{position:absolute;pointer-events:none;background:var(--text);color:#fff;font-size:12.5px;padding:6px 9px;border-radius:6px;opacity:0;transition:opacity .12s;white-space:nowrap;z-index:2}'+
'.cp-leg{display:flex;gap:16px;font-size:12.5px;color:var(--text-muted);margin:0 0 6px}.cp-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline-end:5px;vertical-align:-1px}'+
'.cp-sec{border:1px solid var(--border);border-top:0;background:var(--card)}.cp-sec:first-child{border-top:1px solid var(--border);border-radius:12px 12px 0 0}.cp-sec summary{display:grid;grid-template-columns:minmax(0,1.6fr) auto minmax(60px,1fr) 52px;gap:12px;align-items:center;padding:10px 14px;cursor:pointer;list-style:none}.cp-sec summary::-webkit-details-marker{display:none}'+
'.cp-sn{font-weight:600}.cp-sv{font-variant-numeric:tabular-nums}.cp-sp{color:var(--text-muted);font-size:13px;font-variant-numeric:tabular-nums}.cp-bar{display:flex;height:8px;background:var(--bg);border-radius:4px}.cp-bar i{display:block;height:100%;background:var(--primary);border-radius:4px}'+
'.cp-sec[open] summary{background:var(--bg)}.cp-sd{padding:4px 14px 12px;font-size:14px}.cp-sd p{margin:6px 0}.cp-sd ul{margin:4px 0;padding-inline-start:18px}.cp-tag{font-size:11.5px;font-weight:500;color:var(--text-muted);border:1px solid var(--border);border-radius:10px;padding:0 7px;margin-inline-start:8px}'+
'.cp-sum{display:flex;justify-content:space-between;padding:10px 14px;background:var(--card);border:1px solid var(--border);border-top:0;border-radius:0 0 12px 12px;font-weight:700}'+
'.cp-tbl{width:100%;border-collapse:collapse;font-size:13.5px}.cp-tbl th,.cp-tbl td{text-align:right;padding:7px 10px;border-bottom:1px solid var(--border);vertical-align:top}.cp-tbl th{color:var(--text-muted);font-weight:500}.cp-tbl td{font-variant-numeric:tabular-nums}.cp-tbl tr.cp-hi td{background:var(--bg)}.cp-wrap{overflow-x:auto;background:var(--card);border:1px solid var(--border);border-radius:12px}'+
'.cp-dec{list-style:none;margin:0;padding:0;background:var(--card);border:1px solid var(--border);border-radius:12px}.cp-dec li{display:grid;grid-template-columns:110px 90px 1fr;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)}.cp-dec li:last-child{border:0}.cp-dec small{display:block;color:var(--text-muted);font-size:12.5px}.cp-dec li.soon{background:#fff7e6}.cp-dec li.past{opacity:.55}'+
'.cp-st{font-size:12px;border-radius:10px;padding:1px 8px;white-space:nowrap}.cp-st.done{background:#dcfce7;color:#166534}.cp-st.active{background:#fef3c7;color:#92400e}.cp-st.pending{background:var(--bg);color:var(--text-muted)}'+
'.cp-admin{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}'+
'@media (max-width:700px){.cp-kpi{grid-template-columns:1fr}.cp-now{grid-template-columns:1fr}.cp-sec summary{grid-template-columns:1fr auto}.cp-dec li{grid-template-columns:1fr auto}.cp-dec li div{grid-column:1/-1}}'+
'</style>';
function cpStageOfWeek(M,w){var n=0;M.phases.forEach(function(ph,i){if(ph.w0<=w)n=i+1;});return Math.max(1,n);}
function cpChartSvg(M){
  var VW=880,VH=280,ml=64,mr=8,mt=12,mb=34,max=0;M.months.forEach(function(m){max=Math.max(max,m.v,m.paid);});
  var step=max>600000?200000:100000,top=Math.max(step,Math.ceil(max/step)*step),n=M.months.length,bw=(VW-ml-mr)/n;
  var Y=function(v){return mt+(VH-mt-mb)*(1-v/top);};
  var s='<svg viewBox="0 0 '+VW+' '+VH+'" role="img" aria-label="הוצאה חודשית מתוכננת כולל מע״מ">';
  for(var g=0;g<=top;g+=step)s+='<line x1="'+ml+'" x2="'+(VW-mr)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="var(--border)"/><text x="'+(ml-8)+'" y="'+(Y(g)+4)+'" text-anchor="end" font-size="11" fill="var(--text-muted)" direction="ltr">'+(g?(g/1000)+'K':'0')+'</text>';
  var MN=['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];
  M.months.forEach(function(m,i){
    var x=VW-mr-(i+1)*bw,h=VH-mb-Y(m.v),hasPaid=m.paid>0,pw=hasPaid?(bw-10)*0.62:bw-10;
    s+='<path class="cp-b" data-i="'+i+'" d="M'+(x+5)+','+(VH-mb)+'v'+(-Math.max(h-4,0))+'q0,-4 4,-4h'+(pw-8)+'q4,0 4,4v'+Math.max(h-4,0)+'z" fill="var(--primary)" opacity=".85"/>';
    if(hasPaid){var hp=VH-mb-Y(m.paid);s+='<path d="M'+(x+5+pw+2)+','+(VH-mb)+'v'+(-Math.max(hp-3,0))+'q0,-3 3,-3h'+(bw-10-pw-2-6)+'q3,0 3,3v'+Math.max(hp-3,0)+'z" fill="var(--success)"/>';}
    s+='<text x="'+(x+bw/2)+'" y="'+(VH-mb+16)+'" text-anchor="middle" font-size="10.5" fill="var(--text-muted)">'+MN[m.d.getMonth()]+"' "+String(m.d.getFullYear()).slice(2)+'</text>';
    s+='<rect x="'+x+'" y="'+mt+'" width="'+bw+'" height="'+(VH-mt-mb)+'" fill="transparent" tabindex="0" style="cursor:pointer" onmouseenter="cpTip('+i+',this)" onfocus="cpTip('+i+',this)" onmouseleave="cpTip(-1)" onblur="cpTip(-1)" onclick="cpShow('+m.w0+')"><title>'+cpEsc(m.d.toLocaleDateString('he-IL',{month:'long',year:'numeric'}))+'</title></rect>';
  });
  return s+'</svg>';
}
function renderClientPlanTabHtml(p,isAdminUser,activeTab,atWeek){
  var html='<div id="tab-plan" class="tab-content '+(activeTab==='plan'?'active':'')+'">'+CP_CSS;
  cpEnsureData(p);
  var M=cpModel(p);cpState=M;
  if(isAdminUser){
    html+='<div class="cp-admin"><label class="btn btn-outline btn-sm" style="cursor:pointer">'+cpIc('upload')+' ייבוא תכנית לקוח (JSON)<input type="file" accept=".json,application/json" style="display:none" onchange="cpImport(this)"></label>'+
      (p.client_plan&&!p.client_plan.linked?'<button type="button" class="btn btn-primary btn-sm" onclick="cpLinkCurrent()">'+cpIc('link')+' קישור התכנית ללשוניות</button>':'')+
      (p.client_plan?'<button type="button" class="btn btn-outline btn-sm" onclick="cpRemove()">'+cpIc('trash-2')+' הסרת התכנית</button>':'')+'</div>';
    if(M){
      var src=M.source==='budget'?'התקציב המאושר "'+cpEsc(M.sourceName)+'" (בניית תקציב)':M.source==='plan'?'התכנית שיובאה, כי עוד לא אושר לפרויקט תקציב ב"בניית תקציב"':'סכום העלויות בשלבים';
      html+='<div class="cp-card cp-mut" style="font-size:13px;line-height:1.7"><b style="color:var(--text)">מאיפה הדף לוקח את הנתונים:</b> שלבים, תאריכים ועלות לכל שלב מ"לוח זמנים" · תשלומים מ"מעקב תשלומים" · החלטות מ"בחירות גמרים" · התקציב מ'+src+'.';
      var gap=M.total-M.plannedSum;
      if(M.sections.length&&Math.abs(gap)>Math.max(1000,M.total*0.005))html+='<br><b style="color:#b45309">שים לב:</b> סכום העלויות בשלבים ('+cpNis(M.plannedSum)+' לפני מע"מ'+(M.over?', כולל '+cpNis(M.over)+' פיקוח ושונות לאורך הפרויקט':'')+') '+(gap>0?'נמוך':'גבוה')+' מהתקציב ב-'+cpNis(Math.abs(gap))+'. כדי שהתזרים יתאים, עדכן את "עלות מתוכננת" בשלבים בלוח הזמנים.';
      html+='</div>';
    }
  }
  if(!M){return html+'<div class="empty-state"><div class="empty-icon">'+cpIc('calendar-range')+'</div><p>עוד אין שלבים בלוח הזמנים של הפרויקט, ולכן אין עדיין תקציב וזמנים להציג</p></div></div>';}
  var plan=M.plan||{},vat=M.vat,end=new Date(Math.max.apply(null,M.phases.map(function(x){return x.b.getTime();})));
  var w=Math.min(Math.max(1,atWeek||M.now),M.W);
  html+='<div class="cp-kpi"><div><b>'+cpNis(M.totalVat)+'</b><span>עלות כוללת · '+cpNis(M.total)+' לפני מע"מ</span></div>'+
    '<div><b>'+M.W+' שבועות</b><span>כ-'+Math.round(M.W/4.33)+' חודשי עבודה</span></div>'+
    '<div><b>'+cpDate(M.phases[0].a)+'</b><span>התחלה · מסירה משוערת '+cpDate(end)+'</span></div></div>';
  html+='<p class="cp-mut" style="margin:-6px 0 12px">לפי '+cpEsc(M.sourceName||'לוח הזמנים')+' · כל הסכומים כוללים מע"מ '+Math.round(vat*100)+'%'+(M.paidTotal?' · שולם עד היום '+cpNis(M.paidTotal):'')+' · מתעדכן לפי ההתקדמות באתר</p>';
  html+='<div class="cp-h">שבוע אחרי שבוע</div><p class="cp-lead">גררו את הסרגל: מה עושים באתר בכל שבוע, כמה כבר הושקע ומה צריך להחליט בקרוב.</p><div class="cp-card">'+
    (plan.model_url?'<iframe class="cp-model" id="cp-model" src="'+cpEsc(plan.model_url)+'?stage='+cpStageOfWeek(M,w)+'" title="מודל הבית לפי שלבים" onload="cpShow(document.getElementById(\'cp-r\').value)"></iframe>':'')+
    '<div class="cp-wk"><input id="cp-r" type="range" min="1" max="'+M.W+'" value="'+w+'" aria-label="שבוע בפרויקט" oninput="cpStop();cpShow(this.value)"><button type="button" class="btn btn-outline btn-sm" id="cp-play" onclick="cpPlay()">הפעלה</button><button type="button" class="btn btn-outline btn-sm" onclick="cpStop();cpShow(cpState.now)">היום</button></div>'+
    '<div class="cp-now"><div><div class="cp-mut" id="cp-wd"></div><h3 id="cp-wn"></h3><p id="cp-ww"></p><div class="cp-mut" id="cp-wst" style="margin-top:6px"></div></div>'+
    '<div><div class="cp-mut">מתוכנן להיות מושקע עד סוף השבוע</div><div class="cp-big" id="cp-wc"></div><div class="cp-meter"><i id="cp-wm"></i></div><div class="cp-mut" id="cp-wp"></div><div class="cp-nx"><div id="cp-nd"></div><div id="cp-np"></div></div></div></div></div>';
  var anyPaid=M.months.some(function(m){return m.paid>0;});
  html+='<div class="cp-h">כמה כסף צריך בכל חודש</div><p class="cp-lead">ההוצאה המתוכננת לפי חודש הביצוע, מהעלות של כל שלב בלוח הזמנים'+(anyPaid?', ולצידה מה ששולם בפועל':'')+'.</p>'+
    '<div class="cp-card cp-chart" id="cp-chart">'+(anyPaid?'<div class="cp-leg"><span><i style="background:var(--primary)"></i>מתוכנן</span><span><i style="background:var(--success)"></i>שולם בפועל</span></div>':'')+cpChartSvg(M)+'<div class="cp-tip" id="cp-tip" role="status"></div></div>';
  html+='<div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>חודש</th><th>מה עושים</th><th>מתוכנן בחודש</th><th>מצטבר</th>'+(anyPaid?'<th>שולם בפועל</th>':'')+'</tr></thead><tbody>';
  var run=0;M.months.forEach(function(m,i){run+=m.v;html+='<tr data-cpm="'+i+'"><td>'+m.d.toLocaleDateString('he-IL',{month:'long',year:'numeric'})+'</td><td>'+cpEsc(m.ph.join(', '))+'</td><td style="white-space:nowrap">'+cpNis(m.v)+'</td><td style="white-space:nowrap">'+cpNis(run)+'</td>'+(anyPaid?'<td style="white-space:nowrap">'+(m.paid?cpNis(m.paid):'')+'</td>':'')+'</tr>';});
  html+='</tbody></table></div>';
  if(M.sections.length){
    var order=M.sections.map(function(s,i){return i;}).sort(function(a,b){return M.sections[b].total-M.sections[a].total;}),top=M.sections[order[0]].total/M.total;
    html+='<div class="cp-h">על מה הולך הכסף</div><p class="cp-lead">לחצו על פרק כדי לראות מה כלול בו. "קומפלט" הוא מחיר כולל לכל העבודה; "הערכה" הוא סעיף שעוד אין לו תוכנית סופית.</p><div>';
    order.forEach(function(i){var s=M.sections[i],pct=s.total/M.total;
      html+='<details class="cp-sec"><summary><span class="cp-sn">'+cpEsc(s.name)+(s.tag?'<span class="cp-tag">'+cpEsc(s.tag)+'</span>':'')+'</span><span class="cp-sv">'+cpNis(s.total*(1+vat))+'</span><span class="cp-bar" aria-hidden="true"><i style="width:'+(pct/top*100)+'%"></i></span><span class="cp-sp">'+(pct*100).toFixed(1)+'%</span></summary>'+
        '<div class="cp-sd">'+(s.inc?'<p>'+cpEsc(s.inc)+'</p>':'')+((s.qty||[]).length?'<ul>'+s.qty.map(function(q){return '<li>'+cpEsc(q)+'</li>';}).join('')+'</ul>':'')+(s.count?'<p class="cp-mut">'+s.count+' סעיפים בתקציב</p>':'')+'</div></details>';});
    html+='</div><div class="cp-sum"><span>סה"כ כולל מע"מ</span><span>'+cpNis(M.totalVat)+'</span></div>';
  }
  if(M.frame.length){var fp=plan.frame_payments||{};
    html+='<div class="cp-h">תשלומי השלד לפי החוזה</div><p class="cp-lead">'+(fp.contractor?'בחוזה עם '+cpEsc(fp.contractor)+' ':'')+'השלד משולם בשלבים, רק אחרי שהשלב גמור ונבדק בפיקוח. המועדים זזים יחד עם השלבים בלוח הזמנים.</p>'+
      '<div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>שלב</th><th>אחוז</th><th>סכום</th><th>מתי</th><th>מצב</th></tr></thead><tbody>'+
      M.frame.map(function(q){return '<tr><td>'+cpEsc(q.t)+'</td><td>'+(q.pct?q.pct+'%':'')+'</td><td style="white-space:nowrap">'+cpNis(q.v)+'</td><td style="white-space:nowrap">'+cpDate(q.d)+'</td><td><span class="cp-st '+(q.done?'done':'pending')+'">'+(q.done?'שולם':'ממתין')+'</span></td></tr>';}).join('')+'</tbody></table></div>';}
  if(M.dec.length){html+='<div class="cp-h">מה אתם צריכים להחליט, ועד מתי</div><p class="cp-lead">החלטה שמגיעה באיחור עוצרת את האתר. אלה המועדים האחרונים ששומרים על לוח הזמנים.</p><ul class="cp-dec" id="cp-dec">'+
    M.dec.map(function(d){return '<li data-w="'+d.w+'" data-done="'+(d.done?1:0)+'"><b>'+(d.done?'✓ הוחלט':'עד '+cpDate(d.d))+'</b><span class="cp-mut">שבוע '+Math.max(1,d.w)+'</span><div>'+cpEsc(d.what)+'<small>'+cpEsc(d.why)+'</small></div></li>';}).join('')+'</ul>';}
  html+='<div class="cp-h">שלבי הבנייה</div><div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>שלב</th><th>תאריכים</th><th>מצב</th><th>מה עושים</th></tr></thead><tbody>'+
    M.phases.map(function(ph,i){var st=ph.status==='done'?'הושלם':ph.status==='active'?'בביצוע '+ph.progress+'%':'ממתין';return '<tr data-cpp="'+i+'"><td>'+cpEsc(ph.name)+'</td><td style="white-space:nowrap">'+cpDate(ph.a)+' – '+cpDate(ph.b)+'</td><td><span class="cp-st '+(ph.status||'pending')+'">'+st+'</span></td><td>'+cpEsc(ph.what)+'</td></tr>';}).join('')+'</tbody></table></div>';
  if((plan.not_included||[]).length)html+='<div class="cp-h">מה לא כלול בסכום</div><div class="cp-card"><ul style="margin:0;padding-inline-start:18px">'+plan.not_included.map(function(x){return '<li>'+cpEsc(x)+'</li>';}).join('')+'</ul></div>';
  html+='<p class="cp-mut">'+(plan.index?'המחירים כפופים ל'+cpEsc(plan.index)+'. ':'')+'החלוקה לחודשים מניחה שכל קבלן מקבל תשלום לפי קצב העבודה שלו.</p>';
  setTimeout(function(){cpShow(w);},0);
  return html+'</div>';
}
function cpShow(w){
  var M=cpState;if(!M)return;w=Math.min(Math.max(1,+w||1),M.W);var $=function(i){return document.getElementById(i);};if(!$('cp-r'))return;
  $('cp-r').value=w;var last=w>=M.W,cur=M.phases.filter(function(ph){return ph.w0<=w&&w<=ph.w1;}),ph=cur[cur.length-1]||M.phases[0];
  $('cp-wd').textContent='שבוע '+w+' מתוך '+M.W+' · '+cpDate(M.dateOfWeek(w))+(w===M.now?' · השבוע':'');
  $('cp-wn').textContent=last?'הבית גמור':(cur.length?cur.map(function(x){return x.name;}).join(' + '):'בין שלבים');$('cp-ww').textContent=cur.length?ph.what:'';
  $('cp-wst').textContent=cur.map(function(x){return x.status==='done'?x.name+': הושלם':x.status==='active'?x.name+': בביצוע, '+x.progress+'%':'';}).filter(Boolean).join(' · ');
  var c=M.cum[w];$('cp-wc').textContent=cpNis(c);$('cp-wm').style.width=Math.min(100,c/M.totalVat*100)+'%';$('cp-wp').textContent=Math.round(c/M.totalVat*100)+'% מהתקציב · נשאר '+cpNis(Math.max(0,M.totalVat-c));
  var d=M.dec.filter(function(x){return !x.done&&x.w>=w;})[0];$('cp-nd').innerHTML=M.dec.length?(d?'<b>ההחלטה הבאה:</b> '+cpEsc(d.what)+' (עד '+cpDate(d.d)+')':'<b>אין החלטות פתוחות</b>'):'';
  var q=M.frame.filter(function(x){return !x.done&&x.w>=w;})[0]||M.pays.filter(function(x){return !x.done&&x.w>=w;})[0];
  $('cp-np').innerHTML=q?'<b>התשלום הבא:</b> '+cpNis(q.v)+', '+cpEsc(q.t)+' ('+cpDate(q.d)+')':'';
  document.querySelectorAll('#cp-dec li').forEach(function(li){var x=+li.dataset.w,done=li.dataset.done==='1';li.classList.toggle('past',done||x<w);li.classList.toggle('soon',!done&&x>=w&&x<w+6);});
  M.months.forEach(function(m,i){var on=w>=m.w0&&w<=m.w1;var b=document.querySelector('#cp-chart .cp-b[data-i="'+i+'"]');if(b)b.setAttribute('opacity',on?'1':'.55');var tr=document.querySelector('tr[data-cpm="'+i+'"]');if(tr)tr.classList.toggle('cp-hi',on);});
  M.phases.forEach(function(x,i){var tr=document.querySelector('tr[data-cpp="'+i+'"]');if(tr)tr.classList.toggle('cp-hi',cur.indexOf(x)>=0&&!last);});
  var f=$('cp-model');if(f&&f.contentWindow)try{f.contentWindow.postMessage({type:'stage',stage:cpStageOfWeek(M,w),done:last},'*');}catch(e){}
}
function cpStop(){clearInterval(cpTimer);cpTimer=0;var b=document.getElementById('cp-play');if(b)b.textContent='הפעלה';}
function cpPlay(){if(cpTimer)return cpStop();var r=document.getElementById('cp-r');if(!r||!cpState)return;document.getElementById('cp-play').textContent='עצירה';if(+r.value>=cpState.W)cpShow(1);
  cpTimer=setInterval(function(){var w=+r.value;if(w>=cpState.W||!document.getElementById('cp-r'))return cpStop();cpShow(w+1);},matchMedia('(prefers-reduced-motion: reduce)').matches?1500:450);}
function cpTip(i,el){var t=document.getElementById('cp-tip');if(!t)return;if(i<0||!cpState){t.style.opacity=0;return;}var m=cpState.months[i];
  t.innerHTML='<b>'+m.d.toLocaleDateString('he-IL',{month:'long',year:'numeric'})+'</b><br>מתוכנן '+cpNis(m.v)+(m.paid?' · שולם '+cpNis(m.paid):'')+'<br>'+cpEsc(m.ph.join(', '));
  var R=document.getElementById('cp-chart').getBoundingClientRect(),B=el.getBoundingClientRect();t.style.opacity=1;
  t.style.left=Math.min(Math.max(B.left-R.left+B.width/2-t.offsetWidth/2,0),R.width-t.offsetWidth)+'px';t.style.top=Math.max(B.top-R.top+B.height*0.25-t.offsetHeight,0)+'px';}
function cpProj(){var A=cpA(),data=A.getData(),cur=A.getCurrentProject();return {data:data,proj:cur&&data.projects.find(function(x){return x.id===cur.id;})};}
// Put the plan's stages, frame payments and decisions into "לוח זמנים", "מעקב תשלומים" and "בחירות גמרים". Safe to run again: nothing is added twice.
async function cpLink(data,proj,plan){
  var A=cpA(),out={phNew:0,phLinked:0,pay:0,dec:0,decErr:''};
  proj.phases=proj.phases||[];proj.payments=proj.payments||[];
  plan.phases.forEach(function(ph,i){
    var dd=cpPlanPhaseDates(plan,ph),cost=0;
    plan.sections.forEach(function(s){(s.alloc||[]).forEach(function(al){if(al.phase===ph.key)cost+=al.amount;else if(al.week&&al.week>=ph.start_week&&al.week<ph.start_week+ph.weeks&&!plan.phases.slice(i+1).some(function(o){return al.week>=o.start_week&&al.week<o.start_week+o.weeks;}))cost+=al.amount;});});
    var ex=proj.phases.find(function(x){return x.cp_key===ph.key;})||proj.phases.find(function(x){return !x.cp_key&&String(x.name).trim()===ph.name;});
    if(ex){ex.cp_key=ph.key;ex.cp_what=ex.cp_what||ph.what||'';if(!ex.start||!ex.end){ex.start=cpIso(dd[0]);ex.end=cpIso(dd[1]);}if(ex.planned_cost==null||ex.planned_cost==='')ex.planned_cost=Math.round(cost);out.phLinked++;}
    else{proj.phases.push({id:'ph'+Date.now()+'_'+i,name:ph.name,start:cpIso(dd[0]),end:cpIso(dd[1]),progress:0,status:'pending',planned_cost:Math.round(cost),depends_on:[],cp_key:ph.key,cp_what:ph.what||''});out.phNew++;}
  });
  var fp=plan.frame_payments,vat=Number(plan.vat)||0;
  if(fp)(fp.items||[]).forEach(function(it,i){var key='frame'+i;if(proj.payments.some(function(x){return x.cp_frame===key;}))return;
    var ph=plan.phases.find(function(o){return it.week>=o.start_week&&it.week<o.start_week+o.weeks;});
    proj.payments.push({id:'pay'+Date.now()+'_f'+i,desc:'שלד: '+it.what+' ('+it.pct+'%)',amount:Math.round(fp.amount*it.pct/100*(1+vat)),date:cpIso(cpPlanWeekDate(plan,it.week)),to:fp.contractor||'',category:'שלד',status:'pending',
      cp_frame:key,cp_pct:it.pct,cp_phase:ph?ph.key:'',cp_frac:ph?Math.min(1,(it.week-ph.start_week+1)/ph.weeks):null});out.pay++;});
  if(A.supabase&&(plan.decisions||[]).length){
    if(A.refreshFinishSelectionsCache)await A.refreshFinishSelectionsCache();
    var have=((A.getFinishSelectionsForProject&&A.getFinishSelectionsForProject(proj.id))||[]).map(function(s){return String(s.title).trim();});
    var cat=function(t){return /ריצוף|חיפוי/.test(t)?'ריצוף':/סניטר|אסל|מקלחון/.test(t)?'סניטריה':/תאורה/.test(t)?'תאורה':/אלומיניום|תריס/.test(t)?'אלומיניום':/מטבח/.test(t)?'מטבח':/צבע/.test(t)?'צבע':'אחר';};
    var rows=plan.decisions.filter(function(d){return have.indexOf(String(d.what).trim())<0;}).map(function(d){return {project_id:proj.id,title:d.what,description:d.why||'',category:cat(d.what),due_date:cpIso(d.week?cpPlanWeekDate(plan,d.week):cpParse(plan.start)),status:'pending'};});
    if(rows.length){var res=await A.supabase.from('finish_selections').insert(rows);if(res.error)out.decErr=res.error.message;else out.dec=rows.length;}
    if(A.refreshFinishSelectionsCache)await A.refreshFinishSelectionsCache();
  }
  if(!proj.budget&&!proj.approvedBudgetId){var tot=plan.sections.reduce(function(s,x){return s+(Number(x.total)||0);},0);proj.budget=Math.round(tot*(1+vat));}
  plan.overhead=cpOverhead(plan);plan.linked=!out.decErr;proj.client_plan=plan;
  return out;
}
function cpLinkMsg(o){return 'לוח זמנים: '+o.phNew+' שלבים חדשים, '+o.phLinked+' קושרו · מעקב תשלומים: '+o.pay+' תשלומי שלד · בחירות גמרים: '+o.dec+' החלטות'+(o.decErr?' (שגיאה: '+o.decErr+')':'');}
async function cpImport(input){
  var A=cpA();if(!A.requireAdmin||!A.requireAdmin())return;var file=input.files&&input.files[0];input.value='';if(!file)return;
  var plan;try{plan=JSON.parse(await file.text());}catch(e){A.showToast('הקובץ אינו JSON תקין','error');return;}
  if(!plan||!Array.isArray(plan.phases)||!Array.isArray(plan.sections)||!cpParse(plan.start)){A.showToast('בקובץ חסרים שלבים, פרקים או תאריך התחלה','error');return;}
  var P=cpProj();if(!P.proj)return;
  if(!confirm('לייבא את התכנית "'+(plan.estimate||file.name)+'"?\nהשלבים ייכנסו ל"לוח זמנים", תשלומי השלד ל"מעקב תשלומים" וההחלטות ל"בחירות גמרים". מה שכבר קיים לא ייכפל.'))return;
  var o=await cpLink(P.data,P.proj,plan);
  A.logActivity('ייבוא תכנית לקוח','פרויקט: '+P.proj.name+' · '+cpLinkMsg(o));
  if(!await A.saveData(P.data))return;
  A.showToast(cpLinkMsg(o),o.decErr?'error':undefined);A.setTab('plan');A.renderProjectDetail(document.getElementById('main-content'));
}
async function cpLinkCurrent(){
  var A=cpA();if(!A.requireAdmin||!A.requireAdmin())return;var P=cpProj();if(!P.proj||!P.proj.client_plan)return;
  if(!confirm('לקשר את התכנית ללשוניות?\nתשלומי השלד ייכנסו ל"מעקב תשלומים" (כממתינים) וההחלטות ל"בחירות גמרים". מה שכבר קיים לא ייכפל.'))return;
  var o=await cpLink(P.data,P.proj,P.proj.client_plan);
  A.logActivity('קישור תכנית לקוח','פרויקט: '+P.proj.name+' · '+cpLinkMsg(o));
  if(!await A.saveData(P.data))return;
  A.showToast(cpLinkMsg(o),o.decErr?'error':undefined);A.setTab('plan');A.renderProjectDetail(document.getElementById('main-content'));
}
async function cpRemove(){
  var A=cpA();if(!A.requireAdmin||!A.requireAdmin())return;if(!confirm('להסיר את טקסטי התכנית מהפרויקט? השלבים, התשלומים וההחלטות נשארים בלשוניות שלהם.'))return;
  var P=cpProj();if(!P.proj)return;delete P.proj.client_plan;if(!await A.saveData(P.data))return;A.showToast('התכנית הוסרה');A.renderProjectDetail(document.getElementById('main-content'));
}
/* ===== end client plan ===== */
