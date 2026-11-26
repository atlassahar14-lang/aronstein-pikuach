/* ===== הוספת הוצאה (לקוח ומנהל) =====
   A one-button "add expense" window for the client who is building the house.
   The expense is saved into the project's payments (p.payments), so it shows in "מעקב תשלומים",
   counts as paid, and feeds "תקציב וזמנים". Fields: what, amount, VAT included or not, category, date, paid to.
   Stored: amount = total incl. VAT (like every payment), plus amount_before_vat, vat_amount, vat_mode, added_by. */
function exA(){return window.__app||{};}
function exEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function exNis(x){var v=Math.round((Number(x)||0)*100)/100;return '₪'+v.toLocaleString('he-IL',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});}
function exVat(){var v=exA().vatRate;return v!=null?Number(v):0.18;}
function exToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// Categories the client recognises: the project's approved budget, else the imported plan, else the budget plan, else the usual list.
function exCategories(p){
  var A=exA(),out=[];var add=function(c){c=String(c||'').trim();if(c&&out.indexOf(c)<0)out.push(c);};
  if(p.approvedBudgetId&&A.getBudgetItems){var by={};(A.getBudgetItems(p.approvedBudgetId)||[]).forEach(function(it){by[it.category]=(by[it.category]||0)+(Number(it.quantity)||0)*(Number(it.unitPrice)||0);});
    var plan=p.client_plan,nice={};((plan&&plan.sections)||[]).forEach(function(s){if(s.budget_category)nice[s.budget_category]=s.name;});
    Object.keys(by).forEach(function(c){if(by[c]>0)add(nice[c]||c);});}
  if(!out.length&&p.client_plan&&p.client_plan.sections)p.client_plan.sections.forEach(function(s){add(s.name);});
  if(!out.length&&p.budgetPlan)Object.keys(p.budgetPlan).forEach(add);
  if(!out.length)['שלד','חשמל','אינסטלציה','טיח','ריצוף','אלומיניום','נגרות','מטבח','צבע','גבס','מיזוג אוויר','פיתוח'].forEach(add);
  (p.payments||[]).forEach(function(x){if(x.added_by==='client')add(x.category);});
  add('אחר');return out;
}
var EX_CSS='<style id="ex-css">'+
'.ex-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:3000;display:flex;align-items:flex-end;justify-content:center;padding:env(safe-area-inset-top,0) 0 0}'+
'@media(min-width:700px){.ex-ov{align-items:center}}'+
'.ex-m{background:var(--card,#fff);color:var(--text,#1a2332);width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 10px 40px rgba(0,0,0,.25);max-height:92vh;overflow:auto;direction:rtl}'+
'@media(min-width:700px){.ex-m{border-radius:16px}}'+
'.ex-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.ex-h b{font-size:19px;color:var(--primary,#1B2B5E)}'+
'.ex-x{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:var(--text-muted,#6b7a8d);padding:4px 8px}'+
'.ex-f{display:grid;gap:5px;margin-bottom:12px}.ex-f label{font-size:14px;font-weight:600}.ex-f input,.ex-f select{font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--border,#dde3ea);border-radius:10px;background:var(--card,#fff);color:inherit;width:100%;box-sizing:border-box}'+
'.ex-f input:focus,.ex-f select:focus{outline:2px solid var(--primary,#1B2B5E);outline-offset:0}'+
'.ex-vat{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ex-vat label{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border,#dde3ea);border-radius:10px;padding:10px;font-weight:600;cursor:pointer;font-size:14px}'+
'.ex-vat input{width:auto;margin:0}.ex-vat label:has(input:checked){border-color:var(--primary,#1B2B5E);background:var(--bg,#f0f4f8);color:var(--primary,#1B2B5E)}'+
'.ex-calc{background:var(--bg,#f0f4f8);border-radius:10px;padding:10px 12px;font-size:14px;display:grid;gap:3px;font-variant-numeric:tabular-nums}.ex-calc div{display:flex;justify-content:space-between}.ex-calc .t{font-weight:700;color:var(--primary,#1B2B5E)}'+
'.ex-err{color:#b91c1c;font-size:13px;min-height:18px}'+
'.ex-act{display:flex;gap:10px;margin-top:6px}.ex-act button{flex:1;font:inherit;font-size:16px;font-weight:700;padding:13px;border-radius:12px;cursor:pointer;border:1px solid var(--border,#dde3ea);background:var(--card,#fff);color:inherit}'+
'.ex-act .ex-save{background:var(--primary,#1B2B5E);color:#fff;border-color:var(--primary,#1B2B5E)}.ex-act .ex-save[disabled]{opacity:.6}'+
'.ex-fab{position:fixed;left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:900;background:var(--accent,#e8a020);color:#fff;border:0;border-radius:999px;padding:14px 20px;font:inherit;font-size:16px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.2);cursor:pointer;display:flex;align-items:center;gap:6px}'+
'.ex-badge{display:inline-block;font-size:11.5px;font-weight:600;border-radius:10px;padding:1px 8px;margin-inline-start:6px;background:#fef3c7;color:#92400e;vertical-align:1px}'+
'.ex-badge.ok{background:#dcfce7;color:#166534}'+
'.ex-sub{display:block;font-size:12px;color:var(--text-muted,#6b7a8d);font-weight:400}'+
'</style>';
function exOpen(){
  var A=exA(),p=A.getCurrentProject&&A.getCurrentProject();if(!p){return;}
  exClose();if(!document.getElementById('ex-css'))document.head.insertAdjacentHTML('beforeend',EX_CSS);
  var cats=exCategories(p),r=Math.round(exVat()*100);
  var html='<div class="ex-ov" id="ex-ov" role="dialog" aria-modal="true" aria-labelledby="ex-title" onclick="if(event.target===this)exClose()"><div class="ex-m">'+
    '<div class="ex-h"><b id="ex-title">הוספת הוצאה</b><button type="button" class="ex-x" aria-label="סגירה" onclick="exClose()">×</button></div>'+
    '<div class="ex-f"><label for="ex-desc">על מה שילמת?</label><input id="ex-desc" type="text" placeholder="לדוגמה: מקדמה לחשמלאי, קניית אריחים" autocomplete="off"></div>'+
    '<div class="ex-f"><label for="ex-amount">סכום (₪)</label><input id="ex-amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" oninput="exCalc()"></div>'+
    '<div class="ex-f"><span style="font-size:14px;font-weight:600">המחיר כולל מע"מ?</span><div class="ex-vat">'+
      '<label><input type="radio" name="ex-vat" value="incl" checked onchange="exCalc()"> כולל מע"מ</label>'+
      '<label><input type="radio" name="ex-vat" value="excl" onchange="exCalc()"> לא כולל מע"מ</label></div></div>'+
    '<div class="ex-calc" id="ex-calc" aria-live="polite"></div>'+
    '<div class="ex-f" style="margin-top:12px"><label for="ex-cat">לאיזו קטגוריה זה שייך?</label><select id="ex-cat"><option value="">בחר קטגוריה</option>'+cats.map(function(c){return '<option>'+exEsc(c)+'</option>';}).join('')+'</select></div>'+
    '<div class="ex-f"><label for="ex-date">תאריך</label><input id="ex-date" type="date" value="'+exToday()+'"></div>'+
    '<div class="ex-f"><label for="ex-to">למי שולם? (לא חובה)</label><input id="ex-to" type="text" placeholder="שם הקבלן או החנות" autocomplete="off"></div>'+
    '<div class="ex-err" id="ex-err" role="alert"></div>'+
    '<div class="ex-act"><button type="button" onclick="exClose()">ביטול</button><button type="button" class="ex-save" id="ex-save" onclick="exSave()">שמירת ההוצאה</button></div>'+
    '<p class="ex-sub" style="margin-top:10px">המע"מ מחושב לפי '+r+'%. ההוצאה נכנסת ל"מעקב תשלומים" ונספרת בתקציב '+(exA().isAdmin&&exA().isAdmin()?'מיד':'אחרי אישור המפקח')+'.</p>'+
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);exCalc();
  setTimeout(function(){var d=document.getElementById('ex-desc');if(d)d.focus();},50);
  document.addEventListener('keydown',exKey);
}
function exKey(e){if(e.key==='Escape')exClose();}
function exClose(){var o=document.getElementById('ex-ov');if(o)o.remove();document.removeEventListener('keydown',exKey);}
function exParts(){
  var a=Number((document.getElementById('ex-amount')||{}).value)||0,m=(document.querySelector('input[name="ex-vat"]:checked')||{}).value||'incl',v=exVat();
  var before=m==='incl'?a/(1+v):a,total=m==='incl'?a:a*(1+v);
  return {mode:m,before:Math.round(before*100)/100,vat:Math.round((total-before)*100)/100,total:Math.round(total*100)/100};
}
function exCalc(){var el=document.getElementById('ex-calc');if(!el)return;var x=exParts();
  el.innerHTML='<div><span>לפני מע"מ</span><span>'+exNis(x.before)+'</span></div><div><span>מע"מ</span><span>'+exNis(x.vat)+'</span></div><div class="t"><span>סה"כ ששולם</span><span>'+exNis(x.total)+'</span></div>';}
