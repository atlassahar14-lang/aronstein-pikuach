/* ===== התקציב (תצוגת קריאה בלבד) =====
   The detailed budget approved into the project (p.approvedBudgetId), for the client and the admin.
   - Read only: nothing here writes. The database also lets a client read only his own approved budget.
   - Always current: lines come from budget_items and are re-read when the tab opens, so an admin edit
     in "בניית תקציב" shows here; the project total follows through syncApprovedBudgetToProject.
   - If the budget has a margin, it is spread over the line prices, so the lines add up to the total.
   - "שולם" per section = approved payments of the same category, counted before VAT. */
function cbA(){return window.__app||{};}
function cbEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cbNis(x,dec){var v=Number(x)||0;if(!dec)v=Math.round(v);else v=Math.round(v*100)/100;return '₪'+v.toLocaleString('he-IL',{minimumFractionDigits:dec&&v%1?2:0,maximumFractionDigits:dec?2:0});}
function cbQty(x){var v=Math.round((Number(x)||0)*100)/100;return v.toLocaleString('he-IL',{maximumFractionDigits:2});}
function cbDate(s){if(!s)return '';var p=String(s).slice(0,10).split('-');return p.length===3?(+p[2])+'.'+(+p[1])+'.'+p[0]:String(s);}
var cbMeta={},cbLoading={},cbLoadedAt={},CB_TAB='approved-budget';

function cbEnsure(p){
  var A=cbA(),id=p&&p.approvedBudgetId;if(!id)return;
  // Re-read the lines when the tab opens (at most once a minute), so an admin edit always shows.
  var fresh=cbLoadedAt[id]&&Date.now()-cbLoadedAt[id]<60000;
  if(!fresh&&!cbLoading[id]&&A.refreshBudgetItems){
    cbLoading[id]=1;
    var meta=A.supabase?A.supabase.from('budgets').select('id,title,client_name,project_address,budget_date,notes,margin_percent').eq('id',id).maybeSingle():Promise.resolve({});
    Promise.all([A.refreshBudgetItems(id),meta]).then(function(r){
      var m=r[1]&&r[1].data;if(m)cbMeta[id]=m;cbLoadedAt[id]=Date.now();cbLoading[id]=0;cbRerender();
    }).catch(function(){cbLoadedAt[id]=Date.now();cbLoading[id]=0;cbRerender();});
  }
}
function cbRerender(){
  var el=document.getElementById('tab-'+CB_TAB),A=cbA();if(!el||!A.getCurrentProject)return;
  var q=(document.getElementById('cb-q')||{}).value||'',open=cbOpenSet();
  var box=document.createElement('div');
  box.innerHTML=renderClientBudgetTabHtml(A.getCurrentProject(),A.isAdmin&&A.isAdmin(),el.classList.contains('active')?CB_TAB:'');
  el.replaceWith(box.firstElementChild);
  document.querySelectorAll('#tab-'+CB_TAB+' details.cb-sec').forEach(function(d){if(open[d.dataset.i])d.open=true;});
  if(q){var i=document.getElementById('cb-q');if(i){i.value=q;cbSearch(q);}}
  if(window.lucide)try{lucide.createIcons();}catch(e){}
}
function cbOpenSet(){var o={};document.querySelectorAll('#tab-'+CB_TAB+' details.cb-sec[open]').forEach(function(d){o[d.dataset.i]=1;});return o;}

