/* ===== נגישות (ת"י 5568 / WCAG 2.0 AA) =====
   - "דילוג לתוכן" link at the top of the page.
   - Icon-only buttons get a spoken name (aria-label) from their icon, so screen readers say what they do.
   - The mobile menu backdrop is hidden from screen readers (it is a click target only).
   - A link to the accessibility statement in the side menu and on the login screen. */
(function () {
  var ICON_NAMES = {
    "pencil": "עריכה", "trash-2": "מחיקה", "trash": "מחיקה", "x": "סגירה", "plus": "הוספה", "download": "הורדה", "upload": "העלאה",
    "file-text": "צפייה בקובץ", "eye": "צפייה", "navigation": "ניווט לכתובת", "search": "חיפוש", "menu": "תפריט", "chevron-down": "פתיחה",
    "send": "שליחה", "check": "אישור", "circle-check": "סימון כהושלם", "printer": "הדפסה", "share-2": "שיתוף", "external-link": "פתיחה בחלון חדש",
    "message-circle": "הודעות", "bell": "עדכונים", "home": "דף הבית", "log-out": "יציאה", "camera": "תמונה", "paperclip": "צירוף קובץ"
  };
  function spokenName(el) {
    var t = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim();
    return t;
  }
  function iconOf(el) {
    var i = el.querySelector("[data-lucide]"); if (i) return i.getAttribute("data-lucide");
    var s = el.querySelector("svg[class*='lucide-']"); if (s) { var m = String(s.getAttribute("class")).match(/lucide-([a-z0-9-]+)/); if (m) return m[1]; }
    return null;
  }
  function labelIconButtons(root) {
    var list = (root || document).querySelectorAll("button, a[href], [role=button]");
    for (var k = 0; k < list.length; k++) {
      var el = list[k]; if (spokenName(el)) continue;
      var ic = iconOf(el); var nm = ic && ICON_NAMES[ic];
      if (!nm && /delete|remove/i.test(el.getAttribute("onclick") || "")) nm = "מחיקה";
      if (!nm && /edit|Edit/.test(el.getAttribute("onclick") || "")) nm = "עריכה";
      if (nm) el.setAttribute("aria-label", nm);
    }
  }
  // Fields with no visible label (e.g. cells of the weekly-form table): name them from their column and row.
  function labelFields(root) {
    var list = (root || document).querySelectorAll("input:not([type=hidden]):not([aria-label]), select:not([aria-label]), textarea:not([aria-label])");
    for (var k = 0; k < list.length; k++) {
      var f = list[k]; if ((f.id && document.querySelector('label[for="' + f.id + '"]')) || f.closest("label")) continue;
      var name = "";
      var cell = f.closest("td,th");
      if (cell) {
        var row = cell.parentElement, table = cell.closest("table"), idx = Array.prototype.indexOf.call(row.children, cell);
        var head = table && table.querySelector("thead tr"); var col = head && head.children[idx] ? head.children[idx].textContent.trim() : "";
        var first = row.children[0] && row.children[0] !== cell ? row.children[0].textContent.trim() : "";
        name = [first, col].filter(Boolean).join(" · ");
      }
      if (!name) { var prev = f.previousElementSibling; if (prev && prev.textContent.trim().length < 40) name = prev.textContent.trim(); }
      if (!name) name = f.getAttribute("placeholder") || f.getAttribute("title") || "";
      if (name) f.setAttribute("aria-label", name.replace(/\s+/g, " ").slice(0, 80));
    }
  }
  function addSkipLink() {
    if (document.getElementById("a11y-skip")) return;
    var a = document.createElement("a"); a.id = "a11y-skip"; a.href = "#main-content"; a.textContent = "דילוג לתוכן";
    a.className = "a11y-skip"; a.addEventListener("click", function (e) { var m = document.getElementById("main-content"); if (m) { e.preventDefault(); m.setAttribute("tabindex", "-1"); m.focus(); } });
    document.body.insertBefore(a, document.body.firstChild);
  }
  function addStatementLinks() {
    var foot = document.querySelector(".sidebar-footer");
    if (foot && !foot.querySelector(".a11y-statement-link")) { var a = document.createElement("a"); a.href = "accessibility.html"; a.className = "a11y-statement-link"; a.textContent = "הצהרת נגישות"; foot.appendChild(a); }
    var login = document.getElementById("login-screen");
    if (login && !login.querySelector(".a11y-statement-link")) { var b = document.createElement("a"); b.href = "accessibility.html"; b.className = "a11y-statement-link a11y-on-login"; b.textContent = "הצהרת נגישות"; login.appendChild(b); }
  }
  function init() {
    var css = document.createElement("style");
    css.textContent = ".a11y-skip{position:fixed;right:12px;top:-80px;z-index:100000;background:#1B2B5E;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none}" +
      ".a11y-skip:focus{top:calc(12px + env(safe-area-inset-top,0px))}" +
      ".a11y-statement-link{display:block;text-align:center;font-size:13px;margin-top:10px;color:inherit;opacity:.85}" +
      ".a11y-on-login{position:fixed;bottom:calc(12px + env(safe-area-inset-bottom,0px));left:0;right:0;color:#fff}";
    document.head.appendChild(css);
    var bd = document.getElementById("sidebar-backdrop"); if (bd) bd.setAttribute("aria-hidden", "true");
    addSkipLink(); addStatementLinks(); labelIconButtons(); labelFields();
    var pending = false;
    new MutationObserver(function () { if (pending) return; pending = true; setTimeout(function () { pending = false; labelIconButtons(); labelFields(); addStatementLinks(); }, 120); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
/* ===== end a11y ===== */