async function exSave(){
  var A=exA(),err=document.getElementById('ex-err'),btn=document.getElementById('ex-save');
  var desc=document.getElementById('ex-desc').value.trim(),cat=document.getElementById('ex-cat').value,date=document.getElementById('ex-date').value,to=document.getElementById('ex-to').value.trim(),x=exParts();
  if(!desc){err.textContent='כתוב על מה שילמת';document.getElementById('ex-desc').focus();return;}
  if(!(x.total>0)){err.textContent='הכנס סכום גדול מאפס';document.getElementById('ex-amount').focus();return;}
  if(!cat){err.textContent='בחר קטגוריה';document.getElementById('ex-cat').focus();return;}
  if(!date){err.textContent='בחר תאריך';return;}
  err.textContent='';btn.disabled=true;btn.textContent='שומר...';
  var data=A.getData(),cur=A.getCurrentProject(),proj=cur&&data.projects.find(function(q){return q.id===cur.id;});
  if(!proj){err.textContent='הפרויקט לא נמצא. רענן את העמוד ונסה שוב.';btn.disabled=false;btn.textContent='שמירת ההוצאה';return;}
  var u=(A.getUser&&A.getUser())||{},isAdm=A.isAdmin&&A.isAdmin();
  proj.payments=proj.payments||[];
  proj.payments.push({id:'ex'+Date.now(),desc:desc,amount:x.total,amount_before_vat:x.before,vat_amount:x.vat,vat_mode:x.mode,date:date,to:to,category:cat,status:isAdm?'approved':'pending',awaiting_approval:!isAdm,
    added_by:isAdm?'admin':'client',added_by_id:u.id||'',added_by_name:u.name||'',added_at:new Date().toISOString()});
  var ok=await A.saveData(data);
  if(!ok){btn.disabled=false;btn.textContent='שמירת ההוצאה';err.textContent='השמירה נכשלה. בדוק חיבור לאינטרנט ונסה שוב.';return;}
  if(isAdm&&A.logActivity)A.logActivity('הוספת הוצאה','פרויקט: '+proj.name+' · '+desc+' · '+exNis(x.total));
  if(!isAdm&&A.notifyAdmin)A.notifyAdmin(u.name||'לקוח',proj.name,'הוצאה חדשה ממתינה לאישור: '+desc+' · '+exNis(x.total)+' · '+cat);
  exClose();if(A.showToast)A.showToast(isAdm?'ההוצאה נשמרה: '+exNis(x.total):'ההוצאה נשלחה לאישור המפקח: '+exNis(x.total));
  A.renderProjectDetail(document.getElementById('main-content'));
}
async function exDelete(id){
  var A=exA();var data=A.getData(),cur=A.getCurrentProject(),proj=cur&&data.projects.find(function(q){return q.id===cur.id;});if(!proj)return;
  var pay=(proj.payments||[]).find(function(q){return q.id===id;});if(!pay||!exCanDelete(pay))return;
  if(!window.confirm('למחוק את ההוצאה "'+pay.desc+'" ('+exNis(pay.amount)+')?'))return;
  proj.payments=proj.payments.filter(function(q){return q.id!==id;});
  if(!await A.saveData(data))return;A.showToast&&A.showToast('ההוצאה נמחקה');A.renderProjectDetail(document.getElementById('main-content'));
}
function exCanDelete(pay){var A=exA();if(A.isAdmin&&A.isAdmin())return false;var u=(A.getUser&&A.getUser())||{};return pay.added_by==='client'&&!!pay.awaiting_approval&&(!pay.added_by_id||pay.added_by_id===u.id);}
// Small pieces the payments list uses.
function exBadgeHtml(pay){
  if(!pay||!pay.added_by)return '';
  var adm=exA().isAdmin&&exA().isAdmin();
  var who=pay.added_by!=='client'?'':pay.awaiting_approval?'<span class="ex-badge">'+(adm?'ממתין לאישור שלך':'ממתין לאישור המפקח')+'</span>':'<span class="ex-badge ok">נוסף על ידי הלקוח · אושר</span>';
  var vat=pay.amount_before_vat!=null?'<span class="ex-sub">'+(pay.vat_mode==='excl'?'הוזן לפני מע"מ':pay.vat_mode==='none'?'ללא מע"מ':'הוזן כולל מע"מ')+' · לפני מע"מ: '+exNis(pay.amount_before_vat)+'</span>':'';
  return who+vat;
}
async function exApprove(id){
  var A=exA();if(!A.isAdmin||!A.isAdmin())return;
  var data=A.getData(),cur=A.getCurrentProject(),proj=cur&&data.projects.find(function(q){return q.id===cur.id;});if(!proj)return;
  var pay=(proj.payments||[]).find(function(q){return q.id===id;});if(!pay)return;var u=(A.getUser&&A.getUser())||{};
  pay.status='approved';pay.awaiting_approval=false;pay.approved_at=new Date().toISOString();pay.approved_by=u.name||'';
  if(!await A.saveData(data))return;
  if(A.logActivity)A.logActivity('אישור הוצאת לקוח','פרויקט: '+proj.name+' · '+pay.desc+' · '+exNis(pay.amount));
  A.showToast&&A.showToast('ההוצאה אושרה ונספרה בתקציב');A.renderProjectDetail(document.getElementById('main-content'));
}
function exPendingCount(p){return ((p&&p.payments)||[]).filter(function(x){return x.awaiting_approval;}).length;}
function exPendingBadge(){var A=exA();if(!A.isAdmin||!A.isAdmin()||!A.getCurrentProject)return '';var n=exPendingCount(A.getCurrentProject());return n?'<span class="tab-badge show" title="'+n+' הוצאות ממתינות לאישור"></span>':'';}
function exActionsHtml(pay){
  var A=exA();if(A.isAdmin&&A.isAdmin()&&pay&&pay.awaiting_approval)return '<button type="button" class="btn btn-primary btn-sm" onclick="exApprove(\''+pay.id+'\')">אישור ההוצאה</button>';
  return exCanDelete(pay)?'<button type="button" class="btn btn-outline btn-sm" onclick="exDelete(\''+pay.id+'\')" aria-label="מחיקת ההוצאה">מחיקה</button>':'';}