function cbModel(p){
  var A=cbA(),id=p.approvedBudgetId;if(!id)return null;
  var items=(A.getBudgetItems&&A.getBudgetItems(id))||[];if(!items.length)return {id:id,empty:true};
  var meta=cbMeta[id]||{},vat=A.vatRate!=null?Number(A.vatRate):0.18;
  var sub=items.reduce(function(s,it){return s+(Number(it.quantity)||0)*(Number(it.unitPrice)||0);},0);
  var margin=meta.margin_percent!=null?Number(meta.margin_percent)||0:null;
  var before=margin!=null?sub*(1+margin/100):(Number(p.approvedBudgetBeforeVat)||sub);
  var f=sub?before/sub:1;
  var secs=[],by={};
  items.forEach(function(it){var c=(it.category||'').trim()||'אחר';if(!Object.prototype.hasOwnProperty.call(by,c)){by[c]={name:c,lines:[],total:0};secs.push(by[c]);}
    var q=Number(it.quantity)||0,u=(Number(it.unitPrice)||0)*f;by[c].lines.push({d:it.description||'',unit:it.unit||'',q:q,u:u,t:q*u});by[c].total+=q*u;});
  // Paid so far, per category and overall (approved payments, before VAT).
  var paidBy={},paid=0;(p.payments||[]).forEach(function(x){if(A.paymentApproved&&!A.paymentApproved(x))return;if(!A.paymentApproved&&(x.status==='pending'||x.awaiting_approval))return;
    var v=A.paymentNet?A.paymentNet(x):Number(x.amount)||0;paid+=v;var c=(x.category||'').trim();paidBy[c]=(paidBy[c]||0)+v;});
  secs.forEach(function(s){s.paid=paidBy[s.name]||0;s.count=s.lines.filter(function(l){return l.u>0;}).length;});
  return {id:id,name:p.approvedBudgetName||meta.client_name||meta.title||'התקציב המאושר',date:meta.budget_date||p.approvedBudgetAt||'',notes:meta.notes||'',
    secs:secs.filter(function(s){return s.lines.length;}),before:before,vat:before*vat,vatRate:vat,paid:paid};
}

