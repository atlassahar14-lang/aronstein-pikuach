/* ===== מקטעים מתקפלים בטלפון =====
   <details class="m-fold"> is a section with a header row the reader taps to open.
   On a phone (up to 700px) it starts closed, so each screen opens with what matters most.
   On a wider screen it opens by itself, so the desktop looks as before.
   A section rendered with the "open" attribute keeps it (e.g. remembered filters). */
(function () {
  var mq = window.matchMedia ? window.matchMedia("(max-width:700px)") : { matches: false };
  function apply() {
    var list = document.querySelectorAll("details.m-fold:not([data-mf])");
    for (var i = 0; i < list.length; i++) {
      var d = list[i]; d.setAttribute("data-mf", "1");
      if (!mq.matches) d.open = true;
    }
  }
  function init() {
    var css = document.createElement("style");
    css.textContent =
      "details.m-fold>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;-webkit-tap-highlight-color:transparent}" +
      "details.m-fold>summary::-webkit-details-marker{display:none}" +
      "details.m-fold>summary .mf-t{flex:1;min-width:0}" +
      "details.m-fold>summary .mf-s{display:block;font-size:12.5px;font-weight:400;color:var(--text-muted,#56657a);margin-top:1px}" +
      "details.m-fold>summary::after{content:'+';flex:0 0 26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--bg,#eef2f6);color:var(--primary,#1B2B5E);font-weight:800;font-size:17px;line-height:1}" +
      "details.m-fold[open]>summary::after{content:'\\2212'}" +
      "@media (max-width:640px){.m-hide-phone{display:none!important}}";
    document.head.appendChild(css);
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
/* ===== end mobile fold ===== */
