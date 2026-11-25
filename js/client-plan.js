/* ===== תקציב וזמנים ללקוח (client_plan) =====
   proj.client_plan: {start, vat, estimate, index, model_url, phases[{key,name,what,start_week,weeks}],
   sections[{name,total,inc,qty[],tag,alloc[{phase|week,amount}],spread_all}], frame_payments{...items[{pct,what,week}]},
   decisions[{week,what,why}], not_included[]}. Amounts in the plan are before VAT; the page shows them with VAT.
   Stage dates follow the project's own phases (linked by cp_key), so editing a phase in "לוח זמנים" moves this page too. */
function cpA(){return window.__app||{};}
function cpEsc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function cpIc(n){return '<i data-lucide="'+n+'"></i>';}
var CP_DAY=864e5,cpState=null,cpTimer=0;
function cpNis(x){return Math.round(Number(x)||0).toLocaleString('en-US')+' ₪';}
function cpDate(d){return d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();}
function cpParse(s){if(!s)return null;var p=String(s).slice(0,10).split('-');if(p.length<3)return null;var d=new Date(+p[0],+p[1]-1,+p[2]);return isNaN(d)?null:d;}
function cpIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function cpPlanPhaseDates(plan,ph){var s=cpParse(plan.start);var a=new Date(s.getTime()+(ph.start_week-1)*7*CP_DAY);var b=new Date(a.getTime()+(ph.weeks*7-1)*CP_DAY);return [a,b];}
function cpModel(p){
  var plan=p.client_plan;if(!plan||!plan.phases||!plan.sections)return null;
  var vat=Number(plan.vat)||0,t0=cpParse(plan.start);if(!t0)return null;
  var weekOf=function(d){return Math.floor((d-t0)/(7*CP_DAY))+1;};
  var appPh=p.phases||[];
  var phases=plan.phases.map(function(ph){
    var link=appPh.find(function(x){return x.cp_key===ph.key;});
    var dd=cpPlanPhaseDates(plan,ph),a=dd[0],b=dd[1];
    if(link){var la=cpParse(link.start),lb=cpParse(link.end);if(la&&lb&&lb>=la){a=la;b=lb;}}
    return {key:ph.key,name:ph.name,what:ph.what||'',a:a,b:b,w0:Math.max(1,weekOf(a)),w1:Math.max(1,weekOf(b)),status:link?link.status:'pending',progress:link?Number(link.progress)||0:0};
  });
  var W=Math.max.apply(null,phases.map(function(x){return x.w1;}));
  var byKey={};phases.forEach(function(x){byKey[x.key]=x;});
  var wk=new Array(W+2).fill(0),total=0;
  var secWeeks=plan.sections.map(function(s){
    var a=new Array(W+2).fill(0);total+=Number(s.total)||0;
    (s.alloc||[]).forEach(function(al){
      if(al.phase&&byKey[al.phase]){var ph=byKey[al.phase],n=ph.w1-ph.w0+1;for(var w=ph.w0;w<=ph.w1;w++)a[w]+=al.amount/n;}
      else if(al.week){a[Math.min(Math.max(1,al.week),W)]+=al.amount;}
    });
    if(s.spread_all)for(var w=1;w<=W;w++)a[w]+=s.spread_all/W;
    for(var w2=1;w2<=W;w2++)wk[w2]+=a[w2];
    return a;
  });
  var cum=[0];for(var w=1;w<=W;w++)cum[w]=cum[w-1]+wk[w]*(1+vat);
  var dateOfWeek=function(w){return new Date(t0.getTime()+(w-1)*7*CP_DAY);};
  var months=[];
  for(var w3=1;w3<=W;w3++){var d=dateOfWeek(w3),key=d.getFullYear()*12+d.getMonth(),m=months.find(function(q){return q.key===key;});
    if(!m){m={key:key,d:d,v:0,paid:0,w0:w3,w1:w3,ph:[]};months.push(m);}m.v+=wk[w3]*(1+vat);m.w1=w3;
    phases.forEach(function(ph){if(ph.w0<=w3&&w3<=ph.w1&&m.ph.indexOf(ph.name)<0)m.ph.push(ph.name);});}
  (p.payments||[]).forEach(function(pay){if(pay.status==='pending')return;var d=cpParse(pay.date);if(!d)return;var key=d.getFullYear()*12+d.getMonth();var m=months.find(function(q){return q.key===key;});if(m)m.paid+=Number(pay.amount)||0;});
  var fp=plan.frame_payments||null;
  var pays=fp?(fp.items||[]).map(function(it){return {w:it.week,t:it.what,pct:it.pct,v:fp.amount*it.pct/100*(1+vat)};}):[];
  var now=weekOf(new Date());
  return {plan:plan,vat:vat,phases:phases,W:W,wk:wk,cum:cum,total:total,totalVat:total*(1+vat),secWeeks:secWeeks,months:months,pays:pays,dateOfWeek:dateOfWeek,now:now,
    dec:(plan.decisions||[]).slice().sort(function(a,b){return a.week-b.week;})};
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
function renderClientPlanTabHtml(p,isAdminUser,activeTab){
  var html='<div id="tab-plan" class="tab-content '+(activeTab==='plan'?'active':'')+'">'+CP_CSS;
  if(isAdminUser)html+='<div class="cp-admin"><label class="btn btn-outline btn-sm" style="cursor:pointer">'+cpIc('upload')+' ייבוא תכנית לקוח (JSON)<input type="file" accept=".json,application/json" style="display:none" onchange="cpImport(this)"></label>'+
    (p.client_plan?'<button type="button" class="btn btn-outline btn-sm" onclick="cpRemove()">'+cpIc('trash-2')+' הסרת התכנית</button><span class="cp-mut">הלקוח רואה את הלשונית הזו. תאריכי השלבים נלקחים מלשונית "לוח זמנים".</span>':'<span class="cp-mut">ייבוא קובץ תכנית (JSON מהמחשב) יוצר את השלבים בלוח הזמנים ואת דף התקציב ללקוח.</span>')+'</div>';
  var M=cpModel(p);cpState=M;
  if(!M){return html+'<div class="empty-state"><div class="empty-icon">'+cpIc('calendar-range')+'</div><p>עוד אין תקציב ולוח זמנים ללקוח בפרויקט הזה</p></div></div>';}
  var plan=M.plan,vat=M.vat,end=new Date(M.phases[M.phases.length-1].b.getTime());
  var w=Math.min(Math.max(1,M.now),M.W);
  html+='<div class="cp-kpi"><div><b>'+cpNis(M.totalVat)+'</b><span>עלות כוללת · '+cpNis(M.total)+' לפני מע"מ</span></div>'+
    '<div><b>'+M.W+' שבועות</b><span>כ-'+Math.round(M.W/4.33)+' חודשי עבודה</span></div>'+
    '<div><b>'+cpDate(M.phases[0].a)+'</b><span>התחלה · מסירה משוערת '+cpDate(end)+'</span></div></div>';
  html+='<p class="cp-mut" style="margin:-6px 0 12px">לפי '+cpEsc(plan.estimate||'האומדן')+' · כל הסכומים כוללים מע"מ '+Math.round(vat*100)+'% · לוח הזמנים מתעדכן לפי ההתקדמות באתר</p>';
  html+='<div class="cp-h">שבוע אחרי שבוע</div><p class="cp-lead">גררו את הסרגל: רואים איך הבית נראה באותו שבוע, מה עושים באתר, כמה כבר הושקע ומה צריך להחליט בקרוב.</p><div class="cp-card">'+
    (plan.model_url?'<iframe class="cp-model" id="cp-model" src="'+cpEsc(plan.model_url)+'?stage='+cpStageOfWeek(M,w)+'" title="מודל הבית לפי שלבים" onload="cpShow(document.getElementById(\'cp-r\').value)"></iframe>':'')+
    '<div class="cp-wk"><input id="cp-r" type="range" min="1" max="'+M.W+'" value="'+w+'" aria-label="שבוע בפרויקט" oninput="cpStop();cpShow(this.value)"><button type="button" class="btn btn-outline btn-sm" id="cp-play" onclick="cpPlay()">הפעלה</button><button type="button" class="btn btn-outline btn-sm" onclick="cpStop();cpShow('+w+')">היום</button></div>'+
    '<div class="cp-now"><div><div class="cp-mut" id="cp-wd"></div><h3 id="cp-wn"></h3><p id="cp-ww"></p><div class="cp-mut" id="cp-wst" style="margin-top:6px"></div></div>'+
    '<div><div class="cp-mut">מתוכנן להיות מושקע עד סוף השבוע</div><div class="cp-big" id="cp-wc"></div><div class="cp-meter"><i id="cp-wm"></i></div><div class="cp-mut" id="cp-wp"></div><div class="cp-nx"><div id="cp-nd"></div><div id="cp-np"></div></div></div></div></div>';
  var anyPaid=M.months.some(function(m){return m.paid>0;});
  html+='<div class="cp-h">כמה כסף צריך בכל חודש</div><p class="cp-lead">ההוצאה המתוכננת לפי חודש הביצוע. השלד משולם לפי אבני הדרך בחוזה, ולכן יש בו קפיצות; שאר העבודות לפי ההתקדמות.</p>'+
    '<div class="cp-card cp-chart" id="cp-chart">'+(anyPaid?'<div class="cp-leg"><span><i style="background:var(--primary)"></i>מתוכנן</span><span><i style="background:var(--success)"></i>שולם בפועל</span></div>':'')+cpChartSvg(M)+'<div class="cp-tip" id="cp-tip" role="status"></div></div>';
  html+='<div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>חודש</th><th>מה עושים</th><th>מתוכנן בחודש</th><th>מצטבר</th>'+(anyPaid?'<th>שולם בפועל</th>':'')+'</tr></thead><tbody>';
  var run=0;M.months.forEach(function(m,i){run+=m.v;html+='<tr data-cpm="'+i+'"><td>'+m.d.toLocaleDateString('he-IL',{month:'long',year:'numeric'})+'</td><td>'+cpEsc(m.ph.join(', '))+'</td><td style="white-space:nowrap">'+cpNis(m.v)+'</td><td style="white-space:nowrap">'+cpNis(run)+'</td>'+(anyPaid?'<td style="white-space:nowrap">'+(m.paid?cpNis(m.paid):'')+'</td>':'')+'</tr>';});
  html+='</tbody></table></div>';
  var order=plan.sections.map(function(s,i){return i;}).sort(function(a,b){return plan.sections[b].total-plan.sections[a].total;}),topPct=plan.sections[order[0]].total/M.total;
  html+='<div class="cp-h">על מה הולך הכסף</div><p class="cp-lead">לחצו על פרק כדי לראות מה כלול בו ומתי משלמים עליו. "קומפלט" הוא מחיר כולל לכל העבודה; "הערכה" הוא סעיף שעוד אין לו תוכנית סופית.</p><div>';
  order.forEach(function(i){var s=plan.sections[i],pct=s.total/M.total,ws=[];for(var x=1;x<=M.W;x++)if(M.secWeeks[i][x]>1)ws.push(x);
    var when=ws.length?('שבועות '+ws[0]+'–'+ws[ws.length-1]):'';
    html+='<details class="cp-sec"><summary><span class="cp-sn">'+cpEsc(s.name)+(s.tag?'<span class="cp-tag">'+cpEsc(s.tag)+'</span>':'')+'</span><span class="cp-sv">'+cpNis(s.total*(1+vat))+'</span><span class="cp-bar" aria-hidden="true"><i style="width:'+(pct/topPct*100)+'%"></i></span><span class="cp-sp">'+(pct*100).toFixed(1)+'%</span></summary>'+
      '<div class="cp-sd"><p>'+cpEsc(s.inc||'')+'</p>'+((s.qty||[]).length?'<ul>'+s.qty.map(function(q){return '<li>'+cpEsc(q)+'</li>';}).join('')+'</ul>':'')+(when?'<p class="cp-mut">מתי משלמים: '+when+(s.spread_all?' (לאורך כל הפרויקט)':'')+'</p>':'')+'</div></details>';});
  html+='</div><div class="cp-sum"><span>סה"כ כולל מע"מ</span><span>'+cpNis(M.totalVat)+'</span></div>';
  var fp=plan.frame_payments;
  if(fp){html+='<div class="cp-h">תשלומי השלד לפי החוזה</div><p class="cp-lead">בחוזה עם '+cpEsc(fp.contractor||'קבלן השלד')+(fp.contract_date?' ('+cpEsc(fp.contract_date)+')':'')+' השלד משולם בשלבים, רק אחרי שהשלב גמור ונבדק בפיקוח'+(fp.days?'. החוזה קובע '+fp.days+' יום לשלד':'')+'. הסכומים לפי '+cpNis(fp.amount*(1+vat))+' כולל מע"מ.</p>'+
    '<div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>שלב</th><th>אחוז</th><th>סכום</th><th>מתי (לפי התכנון)</th></tr></thead><tbody>'+
    M.pays.map(function(q){return '<tr><td>'+cpEsc(q.t)+'</td><td>'+q.pct+'%</td><td style="white-space:nowrap">'+cpNis(q.v)+'</td><td style="white-space:nowrap">שבוע '+q.w+' · '+cpDate(M.dateOfWeek(q.w))+'</td></tr>';}).join('')+'</tbody></table></div>';}
  if(M.dec.length){html+='<div class="cp-h">מה אתם צריכים להחליט, ועד מתי</div><p class="cp-lead">החלטה שמגיעה באיחור עוצרת את האתר. אלה המועדים האחרונים ששומרים על לוח הזמנים.</p><ul class="cp-dec" id="cp-dec">'+
    M.dec.map(function(d){return '<li data-w="'+d.week+'"><b>'+(d.week?'עד שבוע '+d.week:'לפני ההתחלה')+'</b><span class="cp-mut">'+cpDate(M.dateOfWeek(Math.max(1,d.week)))+'</span><div>'+cpEsc(d.what)+'<small>'+cpEsc(d.why||'')+'</small></div></li>';}).join('')+'</ul>';}
  html+='<div class="cp-h">שלבי הבנייה</div><div class="cp-wrap"><table class="cp-tbl"><thead><tr><th>שלב</th><th>תאריכים</th><th>מצב</th><th>מה עושים</th></tr></thead><tbody>'+
    M.phases.map(function(ph,i){var st=ph.status==='done'?'הושלם':ph.status==='active'?'בביצוע '+ph.progress+'%':'ממתין';return '<tr data-cpp="'+i+'"><td>'+cpEsc(ph.name)+'</td><td style="white-space:nowrap">'+cpDate(ph.a)+' – '+cpDate(ph.b)+'</td><td><span class="cp-st '+(ph.status||'pending')+'">'+st+'</span></td><td>'+cpEsc(ph.what)+'</td></tr>';}).join('')+'</tbody></table></div>';
  if((plan.not_included||[]).length)html+='<div class="cp-h">מה לא כלול בסכום</div><div class="cp-card"><ul style="margin:0;padding-inline-start:18px">'+plan.not_included.map(function(x){return '<li>'+cpEsc(x)+'</li>';}).join('')+'</ul></div>';
  html+='<p class="cp-mut">הסכומים לפי האומדן של ארונשטיין'+(plan.index?', '+cpEsc(plan.index):'')+'. החלוקה לחודשים מניחה שכל קבלן מקבל תשלום לפי קצב העבודה שלו.</p>';
  return html+'</div>';
}
function cpShow(w){
  var M=cpState;if(!M)return;w=Math.min(Math.max(1,+w||1),M.W);var $=function(i){return document.getElementById(i);};if(!$('cp-r'))return;
  $('cp-r').value=w;var last=w>=M.W,cur=M.phases.filter(function(ph){return ph.w0<=w&&w<=ph.w1;}),ph=cur[cur.length-1]||M.phases[0];
  $('cp-wd').textContent='שבוע '+w+' מתוך '+M.W+' · '+cpDate(M.dateOfWeek(w))+(w===M.now?' · השבוע':'');
  $('cp-wn').textContent=last?'הבית גמור':cur.map(function(x){return x.name;}).join(' + ');$('cp-ww').textContent=ph.what;
  $('cp-wst').textContent=cur.map(function(x){return x.status==='done'?x.name+': הושלם':x.status==='active'?x.name+': בביצוע, '+x.progress+'%':'';}).filter(Boolean).join(' · ');
  var c=M.cum[w];$('cp-wc').textContent=cpNis(c);$('cp-wm').style.width=(c/M.totalVat*100)+'%';$('cp-wp').textContent=Math.round(c/M.totalVat*100)+'% מהתקציב · נשאר '+cpNis(M.totalVat-c);
  var d=M.dec.filter(function(x){return x.week>=w;})[0];$('cp-nd').innerHTML=d?'<b>ההחלטה הבאה:</b> '+cpEsc(d.what)+' (עד שבוע '+d.week+')':'<b>כל ההחלטות התקבלו</b>';
  var q=M.pays.filter(function(x){return x.w>=w;})[0];$('cp-np').innerHTML=M.pays.length?(q?'<b>תשלום השלד הבא:</b> '+cpNis(q.v)+', '+cpEsc(q.t)+' (שבוע '+q.w+')':'<b>תשלומי השלד הסתיימו</b>'):'';
  document.querySelectorAll('#cp-dec li').forEach(function(li){var x=+li.dataset.w;li.classList.toggle('past',x<w&&!(x===0&&w===1));li.classList.toggle('soon',x>=w&&x<w+6);});
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
async function cpImport(input){
  if(!cpA().requireAdmin||!cpA().requireAdmin())return;var file=input.files&&input.files[0];input.value='';if(!file)return;
  var plan;try{plan=JSON.parse(await file.text());}catch(e){cpA().showToast('הקובץ אינו JSON תקין','error');return;}
  if(!plan||!Array.isArray(plan.phases)||!Array.isArray(plan.sections)||!cpParse(plan.start)){cpA().showToast('בקובץ חסרים שלבים, פרקים או תאריך התחלה','error');return;}
  var data=cpA().getData(),cur=cpA().getCurrentProject(),proj=cur&&data.projects.find(function(x){return x.id===cur.id;});if(!proj)return;
  proj.phases=proj.phases||[];
  var newCount=0,linked=0;
  plan.phases.forEach(function(ph,i){
    var dd=cpPlanPhaseDates(plan,ph),cost=0;
    plan.sections.forEach(function(s){(s.alloc||[]).forEach(function(al){if(al.phase===ph.key)cost+=al.amount;else if(al.week&&al.week>=ph.start_week&&al.week<ph.start_week+ph.weeks&&!plan.phases.slice(i+1).some(function(o){return al.week>=o.start_week&&al.week<o.start_week+o.weeks;}))cost+=al.amount;});});
    var ex=proj.phases.find(function(x){return x.cp_key===ph.key;})||proj.phases.find(function(x){return !x.cp_key&&String(x.name).trim()===ph.name;});
    if(ex){ex.cp_key=ph.key;if(!ex.start||!ex.end){ex.start=cpIso(dd[0]);ex.end=cpIso(dd[1]);}ex.planned_cost=Math.round(cost);linked++;}
    else{proj.phases.push({id:'ph'+Date.now()+'_'+i,name:ph.name,start:cpIso(dd[0]),end:cpIso(dd[1]),progress:0,status:'pending',planned_cost:Math.round(cost),depends_on:[],cp_key:ph.key});newCount++;}
  });
  if(!confirm('לייבא את התכנית "'+(plan.estimate||file.name)+'"?\n'+newCount+' שלבים חדשים יתווספו ללוח הזמנים, '+linked+' שלבים קיימים יקושרו.'))return;
  proj.client_plan=plan;
  cpA().logActivity('ייבוא תכנית לקוח','פרויקט: '+proj.name+' · '+(plan.estimate||file.name));
  if(!await cpA().saveData(data))return;
  cpA().showToast('התכנית יובאה');cpA().setTab('plan');cpA().renderProjectDetail(document.getElementById('main-content'));
}
async function cpRemove(){
  if(!cpA().requireAdmin||!cpA().requireAdmin())return;if(!confirm('להסיר את דף התקציב והזמנים מהפרויקט? השלבים בלוח הזמנים נשארים.'))return;
  var data=cpA().getData(),cur=cpA().getCurrentProject(),proj=cur&&data.projects.find(function(x){return x.id===cur.id;});if(!proj)return;
  delete proj.client_plan;if(!await cpA().saveData(data))return;cpA().showToast('התכנית הוסרה');cpA().renderProjectDetail(document.getElementById('main-content'));
}
/* ===== end client_plan ===== */