function renderClientBudgetTabHtml(p,isAdminUser,activeTab){
  var on=activeTab===CB_TAB;
  var open='<div id="tab-'+CB_TAB+'" class="tab-content'+(on?' active':'')+'">'+CB_CSS;
  if(!p||!p.approvedBudgetId)return open+'<div class="cb-empty">'+(isAdminUser?'<b>עדיין לא אושר תקציב לפרויקט הזה.</b><br>ב"בניית תקציב" לוחצים "אישור" ובוחרים את הפרויקט. אחרי זה הלקוח יראה כאן את התקציב המפורט.':'התקציב המפורט יופיע כאן אחרי שהמפקח יאשר אותו.')+'</div></div>';
  cbEnsure(p);
  var M=cbModel(p);
  if(!M||M.empty)return open+'<div class="cb-empty">'+(cbLoading[p.approvedBudgetId]||!cbLoadedAt[p.approvedBudgetId]?'טוען את התקציב...':'לא נמצאו שורות בתקציב.')+'</div></div>';
  var pct=M.before?Math.min(100,Math.round(M.paid/M.before*100)):0;
  var h=open+
    '<div class="cb-head"><div><h2 class="cb-title">התקציב המאושר</h2><div class="cb-sub">'+cbEsc(M.name)+(M.date?' · '+cbDate(M.date):'')+'</div></div>'+
    '<div class="cb-ro">'+(isAdminUser?'כך הלקוח רואה את התקציב. הוא יכול רק לקרוא.':'לקריאה בלבד · מתעדכן אוטומטית כשהמפקח מעדכן')+'</div></div>'+
    '<div class="cb-kpi"><div><span>לפני מע"מ</span><b>'+cbNis(M.before)+'</b></div><div><span>מע"מ '+Math.round(M.vatRate*100)+'%</span><b>'+cbNis(M.vat)+'</b></div><div class="cb-strong"><span>כולל מע"מ</span><b>'+cbNis(M.before+M.vat)+'</b></div></div>'+
    '<div class="cb-paid"><div class="cb-paid-row"><span>שולם עד היום (לפני מע"מ)</span><b>'+cbNis(M.paid)+' · '+pct+'%</b></div><div class="cb-bar"><i style="width:'+pct+'%"></i></div><div class="cb-paid-row cb-muted"><span>נותר מהתקציב</span><span>'+cbNis(Math.max(0,M.before-M.paid))+'</span></div></div>'+
    '<div class="cb-tools"><input id="cb-q" type="search" placeholder="חיפוש בתקציב (למשל: חלונות, ריצוף)" aria-label="חיפוש בתקציב" oninput="cbSearch(this.value)">'+
    '<div class="cb-btns"><button type="button" class="btn btn-outline btn-sm" onclick="cbToggleAll(true)">פתיחת הכול</button><button type="button" class="btn btn-outline btn-sm" onclick="cbToggleAll(false)">סגירת הכול</button>'+
    '<button type="button" class="btn btn-outline btn-sm" onclick="cbExportExcel()">ייצוא לאקסל</button><button type="button" class="btn btn-outline btn-sm" onclick="cbExportPdf()">ייצוא ל-PDF</button>'+
    (isAdminUser?'<button type="button" class="btn btn-primary btn-sm" onclick="cbEditBudget()">עריכת התקציב</button>':'')+'</div></div>'+
    '<div id="cb-none" class="cb-empty" hidden>לא נמצאו שורות שמתאימות לחיפוש.</div>'+
    '<div class="cb-list">';
  M.secs.forEach(function(s,i){
    var sp=M.before?Math.round(s.total/M.before*1000)/10:0,pp=s.total?Math.min(100,Math.round(s.paid/s.total*100)):0;
    h+='<details class="cb-sec" data-i="'+i+'"><summary><span class="cb-sname">'+cbEsc(s.name)+'</span><b class="cb-stotal">'+cbNis(s.total)+'</b><span class="cb-scount">'+s.count+' סעיפים · '+sp+'% מהתקציב</span>'+
      (s.paid>0?'<span class="cb-spaid"><span class="cb-bar sm"><i style="width:'+pp+'%"></i></span>שולם '+cbNis(s.paid)+'</span>':'')+'</summary>'+
      '<table class="cb-t"><thead><tr><th>תיאור</th><th>יחידה</th><th>כמות</th><th>מחיר ליחידה</th><th>סה"כ</th></tr></thead><tbody>'+
      s.lines.map(function(l){
        if(!l.q&&!l.u)return '<tr class="cb-note"><td colspan="5">'+cbEsc(l.d)+'</td></tr>';
        return '<tr><td class="cb-d">'+cbEsc(l.d)+'</td><td class="cb-u">'+cbEsc(l.unit)+'</td><td class="cb-n" data-l="כמות">'+cbQty(l.q)+'</td><td class="cb-n" data-l="מחיר ליחידה">'+(l.u?cbNis(l.u,1):'—')+'</td><td class="cb-n cb-tot" data-l="סה&quot;כ">'+(l.u?cbNis(l.t):'כלול')+'</td></tr>';
      }).join('')+
      '</tbody><tfoot><tr><td colspan="4">סה"כ '+cbEsc(s.name)+' (לפני מע"מ)</td><td class="cb-n">'+cbNis(s.total)+'</td></tr></tfoot></table></details>';
  });
  h+='</div>'+(M.notes?'<div class="cb-notes"><b>הערות לתקציב:</b> '+cbEsc(M.notes)+'</div>':'')+
    '<p class="cb-foot">המחירים לפני מע"מ. "שולם" כולל רק תשלומים מאושרים, לפי הקטגוריה שלהם ב"מעקב תשלומים". שאלה על סעיף? אפשר לכתוב בלשונית "שאלות".</p></div>';
  return h;
}

function cbSearch(q){
  q=String(q||'').trim().toLowerCase();var any=false;
  document.querySelectorAll('#tab-'+CB_TAB+' details.cb-sec').forEach(function(d){
    var name=(d.querySelector('.cb-sname')||{}).textContent||'',hit=0,nameHit=q&&name.toLowerCase().indexOf(q)>=0;
    d.querySelectorAll('tbody tr').forEach(function(tr){var m=!q||nameHit||tr.textContent.toLowerCase().indexOf(q)>=0;tr.hidden=!m;if(m)hit++;});
    d.hidden=q&&!hit;if(q&&hit)d.open=true;if(!d.hidden)any=true;
  });
  var none=document.getElementById('cb-none');if(none)none.hidden=any;
}
function cbToggleAll(open){document.querySelectorAll('#tab-'+CB_TAB+' details.cb-sec').forEach(function(d){if(!d.hidden)d.open=open;});}
function cbEditBudget(){
  var A=cbA(),p=A.getCurrentProject&&A.getCurrentProject();if(!A.isAdmin||!A.isAdmin()||!p||!p.approvedBudgetId)return;
  if(window.showView)window.showView('budget-builder');
  setTimeout(function(){if(window.openBudgetEdit)window.openBudgetEdit(p.approvedBudgetId);},400);
}
function cbFileName(p,ext){return 'תקציב-'+String(p.name||'פרויקט').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,'-').slice(0,40)+'.'+ext;}