function exFabHtml(){if(!document.getElementById('ex-css'))document.head.insertAdjacentHTML('beforeend',EX_CSS);return '<button type="button" class="ex-fab" onclick="exOpen()" aria-label="הוספת הוצאה"><span style="font-size:20px;line-height:1">+</span> הוספת הוצאה</button>';}
/* ----- Export the payments, grouped by category: Excel and PDF ----- */
function exReportData(){
  var A=exA(),p=A.getCurrentProject&&A.getCurrentProject();if(!p)return null;
  var list=(A.filterPayments?A.filterPayments(p.payments):(p.payments||[])).slice();
  if(!list.length)return {p:p,groups:[],total:0};
  var order=exCategories(p),by={},groups=[];
  list.forEach(function(pay){var c=String(pay.category||'').trim()||'ללא קטגוריה';if(!by[c]){by[c]={name:c,rows:[],total:0,before:0,vat:0,split:true};groups.push(by[c]);}
    var g=by[c];g.rows.push(pay);var t=Number(pay.amount)||0;
    if(exStatus(pay)!=='מאושר')return;
    g.total+=t;
    if(pay.amount_before_vat!=null){g.before+=Number(pay.amount_before_vat)||0;g.vat+=Number(pay.vat_amount)||0;}else g.split=false;});
  groups.sort(function(a,b){var ia=order.indexOf(a.name),ib=order.indexOf(b.name);return (ia<0?999:ia)-(ib<0?999:ib)||a.name.localeCompare(b.name,'he');});
  groups.forEach(function(g){g.rows.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});});
  return {p:p,groups:groups,total:groups.reduce(function(s,g){return s+g.total;},0)};
}
function exStatus(pay){return pay.awaiting_approval?'ממתין לאישור (לא נספר)':String(pay.status||'').toLowerCase()==='pending'?'ממתין (לא נספר)':'מאושר';}
function exWho(pay){return pay.added_by==='client'?'לקוח':pay.added_by==='admin'?'מפקח':'מפקח';}
function exDateStr(s){var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?(+m[3])+'.'+(+m[2])+'.'+m[1]:String(s||'');}
function exFileName(p,ext){return 'הוצאות-לפי-קטגוריות-'+String(p.name||'פרויקט').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,'-').slice(0,40)+'.'+ext;}
function exExportExcel(){
  var A=exA(),D=exReportData();if(!D)return;
  if(!D.groups.length){A.showToast&&A.showToast('אין תשלומים לייצוא','error');return;}
  if(!window.XLSX){A.showToast&&A.showToast('רכיב האקסל לא נטען. רענן את העמוד ונסה שוב.','error');return;}
  var today=exDateStr(new Date().toISOString());
  var rows=[['הוצאות לפי קטגוריות: '+(D.p.name||'')],['הופק בתאריך '+today+' · ארונשטיין פיקוח וניהול'],[],
    ['קטגוריה','תאריך','תיאור','למי שולם','לפני מע"מ','מע"מ','סה"כ','סטטוס','הוזן ע"י']];
  D.groups.forEach(function(g){
    g.rows.forEach(function(pay,i){rows.push([i?'':g.name,exDateStr(pay.date),pay.desc||'',pay.to||'',pay.amount_before_vat!=null?Number(pay.amount_before_vat):'',pay.vat_amount!=null?Number(pay.vat_amount):'',Number(pay.amount)||0,exStatus(pay),exWho(pay)]);});
    rows.push(['סה"כ '+g.name,'','','',g.split?Math.round(g.before*100)/100:'',g.split?Math.round(g.vat*100)/100:'',Math.round(g.total*100)/100,'','']);rows.push([]);
  });
  rows.push(['סה"כ כללי','','','','','',Math.round(D.total*100)/100,'','']);
  rows.push([]);rows.push(['לפני מע"מ ומע"מ מופיעים רק בהוצאות שהוזנו דרך "הוספת הוצאה". הסה"כ הוא הסכום ששולם בפועל.']);
  var ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:24},{wch:12},{wch:34},{wch:20},{wch:13},{wch:11},{wch:13},{wch:14},{wch:10}];
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}}];
  var sum=[['סיכום לפי קטגוריות: '+(D.p.name||'')],[],['קטגוריה','מספר תשלומים','סה"כ ששולם','אחוז מהסה"כ']];
  D.groups.forEach(function(g){sum.push([g.name,g.rows.length,Math.round(g.total*100)/100,D.total?Math.round(g.total/D.total*1000)/10+'%':'']);});
  sum.push(['סה"כ',D.groups.reduce(function(s,g){return s+g.rows.length;},0),Math.round(D.total*100)/100,'100%']);
  var ws2=XLSX.utils.aoa_to_sheet(sum);ws2['!cols']=[{wch:28},{wch:14},{wch:16},{wch:14}];
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws2,'סיכום');XLSX.utils.book_append_sheet(wb,ws,'פירוט לפי קטגוריות');
  wb.Workbook={Views:[{RTL:true}]};
  XLSX.writeFile(wb,exFileName(D.p,'xlsx'));A.showToast&&A.showToast('קובץ האקסל ירד');
}
async function exExportPdf(){
  var A=exA(),D=exReportData();if(!D)return;
  if(!D.groups.length){A.showToast&&A.showToast('אין תשלומים לייצוא','error');return;}
  if(!A.reportPdf){A.showToast&&A.showToast('יצוא PDF לא זמין. רענן את העמוד.','error');return;}
  var n=function(x){return Math.round(Number(x)||0).toLocaleString('he-IL')+' ₪';};
  var th='padding:7px 8px;border-bottom:2px solid #152449;text-align:right;font-size:12px;color:#152449',td='padding:6px 8px;border-bottom:1px solid #e3e7ee;font-size:12.5px;text-align:right;vertical-align:top';
  var html='<div style="direction:rtl;font-family:Assistant,Heebo,Arial,sans-serif;color:#1a2332;padding:36px 40px;width:794px;box-sizing:border-box;background:#fff">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #b9821a;padding-bottom:10px;margin-bottom:18px"><div><div style="font-size:24px;font-weight:800;color:#152449">הוצאות לפי קטגוריות</div><div style="font-size:15px;margin-top:2px">'+exEsc(D.p.name||'')+'</div></div>'+
    '<div style="text-align:left;font-size:12px;color:#5b6577">ארונשטיין פיקוח וניהול<br>הופק '+exDateStr(new Date().toISOString())+'</div></div>'+
    '<div style="font-size:15px;font-weight:700;color:#152449;margin:0 0 6px">סיכום</div><table style="width:100%;border-collapse:collapse;margin-bottom:22px"><tr><th style="'+th+'">קטגוריה</th><th style="'+th+'">תשלומים</th><th style="'+th+'">סה"כ ששולם</th><th style="'+th+'">אחוז</th></tr>'+
    D.groups.map(function(g){return '<tr><td style="'+td+'">'+exEsc(g.name)+'</td><td style="'+td+'">'+g.rows.length+'</td><td style="'+td+'">'+n(g.total)+'</td><td style="'+td+'">'+(D.total?Math.round(g.total/D.total*1000)/10:0)+'%</td></tr>';}).join('')+
    '<tr><td style="'+td+';font-weight:800">סה"כ</td><td style="'+td+';font-weight:800">'+D.groups.reduce(function(s,g){return s+g.rows.length;},0)+'</td><td style="'+td+';font-weight:800">'+n(D.total)+'</td><td style="'+td+'">100%</td></tr></table>';
  D.groups.forEach(function(g){
    html+='<div style="break-inside:avoid;margin-bottom:16px"><div style="display:flex;justify-content:space-between;background:#152449;color:#fff;padding:7px 10px;border-radius:6px 6px 0 0;font-weight:700;font-size:14px"><span>'+exEsc(g.name)+'</span><span>'+n(g.total)+'</span></div>'+
      '<table style="width:100%;border-collapse:collapse"><tr><th style="'+th+'">תאריך</th><th style="'+th+'">תיאור</th><th style="'+th+'">למי שולם</th><th style="'+th+'">לפני מע"מ</th><th style="'+th+'">סה"כ</th><th style="'+th+'">סטטוס</th></tr>'+
      g.rows.map(function(pay){return '<tr><td style="'+td+';white-space:nowrap">'+exDateStr(pay.date)+'</td><td style="'+td+'">'+exEsc(pay.desc||'')+(pay.added_by==='client'?' <span style="font-size:10.5px;color:#92400e">(לקוח)</span>':'')+'</td><td style="'+td+'">'+exEsc(pay.to||'')+'</td><td style="'+td+';white-space:nowrap">'+(pay.amount_before_vat!=null?n(pay.amount_before_vat):'—')+'</td><td style="'+td+';white-space:nowrap;font-weight:700">'+n(pay.amount)+'</td><td style="'+td+'">'+exStatus(pay)+'</td></tr>';}).join('')+'</table></div>';
  });
  html+='<div style="font-size:11px;color:#5b6577;margin-top:10px">"לפני מע"מ" מופיע בהוצאות שהוזנו דרך "הוספת הוצאה". הסה"כ הוא הסכום ששולם בפועל.</div></div>';
  A.showToast&&A.showToast('מייצר PDF...');
  try{await A.reportPdf(html,exFileName(D.p,'pdf'));}catch(e){console.error('exExportPdf',e);A.showToast&&A.showToast('שגיאה ביצוא PDF','error');}
}
/* ===== end expenses ===== */
(function(){function add(){if(!document.getElementById("ex-css"))document.head.insertAdjacentHTML("beforeend",EX_CSS);}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add);else add();})();