function cbExportExcel(){
  var A=cbA(),p=A.getCurrentProject&&A.getCurrentProject();if(!p)return;var M=cbModel(p);
  if(!M||M.empty){A.showToast&&A.showToast('התקציב עדיין נטען','error');return;}
  if(!window.XLSX){A.showToast&&A.showToast('רכיב האקסל לא נטען. רענן את העמוד ונסה שוב.','error');return;}
  var r2=function(x){return Math.round((Number(x)||0)*100)/100;};
  var sum=[['תקציב: '+(p.name||'')+' · '+M.name],['ארונשטיין פיקוח וניהול'+(M.date?' · '+cbDate(M.date):'')],[],['פרק','סעיפים','סה"כ לפני מע"מ','אחוז מהתקציב','שולם עד היום']];
  M.secs.forEach(function(s){sum.push([s.name,s.count,r2(s.total),M.before?Math.round(s.total/M.before*1000)/10+'%':'',r2(s.paid)]);});
  sum.push([]);sum.push(['סה"כ לפני מע"מ','',r2(M.before)]);sum.push(['מע"מ '+Math.round(M.vatRate*100)+'%','',r2(M.vat)]);sum.push(['סה"כ כולל מע"מ','',r2(M.before+M.vat)]);sum.push(['שולם עד היום (לפני מע"מ)','',r2(M.paid)]);
  var det=[['פירוט התקציב: '+(p.name||'')],[],['פרק','תיאור','יחידה','כמות','מחיר ליחידה','סה"כ']];
  M.secs.forEach(function(s){s.lines.forEach(function(l,i){det.push([i?'':s.name,l.d,l.unit,l.q||'',l.u?r2(l.u):'',l.u?r2(l.t):(l.q?'כלול':'')]);});det.push(['סה"כ '+s.name,'','','','',r2(s.total)]);det.push([]);});
  det.push(['סה"כ לפני מע"מ','','','','',r2(M.before)]);
  var wb=XLSX.utils.book_new(),ws1=XLSX.utils.aoa_to_sheet(sum),ws2=XLSX.utils.aoa_to_sheet(det);
  ws1['!cols']=[{wch:30},{wch:9},{wch:16},{wch:13},{wch:15}];ws2['!cols']=[{wch:22},{wch:50},{wch:10},{wch:9},{wch:13},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws1,'סיכום');XLSX.utils.book_append_sheet(wb,ws2,'פירוט');
  wb.Workbook={Views:[{RTL:true}]};
  XLSX.writeFile(wb,cbFileName(p,'xlsx'));
}
async function cbExportPdf(){
  var A=cbA(),p=A.getCurrentProject&&A.getCurrentProject();if(!p)return;var M=cbModel(p);
  if(!M||M.empty){A.showToast&&A.showToast('התקציב עדיין נטען','error');return;}
  if(!A.reportPdf){A.showToast&&A.showToast('יצוא PDF לא זמין. רענן את העמוד.','error');return;}
  var th='padding:6px 7px;border-bottom:2px solid #152449;text-align:right;font-size:11.5px;color:#152449',td='padding:5px 7px;border-bottom:1px solid #e3e7ee;font-size:11.5px;text-align:right;vertical-align:top';
  var html='<div style="direction:rtl;font-family:Assistant,Heebo,Arial,sans-serif;color:#1a2332;padding:34px 38px;width:794px;box-sizing:border-box;background:#fff">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #b9821a;padding-bottom:10px;margin-bottom:16px"><div><div style="font-size:24px;font-weight:800;color:#152449">התקציב המאושר</div><div style="font-size:15px;margin-top:2px">'+cbEsc(p.name||'')+' · '+cbEsc(M.name)+'</div></div>'+
    '<div style="text-align:left;font-size:12px;color:#5b6577">ארונשטיין פיקוח וניהול<br>'+(M.date?'תאריך התקציב '+cbDate(M.date):'')+'</div></div>'+
    '<table style="width:100%;border-collapse:collapse;margin-bottom:18px"><tr><td style="'+td+'">סה"כ לפני מע"מ</td><td style="'+td+';font-weight:700">'+cbNis(M.before)+'</td><td style="'+td+'">מע"מ '+Math.round(M.vatRate*100)+'%</td><td style="'+td+';font-weight:700">'+cbNis(M.vat)+'</td><td style="'+td+'">כולל מע"מ</td><td style="'+td+';font-weight:800;color:#152449">'+cbNis(M.before+M.vat)+'</td></tr></table>'+
    '<div style="font-size:14px;font-weight:700;color:#152449;margin:0 0 6px">סיכום לפי פרקים</div><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><th style="'+th+'">פרק</th><th style="'+th+'">סעיפים</th><th style="'+th+'">סה"כ</th><th style="'+th+'">אחוז</th><th style="'+th+'">שולם</th></tr>'+
    M.secs.map(function(s){return '<tr><td style="'+td+'">'+cbEsc(s.name)+'</td><td style="'+td+'">'+s.count+'</td><td style="'+td+'">'+cbNis(s.total)+'</td><td style="'+td+'">'+(M.before?Math.round(s.total/M.before*1000)/10:0)+'%</td><td style="'+td+'">'+(s.paid?cbNis(s.paid):'—')+'</td></tr>';}).join('')+'</table>';
  M.secs.forEach(function(s){
    html+='<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;background:#152449;color:#fff;padding:6px 10px;border-radius:6px 6px 0 0;font-weight:700;font-size:13px"><span>'+cbEsc(s.name)+'</span><span>'+cbNis(s.total)+'</span></div>'+
      '<table style="width:100%;border-collapse:collapse"><tr><th style="'+th+'">תיאור</th><th style="'+th+'">יחידה</th><th style="'+th+'">כמות</th><th style="'+th+'">מחיר ליחידה</th><th style="'+th+'">סה"כ</th></tr>'+
      s.lines.map(function(l){if(!l.q&&!l.u)return '<tr><td colspan="5" style="'+td+';color:#5b6577">'+cbEsc(l.d)+'</td></tr>';
        return '<tr><td style="'+td+'">'+cbEsc(l.d)+'</td><td style="'+td+'">'+cbEsc(l.unit)+'</td><td style="'+td+'">'+cbQty(l.q)+'</td><td style="'+td+'">'+(l.u?cbNis(l.u,1):'—')+'</td><td style="'+td+'">'+(l.u?cbNis(l.t):'כלול')+'</td></tr>';}).join('')+'</table></div>';
  });
  html+=(M.notes?'<div style="font-size:12px;margin-top:8px"><b>הערות:</b> '+cbEsc(M.notes)+'</div>':'')+'<div style="font-size:11px;color:#5b6577;margin-top:12px">המחירים לפני מע"מ, אלא אם צוין אחרת.</div></div>';
  await A.reportPdf(html,cbFileName(p,'pdf'));
}

var CB_CSS='<style>'+
'#tab-approved-budget{--cb-line:var(--border,#dde3ea)}'+
'.cb-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:14px}.cb-title{margin:0;font-size:22px;color:var(--primary,#1B2B5E)}.cb-sub{color:var(--text-muted,#56657a);font-size:14px;margin-top:2px}'+
'.cb-ro{font-size:13px;color:var(--text-muted,#56657a);background:var(--bg,#f0f4f8);border-radius:999px;padding:5px 12px}'+
'.cb-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.cb-kpi>div{background:var(--card,#fff);border:1px solid var(--cb-line);border-radius:12px;padding:12px 14px;min-width:0}.cb-kpi span{display:block;font-size:13px;color:var(--text-muted,#56657a)}.cb-kpi b{font-size:clamp(16px,2.4vw,22px);font-variant-numeric:tabular-nums}.cb-kpi .cb-strong b{color:var(--primary,#1B2B5E)}'+
'.cb-paid{background:var(--card,#fff);border:1px solid var(--cb-line);border-radius:12px;padding:12px 14px;margin-bottom:14px;display:grid;gap:6px}.cb-paid-row{display:flex;justify-content:space-between;gap:8px;font-size:14px;flex-wrap:wrap}.cb-muted{color:var(--text-muted,#56657a);font-size:13px}'+
'.cb-bar{height:8px;background:var(--bg,#eef2f6);border-radius:99px;overflow:hidden}.cb-bar i{display:block;height:100%;background:var(--success,#15803d);border-radius:99px}.cb-bar.sm{display:inline-block;width:60px;height:6px;vertical-align:middle;margin-inline-end:6px}'+
'.cb-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.cb-tools input{flex:1 1 240px;min-width:0;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--cb-line);border-radius:10px;background:var(--card,#fff);color:inherit}.cb-btns{display:flex;gap:8px;flex-wrap:wrap}'+
'.cb-list{display:grid;gap:10px}.cb-sec{background:var(--card,#fff);border:1px solid var(--cb-line);border-radius:12px;overflow:hidden}'+
'.cb-sec>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:12px 14px;align-items:center}.cb-sec>summary::-webkit-details-marker{display:none}'+
'.cb-sec>summary::before{content:"";grid-row:1/3;display:none}.cb-sname{font-weight:700;font-size:16px}.cb-sname::before{content:"+";display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:var(--bg,#eef2f6);color:var(--primary,#1B2B5E);font-weight:800;margin-inline-end:8px;vertical-align:1px}.cb-sec[open] .cb-sname::before{content:"−"}.cb-stotal{font-size:16px;font-variant-numeric:tabular-nums;color:var(--primary,#1B2B5E)}.cb-scount,.cb-spaid{font-size:13px;color:var(--text-muted,#56657a)}.cb-spaid{text-align:left}'+
'.cb-sec[open]>summary{border-bottom:1px solid var(--cb-line);background:var(--bg,#f6f8fb)}'+
'.cb-t{width:100%;border-collapse:collapse;font-size:14px}.cb-t th{font-size:12.5px;color:var(--text-muted,#56657a);font-weight:600;text-align:right;padding:8px 12px;border-bottom:1px solid var(--cb-line)}.cb-t td{padding:8px 12px;border-bottom:1px solid var(--cb-line);vertical-align:top;text-align:right}'+
'.cb-n{font-variant-numeric:tabular-nums;white-space:nowrap}.cb-tot{font-weight:600}.cb-note td{color:var(--text-muted,#56657a);font-size:13px;background:var(--bg,#f8fafc)}.cb-t tfoot td{font-weight:700;border-bottom:0}'+
'.cb-empty{padding:28px 16px;text-align:center;color:var(--text-muted,#56657a);background:var(--card,#fff);border:1px dashed var(--cb-line);border-radius:12px;line-height:1.7}'+
'.cb-notes{margin-top:12px;font-size:14px;background:var(--card,#fff);border:1px solid var(--cb-line);border-radius:12px;padding:12px 14px}.cb-foot{font-size:13px;color:var(--text-muted,#56657a);margin:12px 2px 0}'+
'@media (max-width:640px){.cb-kpi{gap:6px}.cb-kpi>div{padding:10px 8px}.cb-kpi span{font-size:11.5px}.cb-btns .btn{flex:1 1 calc(50% - 4px)}'+
'.cb-t thead{display:none}.cb-t,.cb-t tbody,.cb-t tr,.cb-t td,.cb-t tfoot{display:block;width:100%}.cb-t tbody tr{padding:10px 12px;border-bottom:1px solid var(--cb-line);display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px}.cb-t tbody td{border:0;padding:0}'+
'.cb-t td.cb-d{grid-column:1/-1;font-weight:600}.cb-t td.cb-u{display:none}.cb-t td.cb-n::before{content:attr(data-l);display:block;font-size:11px;color:var(--text-muted,#56657a);font-weight:400}.cb-t tr.cb-note{display:block}.cb-t tr.cb-note td{background:none}'+
'.cb-t tfoot tr{display:flex;justify-content:space-between;padding:10px 12px}.cb-t tfoot td{padding:0;width:auto}}'+
'</style>';
/* ===== end client budget ===== */
