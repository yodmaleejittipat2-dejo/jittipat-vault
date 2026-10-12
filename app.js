/* คลังสมบัติ Jittipat_Editz — GitHub Pages + Firebase version (v2: catalog + cache) */
(function(){
"use strict";
var TIKTOK = "https://www.tiktok.com/@yodmaleejittipat3?is_from_webapp=1&sender_device=pc";
var DISCORD = "https://discord.com/users/1529079011651616813";
var YOUTUBE = "https://youtube.com/@jittipatyodmalee?si=KYPWJ95cxp0hUKOC";
var ADMIN_DOMAIN = "jittipat-vault.app"; // ชื่อผู้ใช้ jittipat_admin = อีเมล jittipat_admin@jittipat-vault.app ใน Firebase
var DEFAULT_ABOUT = "สวัสดีครับ ผม Jittipat นักตัดต่อสาย After Effects\n\nทุกงานตัดต่อมีขั้นตอนที่ต้องทำซ้ำอยู่เสมอ ผมเลยเริ่มเขียนสคริปต์และทำของช่วยงานไว้ใช้เอง จนวันหนึ่งคิดว่าถ้าเครื่องมือพวกนี้ช่วยผมประหยัดเวลาได้ ก็น่าจะช่วยเพื่อนนักตัดต่อคนอื่นได้เหมือนกัน\n\nคลังนี้จึงเกิดขึ้นเพื่อแบ่งของที่ใช้งานได้จริงให้ทุกคนโหลดไปใช้ฟรี ติดตามผลงานและคลิปใหม่ ๆ ได้ที่ TikTok และ YouTube ด้านล่างนี้";

/* How data is loaded (keeps Firebase's free daily read quota safe):
   - visitors read catalog/meta (1 read) and only re-read catalog/p0.. when the admin changed something
   - counters and visitor total are fetched once and cached in the browser for a few minutes
   - a detail page reads just that one item (images, code, description)
   - the admin keeps a live view of every item and rebuilds the catalog after each change */
var CACHE_CAT = "je-cat-v2", CACHE_CTR = "je-ctr-v2", CACHE_VIS = "je-vis-v2", CACHE_ABOUT = "je-about-v2";
var META_TTL = 2 * 60 * 1000, CTR_TTL = 10 * 60 * 1000, VIS_TTL = 10 * 60 * 1000, ABOUT_TTL = 60 * 60 * 1000;
var NEW_DAYS = 7, MAX_PINNED = 3;

var state = { about: DEFAULT_ABOUT, items: [], counters: {}, visits: null, ctrTime: 0 };
var loaded = { items: false, about: false, counters: false };
var full = {}, fullPending = {};
var setupError = "";

var LANGS = [["xml","HTML"],["css","CSS"],["javascript","JavaScript"],["typescript","TypeScript"],["python","Python"],["java","Java"],["c","C"],["cpp","C++"],["csharp","C#"],["php","PHP"],["json","JSON"],["bash","Bash / Shell"],["sql","SQL"],["markdown","Markdown"],["yaml","YAML"],["go","Go"],["rust","Rust"],["kotlin","Kotlin"],["swift","Swift"],["ruby","Ruby"],["plaintext","Plain text"]];
var LANG_NAME = {}; LANGS.forEach(function(l){ LANG_NAME[l[0]] = l[1]; });
var FTYPES = [["pdf","PDF"],["png","PNG"],["jpeg","JPEG"],["text","Text"],["word","Word"],["other","อื่นๆ"]];
var FT_NAME = {}; FTYPES.forEach(function(f){ FT_NAME[f[0]] = f[1]; });
var STYPES = [["jsx","Script (.jsx)"],["jsxbin","Script (.jsxbin)"],["zxp","Extension (.zxp)"],["other","อื่นๆ"]];
var ST_NAME = { ffx: "Preset (.ffx)" }; STYPES.forEach(function(s){ ST_NAME[s[0]] = s[1]; });
var PTYPES = [["aep","Project (.aep)"],["ffx","Preset (.ffx)"],["prproj","Project (.prproj)"],["mogrt","Template (.mogrt)"],["other","อื่นๆ"]];
var PT_NAME = {}; PTYPES.forEach(function(s){ PT_NAME[s[0]] = s[1]; });
var KIND = {
  script: { label: "Extension/Script", tab: "scripts", types: STYPES, names: ST_NAME, def: "jsx", small: "SCRIPTUI PANEL", imgLabel: "ภาพ Panel", imgField: "ภาพ ScriptUI Panel", otherHint: "เช่น Plugin, .aex", descHint: "Script นี้ทำอะไรได้บ้าง ใช้กับ AE เวอร์ชันไหน วิธีติดตั้ง" },
  preset: { label: "PJF/Preset", tab: "presets", types: PTYPES, names: PT_NAME, def: "aep", small: "PROJECT / PRESET", imgLabel: "ภาพตัวอย่าง", imgField: "ภาพตัวอย่าง", otherHint: "เช่น .zip, .prfpset", descHint: "ในไฟล์มีอะไรบ้าง ใช้กับ AE เวอร์ชันไหน ต้องลงฟอนต์หรือปลั๊กอินอะไรเพิ่ม" }
};
function isRich(k){ return k === "script" || k === "preset"; }
var ST_SHORT = { jsx: ".jsx", jsxbin: ".jsxbin", zxp: ".zxp", ffx: ".ffx", aep: ".aep", prproj: ".prproj", mogrt: ".mogrt" };
var MAX_PANELS = 6;
var SORTS = [["new","ใหม่ล่าสุด"],["downloads","ดาวน์โหลดมากสุด"],["rating","คะแนนสูงสุด"]];

var ui = { route: "home", resTab: "code", filter: "all", q: "", sort: "new", user: null, authReady: false, adminMode: "code", editId: null, cover: null, panels: [], confirmDel: null, busy: false };

/* ---------- helpers ---------- */
function $(s, r){ return (r || document).querySelector(s); }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
function lsJSON(k, v){
  if (v === undefined) { try { var s = ls(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { localStorage.removeItem(k); } catch (e2) {} }
}
function ssGet(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v){ try { sessionStorage.setItem(k, v); } catch (e) {} }
function uid(){ return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function langName(l){ return LANG_NAME[l] || (l ? String(l).toUpperCase() : "CODE"); }
function ftName(it){ return it.fileType === "other" ? (it.fileTypeOther || "อื่นๆ") : (FT_NAME[it.fileType] || "FILE"); }
function stName(it){ var K = KIND[it.kind] || KIND.script; return it.scriptType === "other" ? (it.scriptTypeOther || "อื่นๆ") : (K.names[it.scriptType] || ST_NAME[it.scriptType] || "FILE"); }
function stShort(it){ return ST_SHORT[it.scriptType] || stName(it); }
function typeName(it){ return it.kind === "code" ? langName(it.lang) : isRich(it.kind) ? stName(it) : ftName(it); }
function kindLabel(k){ return k === "code" ? "Code" : k === "file" ? "ไฟล์" : KIND[k] ? KIND[k].label : ""; }
function isYoutube(u){ return /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/\S+$/i.test(String(u || "")); }
function reduced(){ return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }
function tcode(sec){ var f = Math.floor(sec * 25); var p = function(n){ return (n < 10 ? "0" : "") + n; }; return p(Math.floor(f / 90000) % 24) + ":" + p(Math.floor(f / 1500) % 60) + ":" + p(Math.floor(f / 25) % 60) + ":" + p(f % 25); }
function hashStr(s){ var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function fakeDur(it){ return tcode(8 + hashStr(it.id) % 170); }
function isAdmin(){ return !!(ui.user && ui.user.email && ui.user.email.toLowerCase() === ("jittipat_admin@" + ADMIN_DOMAIN)); }
function isNew(it){ return !!it.created && Date.now() - it.created < NEW_DAYS * 864e5; }
function hhmm(t){ var d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
function normAE(v){ return String(v || "").replace(/^\s*(after\s*effects|ae)\s*/i, "").trim().slice(0, 24); }
function findItem(id){ for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i]; return null; }

function detectLang(code){
  var src = String(code || "");
  if (!src.trim()) return "plaintext";
  var t = src.trim();
  if (/^<\?php/i.test(t)) return "php";
  if (/<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]|<div[\s>]|<\/(p|span|a|section|div)>/i.test(t)) return "xml";
  if (/^[\[{]/.test(t)) { try { JSON.parse(t); return "json"; } catch (e) {} }
  if (!window.hljs) return "plaintext";
  try {
    var r = hljs.highlightAuto(src, LANGS.map(function(l){ return l[0]; }).filter(function(l){ return l !== "plaintext"; }));
    return r.language && LANG_NAME[r.language] ? r.language : "plaintext";
  } catch (e) { return "plaintext"; }
}
function highlight(code, lang){
  if (window.hljs && lang && lang !== "plaintext") {
    try { return hljs.highlight(String(code), { language: lang, ignoreIllegals: true }).value; } catch (e) {}
  }
  return esc(code);
}

var ICON = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 17v3h16v-3"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 3v10.6A4 4 0 1 1 14 10V3h2zm0 0c.4 2.2 2 3.8 4 4v2.2c-1.6-.1-3-.7-4-1.6"/></svg>',
  discord: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true"><path d="M19.6 5.3A16.4 16.4 0 0 0 15.5 4l-.5 1.1a15.2 15.2 0 0 0-6 0L8.5 4a16.4 16.4 0 0 0-4.1 1.3C1.8 9.2 1.1 13 1.4 16.8a16.6 16.6 0 0 0 5 2.6l1.1-1.8c-.6-.2-1.2-.5-1.7-.8l.4-.3a11.8 11.8 0 0 0 11.6 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a16.5 16.5 0 0 0 5-2.6c.4-4.4-.7-8.2-3-11.5zM8.5 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5.5v13l11-6.5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>'
};

/* ---------- theme ---------- */
function currentTheme(){
  var a = document.documentElement.getAttribute("data-theme");
  if (a === "dark" || a === "light") return a;
  return window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme(t){ document.documentElement.setAttribute("data-theme", t); var b = $("#themeBtn"); if (b) { b.innerHTML = t === "dark" ? ICON.sun : ICON.moon; b.setAttribute("aria-label", t === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"); } }
var savedTheme = ls("je-theme"); if (savedTheme === "dark" || savedTheme === "light") document.documentElement.setAttribute("data-theme", savedTheme);
var savedSort = ls("je-sort"); if (savedSort === "new" || savedSort === "downloads" || savedSort === "rating") ui.sort = savedSort;

/* ---------- shell ---------- */
var root = document.getElementById("root");
root.innerHTML =
  '<header class="topbar" id="topbar"><div class="wrap bar">' +
    '<a class="brand" href="#home" aria-label="หน้าแรก"><span class="brand-mark">JE</span><span class="brand-name">Jittipat<i>_</i>Editz</span></a>' +
    '<nav class="nav" id="nav" aria-label="เมนูหลัก"></nav>' +
    '<button class="theme-btn" id="themeBtn" type="button"></button>' +
    '<button class="menu-btn" id="menuBtn" type="button" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>' +
  '</div><div class="ruler" aria-hidden="true"><div class="ticks"></div><div class="playhead" id="playhead"></div><div class="ruler-tc" id="rulerTc">00:00:00:00</div></div></header>' +
  '<main id="main"><div class="wrap view" id="view"></div></main>' +
  '<footer><div class="wrap foot"><p>เว็บไซต์นี้สร้างและดูแลโดย <b>Jittipat_Editz</b></p>' +
    '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><a href="' + esc(TIKTOK) + '" target="_blank" rel="noopener">TikTok ↗</a><a href="' + esc(YOUTUBE) + '" target="_blank" rel="noopener">YouTube ↗</a><a href="' + esc(DISCORD) + '" target="_blank" rel="noopener">Discord ↗</a><span class="tcf">© ' + new Date().getFullYear() + ' · ALL CLIPS RENDERED</span></div></div></footer>' +
  '<div class="cut" id="cut" aria-hidden="true"><span></span><span></span><span></span></div>' +
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>';

applyTheme(currentTheme());
$("#themeBtn").addEventListener("click", function(){ var t = currentTheme() === "dark" ? "light" : "dark"; applyTheme(t); ls("je-theme", t); });

/* mobile menu */
function setMenu(open){
  var tb = $("#topbar"), btn = $("#menuBtn");
  tb.classList.toggle("menu-open", open);
  btn.setAttribute("aria-expanded", String(open));
  btn.setAttribute("aria-label", open ? "ปิดเมนู" : "เปิดเมนู");
}
$("#menuBtn").addEventListener("click", function(e){ e.stopPropagation(); setMenu(!$("#topbar").classList.contains("menu-open")); });
document.addEventListener("click", function(e){ if ($("#topbar").classList.contains("menu-open") && !e.target.closest("#nav")) setMenu(false); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && $("#topbar").classList.contains("menu-open")) { setMenu(false); $("#menuBtn").focus(); } });
addEventListener("resize", function(){ if (innerWidth > 760) setMenu(false); });

function renderNav(){
  var links = [["home","Home"],["about","About Us"],["resource","Resource"],["admin","Admin"]];
  var sec = ui.route === "code" || isRich(ui.route) ? "resource" : ui.route;
  $("#nav").innerHTML = links.map(function(l){
    return '<a href="#' + l[0] + '"' + (l[0] === "admin" ? ' class="admin-link"' : "") + (sec === l[0] ? ' aria-current="page"' : "") + '>' + l[1] + '</a>';
  }).join("");
}

var toastT;
function toast(msg){ var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove("show"); }, 3200); }

function onScroll(){
  var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  var p = Math.min(1, Math.max(0, scrollY / max));
  var w = $(".ruler").clientWidth;
  $("#playhead").style.transform = "translateX(" + (p * (w - 2)) + "px)";
  $("#rulerTc").textContent = tcode(p * 180);
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);

var t0 = performance.now();
(function tick(){ var el = document.getElementById("liveTc"); if (el) el.textContent = tcode((performance.now() - t0) / 1000); requestAnimationFrame(tick); })();

/* ---------- sharing ---------- */
function copyText(text){
  function legacy(){
    return new Promise(function(res, rej){
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); ok ? res() : rej();
    });
  }
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(legacy);
  return legacy();
}
function shareLink(hash, title){
  var url = location.href.split("#")[0] + "#" + hash;
  var touch = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.share) { navigator.share({ title: title || document.title, url: url }).catch(function(){}); return; }
  copyText(url).then(function(){ toast("คัดลอกลิงก์แล้ว เอาไปวางใต้คลิปหรือในแชตได้เลย"); }, function(){ toast(url); });
}
function shareBtn(hash, title, cls){
  return '<button type="button" class="btn sm ghost ' + (cls || "") + '" data-share="' + esc(hash) + '" data-title="' + esc(title) + '">' + ICON.link + '<span class="glitch-txt">คัดลอกลิงก์</span></button>';
}

/* ---------- covers & cards ---------- */
function coverHTML(it){
  var src = it.thumb || it.cover;
  if (src) return '<img src="' + esc(src) + '" alt="" loading="lazy">';
  var small = it.kind === "code" ? "CODE CLIP" : isRich(it.kind) ? KIND[it.kind].small : "FILE CLIP";
  return '<div class="gen"><b>' + esc(isRich(it.kind) ? stShort(it).toUpperCase() : typeName(it)) + '</b><small>' + small + '</small></div>';
}
function ribbonsHTML(it){
  var r = "";
  if (it.hidden) r += '<span class="rb draft">ร่าง</span>';
  if (it.pinned) r += '<span class="rb pin">PINNED</span>';
  if (isNew(it)) r += '<span class="rb new">NEW</span>';
  return r ? '<div class="ribbons">' + r + '</div>' : "";
}
function aeChip(it){ return it.ae ? '<span class="ae-chip" title="รองรับ After Effects">AE ' + esc(it.ae) + '</span>' : ""; }
function badgeHTML(it){
  if (it.kind === "code") return '<span class="badge code"><span class="dot"></span>Code · ' + esc(langName(it.lang)) + '</span>';
  if (isRich(it.kind)) return '<span class="badge ' + it.kind + '"><span class="dot"></span>' + KIND[it.kind].label + ' · ' + esc(stShort(it)) + '</span>';
  return '<span class="badge file"><span class="dot"></span>ไฟล์ · ' + esc(ftName(it)) + '</span>';
}
function safeUrl(u){ return /^https?:\/\//i.test(String(u || "")) ? u : "#"; }
function cardHTML(it){
  var cover = '<div class="cover">' + coverHTML(it) + ribbonsHTML(it) + '<span class="clip-tc">' + fakeDur(it) + '</span><div class="vf"><i></i><i></i><i></i><i></i></div></div>';
  var id = esc(it.id);
  if (it.kind === "code") {
    return '<a class="clip" data-card="' + id + '" href="#code-' + id + '">' + cover + '<div class="clip-body">' + badgeHTML(it) + '<h3>' + esc(it.title) + '</h3>' +
      '<div class="clip-stats">' + ratingSummary(it.id) + '</div><div class="clip-foot"><span class="go">ดูโค้ด →</span></div></div></a>';
  }
  var stats = '<div class="clip-stats">' + ratingSummary(it.id) + '<span class="dl-pill" title="ยอดดาวน์โหลด">' + ICON.down + '<span data-dlc="' + id + '">' + fmt(dlCount(it.id)) + '</span> ครั้ง</span>' + aeChip(it) + '</div>';
  var dl = '<a class="btn sm primary" data-dl="' + id + '" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">' + ICON.down + '<span class="glitch-txt">ดาวน์โหลด</span></a>';
  if (isRich(it.kind)) {
    var href = '#' + it.kind + '-' + id;
    return '<article class="clip" data-card="' + id + '"><a class="clip-cover-link" href="' + href + '" aria-label="ดูรายละเอียด ' + esc(it.title) + '">' + cover + '</a><div class="clip-body">' + badgeHTML(it) +
      '<h3><a class="clip-title" href="' + href + '">' + esc(it.title) + '</a></h3>' + stats +
      '<div class="clip-foot"><a class="btn sm" href="' + href + '"><span class="glitch-txt">รายละเอียด</span></a>' + dl + '</div></div></article>';
  }
  return '<article class="clip" data-card="' + id + '">' + cover + '<div class="clip-body">' + badgeHTML(it) + '<h3>' + esc(it.title) + '</h3>' + stats +
    rateWidget(it.id, true) + '<div class="clip-foot">' + dl +
    '<button type="button" class="icon-btn share-mini" data-share="file-' + id + '" data-title="' + esc(it.title) + '" aria-label="คัดลอกลิงก์ของชิ้นนี้" title="คัดลอกลิงก์">' + ICON.link + '</button></div></div></article>';
}

/* ---------- counters, ratings, visitors ---------- */
var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.85 5.9 6.45.8-4.75 4.45 1.2 6.4L12 17.05 6.25 20.15l1.2-6.4L2.7 9.3l6.45-.8z"/></svg>';
var FIVE = STAR + STAR + STAR + STAR + STAR;
function ctr(id){ return state.counters[id] || {}; }
function dlCount(id){ return Math.max(0, ctr(id).downloads || 0); }
function ratingOf(id){ var c = ctr(id), n = Math.max(0, c.ratingCount || 0); return { n: n, avg: n ? Math.max(0, Math.min(5, (c.ratingSum || 0) / n)) : 0 }; }
function fmt(n){ return Number(n || 0).toLocaleString("th-TH"); }
function myRating(id){ var v = +ls("je-rate-" + id); return v >= 1 && v <= 5 ? v : 0; }
function ratingSummary(id){
  var r = ratingOf(id);
  return '<span class="rating-sum" data-rsum="' + esc(id) + '" aria-label="' + (r.n ? "คะแนนเฉลี่ย " + r.avg.toFixed(1) + " จาก 5 จาก " + r.n + " คน" : "ยังไม่มีคะแนน") + '">' +
    '<span class="stars-ro" aria-hidden="true"><span class="s-bg">' + FIVE + '</span><span class="s-fg" style="width:' + (r.avg / 5 * 100).toFixed(1) + '%">' + FIVE + '</span></span>' +
    '<b>' + (r.n ? r.avg.toFixed(1) : "–") + '</b><span class="rs-n">' + (r.n ? "(" + fmt(r.n) + " คน)" : "ยังไม่มีคะแนน") + '</span></span>';
}
function rateWidget(id, compact){
  var mine = myRating(id);
  var stars = '<div class="rate-stars" role="radiogroup" aria-label="ให้คะแนน 1 ถึง 5 ดาว">' + [1, 2, 3, 4, 5].map(function(n){
    return '<button type="button" class="star' + (n <= mine ? " on" : "") + '" data-star="' + n + '" role="radio" aria-checked="' + (n === mine) + '" aria-label="' + n + ' ดาว">' + STAR + '</button>';
  }).join("") + '</div>';
  var note = '<span class="rate-note">' + (mine ? "คุณให้ " + mine + " ดาว · กดเพื่อเปลี่ยน" : "กดดาวเพื่อให้คะแนน") + '</span>';
  if (compact) return '<div class="rate compact" data-rate-for="' + esc(id) + '">' + stars + note + '</div>';
  var r = ratingOf(id);
  return '<div class="rate full" data-rate-for="' + esc(id) + '"><div class="rate-score"><b>' + (r.n ? r.avg.toFixed(1) : "–") + '</b><span>/ 5</span></div>' +
    '<div class="rate-main"><span class="lbl">ให้คะแนนของชิ้นนี้</span>' + stars + note +
    '<span class="rate-count">' + (r.n ? "มีผู้ให้คะแนนแล้ว " + fmt(r.n) + " คน" : "ยังไม่มีใครให้คะแนน เป็นคนแรกเลย") + '</span></div></div>';
}
function inc(n){ return firebase.firestore.FieldValue.increment(n); }
/* apply a change to our cached numbers right away, so the page doesn't need to re-read Firebase */
function bumpLocal(id, patch){
  var c = Object.assign({}, state.counters[id] || {});
  Object.keys(patch).forEach(function(k){ c[k] = (c[k] || 0) + patch[k]; });
  state.counters[id] = c;
  var cache = lsJSON(CACHE_CTR); if (cache && cache.data) { cache.data[id] = c; lsJSON(CACHE_CTR, cache); }
  updateLive();
}
function countDownload(id){
  if (!db || ssGet("je-dl-" + id)) return;
  ssSet("je-dl-" + id, "1");
  bumpLocal(id, { downloads: 1 });
  db.collection("counters").doc(id).set({ downloads: inc(1) }, { merge: true }).catch(function(){
    try { sessionStorage.removeItem("je-dl-" + id); } catch (e) {}
    bumpLocal(id, { downloads: -1 });
  });
}
function rate(id, n){
  if (!db) { toast("ระบบยังไม่พร้อม ลองอีกครั้ง"); return; }
  var prev = ratingOf(id).n > 0 ? myRating(id) : 0;
  if (prev === n) { toast("คุณให้ " + n + " ดาวไว้แล้ว"); return; }
  var ref = db.collection("counters").doc(id);
  var patch = prev ? { ratingSum: n - prev } : { ratingCount: 1, ratingSum: n };
  var job = prev ? ref.set({ ratingSum: inc(n - prev) }, { merge: true }) : ref.set({ ratingCount: inc(1), ratingSum: inc(n) }, { merge: true });
  ls("je-rate-" + id, String(n)); bumpLocal(id, patch);
  document.querySelectorAll('[data-rate-for="' + id + '"] .star[data-star="' + n + '"]').forEach(function(b){ b.classList.add("pop"); });
  job.then(function(){ toast(prev ? "เปลี่ยนคะแนนเป็น " + n + " ดาวแล้ว" : "ขอบคุณที่ให้ " + n + " ดาว!"); }, function(ex){
    var undo = {}; Object.keys(patch).forEach(function(k){ undo[k] = -patch[k]; });
    ls("je-rate-" + id, prev ? String(prev) : null); bumpLocal(id, undo);
    toast(ex && ex.code === "permission-denied" ? "ให้คะแนนไม่ได้: กฎ (Rules) ใน Firebase ยังไม่อัปเดต" : "ให้คะแนนไม่สำเร็จ ลองใหม่อีกครั้ง");
  });
}
function countVisit(){
  if (ls("je-visited") || ssGet("je-visited")) return;
  ssSet("je-visited", "1");
  db.collection("stats").doc("site").set({ visits: inc(1) }, { merge: true }).then(function(){
    ls("je-visited", "1");
    if (state.visits != null) { state.visits++; lsJSON(CACHE_VIS, { t: Date.now(), v: state.visits }); updateLive(); }
  }, function(){});
}
/* refresh numbers in place, so typing, forms and scroll position are never disturbed */
function updateLive(){
  document.querySelectorAll("[data-rate-for]").forEach(function(el){ if (el.parentNode) el.outerHTML = rateWidget(el.getAttribute("data-rate-for"), el.classList.contains("compact")); });
  document.querySelectorAll("[data-rsum]").forEach(function(el){ if (el.parentNode) el.outerHTML = ratingSummary(el.getAttribute("data-rsum")); });
  document.querySelectorAll("[data-dlc]").forEach(function(el){ el.textContent = fmt(dlCount(el.getAttribute("data-dlc"))); });
  var d = $("#dash"); if (d) { var wasIn = d.classList.contains("in"); d.outerHTML = dashHTML(); if (wasIn) $("#dash").classList.add("in"); bindDash(!dashAnimated); }
}
document.addEventListener("click", function(e){
  if (!e.target.closest) return;
  var s = e.target.closest("[data-star]");
  if (s) { e.preventDefault(); var w = s.closest("[data-rate-for]"); if (w) rate(w.getAttribute("data-rate-for"), +s.getAttribute("data-star")); return; }
  var sh = e.target.closest("[data-share]");
  if (sh) { e.preventDefault(); e.stopPropagation(); shareLink(sh.getAttribute("data-share"), sh.getAttribute("data-title")); return; }
  var d = e.target.closest("[data-dl]");
  if (d) countDownload(d.getAttribute("data-dl"));
});
document.addEventListener("mouseover", function(e){
  var s = e.target.closest && e.target.closest("[data-star]"); if (!s) return;
  var n = +s.getAttribute("data-star");
  s.parentNode.querySelectorAll(".star").forEach(function(b){ b.classList.toggle("hov", +b.getAttribute("data-star") <= n); });
});
document.addEventListener("mouseout", function(e){
  var g = e.target.closest && e.target.closest(".rate-stars"); if (!g || g.contains(e.relatedTarget)) return;
  g.querySelectorAll(".star").forEach(function(b){ b.classList.remove("hov"); });
});

/* ---------- home dashboard ---------- */
var dashAnimated = false;
function dashHTML(){
  function ofKind(k){ return state.items.filter(function(i){ return i.kind === k; }); }
  function sum(list){ return list.reduce(function(a, i){ return a + dlCount(i.id); }, 0); }
  var files = ofKind("file"), scripts = ofKind("script"), presets = ofKind("preset");
  var dFile = sum(files), dScript = sum(scripts), dPreset = sum(presets), total = dFile + dScript + dPreset;
  var ratings = state.items.reduce(function(a, i){ return a + ratingOf(i.id).n; }, 0);
  var top = files.concat(scripts, presets).filter(function(i){ return dlCount(i.id) > 0; }).sort(function(a, b){ return dlCount(b.id) - dlCount(a.id); }).slice(0, 3);
  var ready = loaded.counters && state.visits != null;
  function pct(v){ return (total ? v / total * 100 : 0).toFixed(1); }
  function big(label, n, unit, cls){
    return '<div class="dash-card dash-big ' + cls + '"><span class="lbl">' + label + '</span><b class="count" data-to="' + (ready ? n : "") + '">' + (ready ? fmt(n) : "–") + '</b><span class="unit">' + unit + '</span></div>';
  }
  return '<section class="dash" id="dash" aria-label="สถิติเว็บไซต์">' +
    '<div class="section-head"><div><p class="eyebrow">// Render stats</p><h2>สถิติคลังสมบัติ</h2></div><span class="live" title="ตัวเลขอัปเดตทุก 10 นาที"><i></i>' + (state.ctrTime ? "SYNC " + hhmm(state.ctrTime) : "SYNC") + '</span></div>' +
    '<div class="dash-grid">' +
      big("ผู้เข้าชมทั้งหมด", state.visits || 0, "คน", "v") +
      big("ยอดดาวน์โหลดทั้งหมด", total, "ครั้ง", "d") +
      '<div class="dash-card dash-split"><span class="lbl">ดาวน์โหลดแยกตามหมวด</span>' +
        '<div class="mix" role="img" aria-label="ไฟล์ ' + dFile + ' ครั้ง, Extension/Script ' + dScript + ' ครั้ง, PJF/Preset ' + dPreset + ' ครั้ง">' +
          '<span class="m-file" style="width:' + pct(dFile) + '%"></span><span class="m-script" style="width:' + pct(dScript) + '%"></span><span class="m-preset" style="width:' + pct(dPreset) + '%"></span></div>' +
        '<ul class="legend"><li><i class="m-file"></i>ไฟล์<b>' + fmt(dFile) + '</b></li><li><i class="m-script"></i>Extension/Script<b>' + fmt(dScript) + '</b></li><li><i class="m-preset"></i>PJF/Preset<b>' + fmt(dPreset) + '</b></li><li><i class="m-rate"></i>คะแนนที่ได้รับ<b>' + fmt(ratings) + '</b></li></ul></div>' +
      '<div class="dash-card dash-top"><span class="lbl">ดาวน์โหลดมากที่สุด</span>' +
        (top.length ? '<ol>' + top.map(function(i){
          var href = isRich(i.kind) ? '#' + i.kind + '-' + esc(i.id) : '#file-' + esc(i.id);
          return '<li><a href="' + href + '">' + esc(i.title) + '</a><b>' + fmt(dlCount(i.id)) + '</b></li>';
        }).join("") + '</ol>' : '<p class="muted">ยังไม่มีการดาวน์โหลด</p>') + '</div>' +
    '</div></section>';
}
function bindDash(animate){
  var d = $("#dash"); if (!d) return;
  if (!("IntersectionObserver" in window)) { d.classList.add("in"); return; }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      io.disconnect(); d.classList.add("in");
      if (!animate || dashAnimated || reduced()) return;
      var targets = document.querySelectorAll("#dash .count[data-to]");
      if (!Array.prototype.some.call(targets, function(el){ return +el.getAttribute("data-to") > 0; })) return;
      dashAnimated = true;
      targets.forEach(function(el){
        var to = +el.getAttribute("data-to"); if (!to) return;
        var t1 = performance.now(), dur = 1300;
        (function step(t){ var k = Math.min(1, Math.max(0, (t - t1) / dur)); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); })(t1);
      });
    });
  }, { threshold: .3 });
  io.observe(d);
}
function newest(){ return state.items.slice().sort(function(a, b){ return (b.created || 0) - (a.created || 0); }); }
function sortItems(list, mode){
  var l = list.slice();
  if (mode === "downloads") l.sort(function(a, b){ return dlCount(b.id) - dlCount(a.id) || (b.created || 0) - (a.created || 0); });
  else if (mode === "rating") l.sort(function(a, b){ var ra = ratingOf(a.id), rb = ratingOf(b.id); return rb.avg - ra.avg || rb.n - ra.n || (b.created || 0) - (a.created || 0); });
  else l.sort(function(a, b){ return (b.created || 0) - (a.created || 0); });
  return l;
}
function loadingHTML(){ return '<div class="empty"><b>กำลังโหลดของแจก…</b>รอสักครู่</div>'; }
function setupHTML(){ return '<div class="empty"><b>เชื่อมต่อฐานข้อมูลไม่ได้</b>' + esc(setupError) + '</div>'; }

/* ---------- views ---------- */
function viewHome(){
  function count(k){ return state.items.filter(function(i){ return i.kind === k; }).length; }
  var latest = newest().slice(0, 3);
  var pinned = newest().filter(function(i){ return i.pinned; }).slice(0, MAX_PINNED);
  var body = setupError ? setupHTML() : !loaded.items ? loadingHTML() : latest.length ? '<div class="grid">' + latest.map(cardHTML).join("") + '</div>' : '<div class="empty"><b>ยังไม่มีของแจก</b>ของแจกชิ้นแรกจะขึ้นตรงนี้ทันทีที่เพิ่มจากหน้า Admin</div>';
  function stat(k, label){ return '<div class="stat"><b>' + (loaded.items ? count(k) : "–") + '</b><span>' + label + '</span></div>'; }
  return '<section class="hero">' +
      '<div class="hero-meta"><span class="rec-dot">REC</span><span id="liveTc">00:00:00:00</span><span>25 FPS</span><span>1920 × 1080</span><span>SEQ_01 / WELCOME</span></div>' +
      '<h1><span class="k1">ยินดีต้อนรับสู่</span><span class="k2" data-text="คลังสมบัติ"><span class="fill">คลังสมบัติ</span></span><span class="k3">ของ <b>Jittipat_Editz</b></span></h1>' +
      '<div class="hero-cta"><a class="btn primary" href="#resource"><span class="glitch-txt">เข้าคลังของแจก</span></a><a class="btn ghost" href="#about"><span class="glitch-txt">รู้จัก Jittipat_Editz</span></a></div>' +
      '<div class="track" aria-hidden="true"><div class="lane"></div><div class="lane"></div>' +
        '<div class="clipbar" style="left:4%;width:30%"></div><div class="clipbar" style="left:36%;width:22%"></div><div class="clipbar" style="left:60%;width:34%"></div>' +
        '<div class="clipbar b" style="left:12%;width:40%"></div><div class="clipbar b" style="left:56%;width:18%"></div>' +
        '<div class="kf" style="left:8%"></div><div class="kf" style="left:27%"></div><div class="kf" style="left:49%"></div><div class="kf" style="left:71%"></div><div class="kf" style="left:90%"></div>' +
        '<div class="sweep"></div></div>' +
    '</section>' +
    '<section class="pitch" id="pitch"><div><p class="eyebrow">// สิ่งที่อยู่ในคลังนี้</p><h2>รวมสคริปต์ After Effects แจกฟรี <mark>สำหรับคนตัดต่อที่ไม่อยากเสียเวลา</mark></h2></div>' +
      '<div><p class="lead">รวบรวมสคริปต์และของแจกใช้งานจริง เอาไปกดใช้ย่นเวลาทำ AE ซะ จะได้เอาเวลาไปทำอย่างอื่น โหลดไปลุยกันเลย!</p>' +
      '<div class="stats">' + stat("code", "Code") + stat("file", "ไฟล์") + stat("script", "Script") + stat("preset", "PJF/Preset") + '</div></div></section>' +
    (pinned.length ? '<section class="featured"><div class="section-head"><div><p class="eyebrow">// แนะนำ</p><h2>ของเด่นที่ปักหมุดไว้</h2></div></div><div class="grid">' + pinned.map(cardHTML).join("") + '</div></section>' : "") +
    '<section><div class="section-head"><div><p class="eyebrow">// อัปเดตล่าสุด</p><h2>ของแจกล่าสุด</h2></div><a class="btn sm" href="#resource"><span class="glitch-txt">ดูทั้งหมด →</span></a></div>' + body + '</section>' + dashHTML();
}

function viewAbout(){
  loadAbout();
  return '<div class="about"><div class="monitor" aria-hidden="true"><div class="safe"></div><div class="osd t"><span>● REC</span><span>CAM_A</span></div><div class="big">JE</div><div class="osd b"><span>ISO 800</span><span>4K · 25P</span></div></div>' +
    '<div class="about-copy"><p class="eyebrow">// About Us</p><h1>การเดินทางของ <span>Jittipat_Editz</span></h1><p>' + esc(state.about) + '</p>' +
    '<div class="socials">' +
      '<a class="social" href="' + esc(TIKTOK) + '" target="_blank" rel="noopener"><span class="ic">' + ICON.note + '</span><span><b>TikTok</b><small>@yodmaleejittipat3</small></span><span class="arrow">' + ICON.arrow + '</span></a>' +
      '<a class="social yt" href="' + esc(YOUTUBE) + '" target="_blank" rel="noopener"><span class="ic">' + ICON.play + '</span><span><b>YouTube</b><small>@jittipatyodmalee</small></span><span class="arrow">' + ICON.arrow + '</span></a>' +
      '<a class="social dc" href="' + esc(DISCORD) + '" target="_blank" rel="noopener" aria-label="ส่งข้อความหาทาง Discord"><span class="ic">' + ICON.discord + '</span><span><b>Discord</b><small>DM สอบถาม</small></span><span class="arrow">' + ICON.arrow + '</span></a>' +
    '</div></div></div>';
}

function catKey(it){
  if (it.kind === "code") return it.lang;
  if (isRich(it.kind)) return it.scriptType === "other" ? "other:" + (it.scriptTypeOther || "") : it.scriptType;
  return it.fileType === "other" ? "other:" + (it.fileTypeOther || "") : it.fileType;
}
function haystack(it){ return [it.title, typeName(it), kindLabel(it.kind), it.ae ? "ae " + it.ae : ""].join(" ").toLowerCase(); }
var TAB_KIND = { code: "code", files: "file", scripts: "script", presets: "preset" };
function viewResource(){
  var kind = TAB_KIND[ui.resTab] || "code";
  var all = state.items;
  var counts = { code: 0, file: 0, script: 0, preset: 0 };
  all.forEach(function(i){ if (counts[i.kind] != null) counts[i.kind]++; });
  var q = ui.q.trim().toLowerCase();
  var searching = !!q;
  var pool = searching ? all : all.filter(function(i){ return i.kind === kind; });
  var cats = [];
  if (!searching) pool.forEach(function(i){ var k = catKey(i); if (cats.indexOf(k) < 0) cats.push(k); });
  if (ui.filter !== "all" && cats.indexOf(ui.filter) < 0) ui.filter = "all";
  var shown = pool.filter(function(i){ return (searching || ui.filter === "all" || ui.filter === catKey(i)) && (!q || haystack(i).indexOf(q) >= 0); });
  var sortOpts = SORTS.filter(function(s){ return !(s[0] === "downloads" && kind === "code" && !searching); });
  var sortMode = sortOpts.some(function(s){ return s[0] === ui.sort; }) ? ui.sort : "new";
  shown = sortItems(shown, sortMode);
  function catLabel(k){ if (kind === "code") return langName(k); if (String(k).indexOf("other:") === 0) return k.slice(6) || "อื่นๆ"; return (isRich(kind) ? KIND[kind].names[k] : FT_NAME[k]) || k; }
  var emptyTitle = { code: "ยังไม่มีโค้ดแจก", file: "ยังไม่มีไฟล์แจก", script: "ยังไม่มี Extension/Script แจก", preset: "ยังไม่มี Project/Preset แจก" }[kind];
  var body = setupError ? setupHTML() : !loaded.items ? loadingHTML() : shown.length ? '<div class="grid" id="grid">' + shown.map(cardHTML).join("") + '</div>'
      : '<div class="empty"><b>' + (searching ? "ไม่พบ \"" + esc(ui.q.trim()) + "\" ในทุกหมวด" : pool.length ? "ไม่พบงานในหมวดนี้" : emptyTitle) + '</b>' + (searching ? "ลองพิมพ์คำอื่น เช่น ชื่อประเภทไฟล์หรือเวอร์ชัน AE" : pool.length ? "ลองเลือกหมวดย่อยอื่น" : "ของแจกหมวดนี้จะขึ้นตรงนี้เมื่อมีการเพิ่มจากหน้า Admin") + '</div>';
  function tab(key, k, label){ return '<button class="tab" role="tab" data-tab="' + key + '" aria-selected="' + (!searching && kind === k) + '">' + label + ' <span class="n">' + counts[k] + '</span></button>'; }
  return '<div class="res-head"><div><p class="eyebrow">// Resource bin</p><h1 class="page-title">เลือกของแจกได้เลย</h1></div>' +
      '<div class="tabs" role="tablist">' + tab("code", "code", "Code") + tab("files", "file", "ไฟล์") + tab("scripts", "script", "Extension/Script") + tab("presets", "preset", "PJF/Preset") + '</div>' +
      '<div class="filters">' +
        (searching ? '<p class="search-note">ค้นจาก<b>ทุกหมวด</b> · พบ ' + shown.length + ' รายการ <button type="button" class="chip" id="clearQ">ล้างคำค้น</button></p>'
          : '<button class="chip" data-f="all" aria-pressed="' + (ui.filter === "all") + '">ทั้งหมด</button>' +
            cats.map(function(c){ return '<button class="chip" data-f="' + esc(c) + '" aria-pressed="' + (ui.filter === c) + '">' + esc(catLabel(c)) + '</button>'; }).join("")) +
        '<div class="tools"><label class="sort"><span class="lbl">เรียง</span><select id="sortSel" aria-label="เรียงลำดับ">' + sortOpts.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === sortMode ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select></label>' +
        '<label class="search">' + ICON.search + '<input id="q" type="search" placeholder="ค้นหาทุกหมวด" value="' + esc(ui.q) + '" aria-label="ค้นหาของแจกทุกหมวด"></label></div></div>' +
    '</div>' + body;
}

/* detail pages read one full item from Firebase (images, code, description) */
function needFull(id){
  if (full[id] || fullPending[id] || !db) return;
  fullPending[id] = 1;
  db.collection("items").doc(id).get().then(function(d){
    delete fullPending[id];
    full[id] = d.exists ? Object.assign({}, d.data(), { id: id }) : { id: id, missing: true };
    if (current.id === id) render(false);
  }).catch(function(){ delete fullPending[id]; full[id] = { id: id, missing: true, failed: true }; if (current.id === id) render(false); });
}
function detailItem(id, kind, back){
  if (setupError) return { html: back + setupHTML() };
  var it = full[id];
  if (!it) { needFull(id); return { html: back + loadingHTML() }; }
  if (it.missing || it.kind !== kind || (it.hidden && !isAdmin())) {
    return { html: back + '<div class="empty"><b>' + (it.failed ? "โหลดไม่สำเร็จ" : "ไม่พบรายการนี้") + '</b>' + (it.failed ? "ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองรีเฟรช" : "อาจถูกลบหรือซ่อนไว้แล้ว") + '</div>' };
  }
  return { it: it };
}

function viewCode(id){
  var back = '<a class="back" href="#resource">' + ICON.back + ' กลับไปหน้า Resource</a>';
  var r = detailItem(id, "code", back); if (!r.it) return r.html;
  var it = r.it;
  var lines = String(it.code || "").split("\n").length;
  var nums = []; for (var n = 1; n <= lines; n++) nums.push(n);
  var ext = { xml: "html", javascript: "js", typescript: "ts", python: "py", csharp: "cs", cpp: "cpp", markdown: "md", bash: "sh", plaintext: "txt", yaml: "yml", kotlin: "kt", rust: "rs", ruby: "rb" }[it.lang] || it.lang;
  return back +
    '<div class="detail-head"><div>' + badgeHTML(it) + '<h1>' + esc(it.title) + '</h1><div class="detail-actions">' + shareBtn("code-" + it.id, it.title) + '</div></div><div class="cover">' + coverHTML(it) + ribbonsHTML(it) + '</div></div>' +
    '<div class="editor"><div class="editor-bar"><span class="lights"><i></i><i></i><i></i></span><span class="fname">main.' + esc(ext) + ' · ' + lines + ' บรรทัด · ' + esc(langName(it.lang)) + '</span>' +
      '<button class="btn sm primary" id="copyBtn" type="button">' + ICON.copy + '<span class="glitch-txt">คัดลอกโค้ด</span></button></div>' +
    '<div class="editor-body"><div class="gutter" aria-hidden="true">' + nums.join("\n") + '</div><pre><code class="hljs" id="codeOut">' + highlight(it.code || "", it.lang) + '</code></pre></div></div>' +
    '<div class="panel rate-panel">' + rateWidget(it.id, false) + '</div>';
}

function viewScript(id, kind){
  kind = kind || "script";
  var K = KIND[kind];
  var back = '<a class="back" href="#resource-' + K.tab + '">' + ICON.back + ' กลับไปหน้า ' + K.label + '</a>';
  var r = detailItem(id, kind, back); if (!r.it) return r.html;
  var it = r.it;
  var panels = Array.isArray(it.panels) ? it.panels : [];
  var viewer;
  if (kind === "preset") {
    var many = panels.length > 1;
    viewer = '<div class="pv" id="pv" data-n="' + panels.length + '">' +
      '<div class="pv-bar"><span class="pv-rec">● PREVIEW</span><span class="pv-name">' + esc(it.title) + '</span>' +
        '<span class="pv-count" aria-live="polite">' + (panels.length ? '<b id="pvNow">1</b> / ' + panels.length : '0 / 0') + '</span></div>' +
      '<div class="pv-stage" id="pvStage">' +
        (panels.length
          ? '<img id="pvImg" src="' + esc(panels[0]) + '" alt="ภาพตัวอย่างที่ 1 ของ ' + esc(it.title) + '">' +
            (many ? '<button type="button" class="pv-nav prev" data-nav="-1" aria-label="ภาพก่อนหน้า">‹</button><button type="button" class="pv-nav next" data-nav="1" aria-label="ภาพถัดไป">›</button>' : '')
          : '<div class="sui-empty"><b>ยังไม่มีภาพตัวอย่าง</b>ภาพตัวอย่างจะแสดงตรงนี้</div>') +
        '<span class="pv-safe" aria-hidden="true"></span>' +
      '</div>' +
      (many ? '<div class="pv-dots" role="tablist" aria-label="เลือกภาพ">' + panels.map(function(p, i){
        return '<button type="button" class="pv-dot" data-go="' + i + '" role="tab" aria-selected="' + (i === 0) + '" aria-label="ภาพที่ ' + (i + 1) + '"></button>';
      }).join("") + '</div>' : '') +
    '</div>';
  } else {
    var stage = panels.length
      ? '<img id="suiImg" src="' + esc(panels[0]) + '" alt="ภาพ ScriptUI Panel ของ ' + esc(it.title) + '">'
      : '<div class="sui-empty"><b>ยังไม่มีภาพ Panel</b>ภาพหน้าตา Panel จะแสดงตรงนี้</div>';
    var thumbs = panels.length > 1 ? '<div class="sui-thumbs">' + panels.map(function(p, i){
      return '<button type="button" class="sui-thumb" data-pi="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="ภาพที่ ' + (i + 1) + '"><img src="' + esc(p) + '" alt=""></button>';
    }).join("") + '</div>' : "";
    viewer = '<div class="sui"><div class="sui-bar"><span class="sui-menu" aria-hidden="true">≡</span><span class="sui-tab">' + esc(it.title) + '</span><span class="sui-x" aria-hidden="true">»</span></div>' +
      '<div class="sui-stage">' + stage + '</div>' + thumbs + '</div>';
  }
  var yt = isYoutube(it.youtube)
    ? '<a class="btn rec" href="' + esc(it.youtube) + '" target="_blank" rel="noopener noreferrer">' + ICON.play + '<span class="glitch-txt">ดูวิธีการใช้งาน</span></a>'
    : '';
  return back +
    '<div class="detail-head"><div>' + badgeHTML(it) + '<h1>' + esc(it.title) + '</h1></div><div class="cover">' + coverHTML(it) + ribbonsHTML(it) + '</div></div>' +
    '<div class="script-grid">' + viewer +
      '<aside class="panel script-info"><p class="eyebrow">// รายละเอียด</p>' +
        '<div class="desc">' + (it.desc ? esc(it.desc) : '<span class="muted">ยังไม่มีรายละเอียด</span>') + '</div>' +
        '<dl class="meta"><div><dt>ประเภท</dt><dd>' + esc(stName(it)) + '</dd></div>' +
          (it.ae ? '<div><dt>รองรับ</dt><dd>After Effects ' + esc(it.ae) + '</dd></div>' : '') +
          '<div><dt>' + K.imgLabel + '</dt><dd>' + panels.length + ' ภาพ</dd></div><div><dt>ยอดดาวน์โหลด</dt><dd><span data-dlc="' + esc(it.id) + '">' + fmt(dlCount(it.id)) + '</span> ครั้ง</dd></div></dl>' +
        '<div class="script-actions"><a class="btn primary" data-dl="' + esc(it.id) + '" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">' + ICON.down + '<span class="glitch-txt">ดาวน์โหลด</span></a>' + yt + shareBtn(kind + "-" + it.id, it.title) + '</div>' +
        rateWidget(it.id, false) +
      '</aside>' +
    '</div>';
}

/* preset viewer: one image at a time, arrows, dots, keyboard and swipe */
var pvIndex = 0;
function pvShow(i, dir){
  var it = full[current.id];
  var img = $("#pvImg"); if (!it || !img || !it.panels || !it.panels.length) return;
  var n = it.panels.length;
  pvIndex = (i + n) % n;
  img.classList.remove("in-l", "in-r"); void img.offsetWidth;
  img.classList.add(dir < 0 ? "in-l" : "in-r");
  img.src = it.panels[pvIndex];
  img.alt = "ภาพตัวอย่างที่ " + (pvIndex + 1) + " ของ " + it.title;
  var now = $("#pvNow"); if (now) now.textContent = pvIndex + 1;
  document.querySelectorAll("[data-go]").forEach(function(d){ d.setAttribute("aria-selected", String(+d.getAttribute("data-go") === pvIndex)); });
}
function bindPreset(){
  pvIndex = 0;
  var pv = $("#pv"); if (!pv) return;
  pv.addEventListener("click", function(e){
    var nav = e.target.closest("[data-nav]"), go = e.target.closest("[data-go]");
    if (nav) { var d = +nav.getAttribute("data-nav"); pvShow(pvIndex + d, d); }
    else if (go) { var t = +go.getAttribute("data-go"); pvShow(t, t < pvIndex ? -1 : 1); }
  });
  var st = $("#pvStage"), x0 = null;
  st.addEventListener("touchstart", function(e){ x0 = e.touches[0].clientX; }, { passive: true });
  st.addEventListener("touchend", function(e){
    if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) pvShow(pvIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
}
document.addEventListener("keydown", function(e){
  if (current.route !== "preset" || !$("#pvImg") || /input|textarea|select/i.test((e.target.tagName || ""))) return;
  if (e.key === "ArrowRight") pvShow(pvIndex + 1, 1);
  if (e.key === "ArrowLeft") pvShow(pvIndex - 1, -1);
});

/* ---------- admin views ---------- */
function viewLogin(){
  return '<div class="login-wrap"><form class="panel login" id="loginForm" novalidate autocomplete="off">' +
    '<div class="login-head"><span class="rec-dot">LOCKED</span><span class="tcf">ADMIN_ACCESS</span></div>' +
    '<h2>เข้าสู่ระบบผู้ดูแล</h2><p class="sub">ใส่ชื่อผู้ใช้และรหัสผ่านเพื่อจัดการของแจก</p>' +
    '<div class="field"><label for="l-user">ชื่อผู้ใช้</label><input id="l-user" type="text" autocapitalize="off" spellcheck="false" required></div>' +
    '<div class="field"><label for="l-pass">รหัสผ่าน</label><input id="l-pass" type="password" required></div>' +
    '<p class="err" id="loginErr" hidden></p>' +
    '<button class="btn primary" id="loginBtn" type="submit" style="width:100%"><span class="glitch-txt">เข้าสู่ระบบ</span></button>' +
  '</form></div>';
}
function listHTML(){
  var list = newest();
  var hidden = list.filter(function(i){ return i.hidden; }).length;
  return '<h2>ของแจกทั้งหมด</h2><p class="sub">' + list.length + ' รายการ' + (hidden ? ' · ร่าง ' + hidden + ' รายการ' : '') + ' · แก้ไขหรือลบได้จากตรงนี้</p>' +
    (list.length ? '<div class="list">' + list.map(function(it){
      var tags = (it.hidden ? '<span class="tag draft">ร่าง</span>' : '') + (it.pinned ? '<span class="tag pin">ปักหมุด</span>' : '');
      return '<div class="li' + (it.hidden ? ' is-draft' : '') + '"><div class="cover">' + coverHTML(it) + '</div><div style="min-width:0"><h4>' + esc(it.title) + '</h4>' + badgeHTML(it) + tags + '<div class="li-stats">' + ratingSummary(it.id) + (it.kind !== "code" ? '<span class="dl-pill">' + ICON.down + '<span data-dlc="' + esc(it.id) + '">' + fmt(dlCount(it.id)) + '</span></span>' : '') + '</div></div><div class="acts">' +
        '<button class="icon-btn" type="button" data-edit="' + esc(it.id) + '" aria-label="แก้ไข">' + ICON.edit + '</button>' +
        (ui.confirmDel === it.id ? '<button class="icon-btn confirm" type="button" data-del="' + esc(it.id) + '">ยืนยันลบ</button>' : '<button class="icon-btn danger" type="button" data-askdel="' + esc(it.id) + '" aria-label="ลบ">' + ICON.trash + '</button>') +
        '</div></div>';
    }).join("") + '</div>' : '<div class="empty" style="padding:24px"><b>ยังว่างอยู่</b>เพิ่มชิ้นแรกจากฟอร์มด้านซ้าย</div>');
}
function catStatusHTML(){
  if (cat.state === "ok") return '<span class="ok">● รายการสาธารณะอัปเดตแล้ว ' + hhmm(cat.at) + ' · ' + cat.count + ' ชิ้น</span>';
  if (cat.state === "busy") return '<span>● กำลังอัปเดตรายการสาธารณะ…</span>';
  if (cat.state === "err") return '<span class="bad">● อัปเดตรายการสาธารณะไม่สำเร็จ: ' + esc(cat.msg) + '</span>';
  return '<span>● กำลังตรวจรายการสาธารณะ…</span>';
}
function viewAdmin(){
  if (setupError) return setupHTML();
  if (!ui.authReady) return loadingHTML();
  if (!isAdmin()) return viewLogin();
  var editing = ui.editId ? findItem(ui.editId) : null;
  if (ui.editId && !editing) ui.editId = null;
  var m = ui.adminMode;
  var d = editing || {};
  var langOpts = '<option value="auto">ตรวจจับอัตโนมัติ</option>' + LANGS.map(function(l){ return '<option value="' + l[0] + '"' + (editing && editing.lang === l[0] && editing.langManual ? " selected" : "") + '>' + l[1] + '</option>'; }).join("");
  var ftOpts = FTYPES.map(function(f){ return '<option value="' + f[0] + '"' + ((d.fileType || "pdf") === f[0] ? " selected" : "") + '>' + f[1] + '</option>'; }).join("");
  return '<div class="section-head"><div><p class="eyebrow">// Admin console · jittipat_admin</p><h1 class="page-title">เพิ่มของแจก</h1></div><button class="btn sm ghost" type="button" id="logoutBtn"><span class="glitch-txt">ออกจากระบบ</span></button></div>' +
  '<p class="cat-status" id="catStatus">' + catStatusHTML() + '</p>' +
  '<div class="admin-grid"><div class="panel">' +
    (editing ? '<div class="editing"><span>กำลังแก้ไข: <b>' + esc(editing.title) + '</b></span><button class="btn sm ghost" id="cancelEdit" type="button">ยกเลิก</button></div>' : "") +
    '<div class="modes"' + (editing ? ' hidden' : "") + '><button type="button" class="mode" data-mode="code" aria-pressed="' + (m === "code") + '"><b>โหมดแจก Code</b><small>วางโค้ด ระบบตรวจภาษาให้</small></button><button type="button" class="mode" data-mode="file" aria-pressed="' + (m === "file") + '"><b>โหมดแจกไฟล์</b><small>ใส่ลิงก์ Drive หรือลิงก์อื่น</small></button><button type="button" class="mode" data-mode="script" aria-pressed="' + (m === "script") + '"><b>โหมด Extension/Script</b><small>ลิงก์ + ภาพ Panel + คลิปสอน</small></button><button type="button" class="mode" data-mode="preset" aria-pressed="' + (m === "preset") + '"><b>โหมด PJF/Preset</b><small>Project / .ffx + ภาพตัวอย่าง + คลิปสอน</small></button></div>' +
    '<form id="itemForm" novalidate>' +
      '<div class="field"><label for="f-title">ชื่องาน</label><input id="f-title" type="text" maxlength="120" required placeholder="' + (m === "code" ? "เช่น โครงสร้าง html พื้นฐาน" : m === "script" ? "เช่น Auto Layer Tools" : m === "preset" ? "เช่น Glitch Transition Pack" : "เช่น แจกโครงสร้างใบงาน") + '" value="' + esc(d.title || "") + '"></div>' +
      '<div class="field"><span class="lbl">ภาพหน้าปก</span><div class="drop" id="drop"><div class="thumb" id="thumb"></div><div><p>ลากรูปมาวาง หรือเลือกไฟล์ (JPG / PNG) ระบบจะย่อขนาดให้อัตโนมัติ</p><div class="acts"><label class="btn sm" for="f-cover">เลือกรูป</label><input id="f-cover" type="file" accept="image/*" hidden><button class="btn sm ghost" type="button" id="rmCover">ใช้ปกอัตโนมัติ</button></div></div></div></div>' +
      (m === "code"
        ? '<div class="field"><label for="f-code">วางโค้ด</label><textarea id="f-code" spellcheck="false" placeholder="วางโค้ดตรงนี้">' + esc(d.code || "") + '</textarea></div>' +
          '<div class="row2"><div class="field"><label for="f-lang">ภาษา</label><select id="f-lang">' + langOpts + '</select></div><div class="field"><span class="lbl">ผลตรวจจับ</span><div class="detect" id="detect"></div></div></div>' +
          '<div class="field"><span class="lbl">ตัวอย่างการไฮไลต์</span><div class="preview-code"><pre><code class="hljs" id="prev"></code></pre></div></div>'
        : isRich(m) ? scriptFieldsHTML(d, m)
        : '<div class="field"><label for="f-url">ลิงก์ดาวน์โหลด</label><input id="f-url" type="url" placeholder="https://drive.google.com/..." value="' + esc(d.url || "") + '"></div>' +
          '<div class="row2"><div class="field"><label for="f-ftype">หมวดหมู่ไฟล์</label><select id="f-ftype">' + ftOpts + '</select></div><div class="field" id="otherWrap"' + (d.fileType === "other" ? "" : " hidden") + '><label for="f-fother">ระบุชนิดไฟล์</label><input id="f-fother" type="text" maxlength="24" placeholder="เช่น ZIP, AEP, MP4" value="' + esc(d.fileTypeOther || "") + '"></div></div>') +
      (m !== "code" ? '<div class="field"><label for="f-ae">รองรับ After Effects เวอร์ชัน <span class="opt">(ไม่ใส่ก็ได้)</span></label><input id="f-ae" type="text" maxlength="24" placeholder="เช่น 2022+ หรือ CC 2019–2025" value="' + esc(d.ae || "") + '"></div>' : '') +
      '<div class="toggles">' +
        '<label class="tg"><input type="checkbox" id="f-hidden"' + (d.hidden ? " checked" : "") + '><span class="tg-ui" aria-hidden="true"></span><span><b>ซ่อนไว้ก่อน (ร่าง)</b><small>บันทึกไว้ แต่ยังไม่แสดงให้คนทั่วไปเห็น</small></span></label>' +
        '<label class="tg"><input type="checkbox" id="f-pinned"' + (d.pinned ? " checked" : "") + '><span class="tg-ui" aria-hidden="true"></span><span><b>ปักหมุดหน้า Home</b><small>โชว์ในส่วน "ของเด่น" (สูงสุด ' + MAX_PINNED + ' ชิ้นล่าสุด)</small></span></label>' +
      '</div>' +
      '<p class="err" id="formErr" hidden></p>' +
      '<div class="form-actions"><button class="btn rec" id="saveBtn" type="submit"><span class="glitch-txt" id="saveLbl">' + saveLabel(!!editing, !!d.hidden) + '</span></button></div>' +
    '</form></div>' +
    '<div style="display:grid;gap:28px;min-width:0"><div class="panel" id="adminList">' + listHTML() + '</div>' +
    '<div class="panel"><h2>ข้อความหน้า About Us</h2><p class="sub">เล่าเรื่องการเดินทางของคุณ ขึ้นบรรทัดใหม่ได้</p><div class="field"><label for="f-about">ข้อความ</label><textarea id="f-about" class="prose">' + esc(state.about) + '</textarea></div><button class="btn sm" type="button" id="saveAbout"><span class="glitch-txt">บันทึกข้อความ</span></button></div>' +
    '<div class="panel"><h2>สำรองข้อมูล</h2><p class="sub">ดาวน์โหลดของแจกทั้งหมด (รวมรูป) ยอดดาวน์โหลด คะแนน ยอดผู้เข้าชม และข้อความ About เก็บไว้เป็นไฟล์ .json ในเครื่อง</p><button class="btn sm" type="button" id="backupBtn">' + ICON.save + '<span class="glitch-txt">ดาวน์โหลดไฟล์สำรอง</span></button></div>' +
  '</div></div>';
}
function saveLabel(editing, hidden){ return hidden ? "บันทึกเป็นร่าง" : editing ? "บันทึกการแก้ไข" : "เผยแพร่ของแจก"; }

function scriptFieldsHTML(d, kind){
  kind = kind || "script";
  var K = KIND[kind];
  var opts = K.types.map(function(s){ return '<option value="' + s[0] + '"' + ((d.scriptType || K.def) === s[0] ? " selected" : "") + '>' + s[1] + '</option>'; }).join("");
  return '<div class="field"><label for="f-url">ลิงก์ดาวน์โหลด</label><input id="f-url" type="url" placeholder="https://drive.google.com/..." value="' + esc(d.url || "") + '"></div>' +
    '<div class="row2"><div class="field"><label for="f-stype">ประเภท</label><select id="f-stype">' + opts + '</select></div>' +
    '<div class="field" id="sOtherWrap"' + (d.scriptType === "other" ? "" : " hidden") + '><label for="f-sother">ระบุประเภท</label><input id="f-sother" type="text" maxlength="24" placeholder="' + K.otherHint + '" value="' + esc(d.scriptTypeOther || "") + '"></div></div>' +
    '<div class="field"><span class="lbl">' + K.imgField + ' (สูงสุด ' + MAX_PANELS + ' ภาพ)</span>' +
      '<div class="panels-mgr" id="panels"></div>' +
      '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn sm" for="f-panel" id="addPanelBtn">+ เพิ่ม' + K.imgLabel + '</label><input id="f-panel" type="file" accept="image/*" multiple hidden></div>' +
      '<p class="hint">ภาพแรกจะแสดงก่อนในหน้ารายละเอียด กด ← เพื่อเลื่อนลำดับ</p></div>' +
    '<div class="field"><label for="f-desc">รายละเอียด</label><textarea id="f-desc" class="prose" placeholder="' + K.descHint + '">' + esc(d.desc || "") + '</textarea></div>' +
    '<div class="field"><label for="f-yt">ลิงก์ YouTube สอนใช้งาน</label><input id="f-yt" type="url" placeholder="https://youtube.com/watch?v=..." value="' + esc(d.youtube || "") + '"></div>';
}
function renderPanels(){
  var box = $("#panels"); if (!box) return;
  box.innerHTML = ui.panels.length ? ui.panels.map(function(src, i){
    return '<div class="pthumb"><img src="' + esc(src) + '" alt="ภาพ Panel ที่ ' + (i + 1) + '"><span class="pnum">' + (i + 1) + '</span>' +
      '<div class="pacts">' + (i > 0 ? '<button type="button" class="icon-btn" data-pup="' + i + '" aria-label="เลื่อนไปก่อนหน้า">←</button>' : '') +
      '<button type="button" class="icon-btn danger" data-prm="' + i + '" aria-label="ลบภาพ">' + ICON.trash + '</button></div></div>';
  }).join("") : '<div class="pempty">ยังไม่มีภาพ</div>';
  var add = $("#addPanelBtn"); if (add) add.hidden = ui.panels.length >= MAX_PANELS;
}

/* ---------- admin behaviour ---------- */
function setThumb(){
  var th = $("#thumb"); if (!th) return;
  var fake = { id: "p", kind: ui.adminMode, cover: ui.cover, lang: ui.adminMode === "code" ? currentLang() : "", fileType: ($("#f-ftype") || {}).value, fileTypeOther: ($("#f-fother") || {}).value, scriptType: ($("#f-stype") || {}).value, scriptTypeOther: ($("#f-sother") || {}).value };
  th.innerHTML = coverHTML(fake);
}
function currentLang(){
  var sel = $("#f-lang"), code = ($("#f-code") || {}).value || "";
  if (sel && sel.value !== "auto") return sel.value;
  return detectLang(code);
}
var prevT;
function updateCodePreview(){
  var code = ($("#f-code") || {}).value || "";
  var det = detectLang(code);
  var sel = $("#f-lang");
  var manual = sel && sel.value !== "auto";
  $("#detect").innerHTML = code.trim()
    ? '<span class="badge"><span class="dot"></span>' + esc(langName(det)) + '</span>' + (manual ? '<span>ใช้ภาษาที่เลือก: <b>' + esc(langName(sel.value)) + '</b></span>' : '<span>ระบบตรวจพบอัตโนมัติ</span>')
    : '<span>วางโค้ดแล้วระบบจะบอกภาษาให้</span>';
  var lang = manual ? sel.value : det;
  $("#prev").innerHTML = code.trim() ? highlight(code.split("\n").slice(0, 40).join("\n"), lang) : '<span class="hljs-comment">// ตัวอย่างโค้ดจะแสดงที่นี่</span>';
  setThumb();
}
function readCover(file){ resizeImage(file, 960, 1200, 0.8, function(d){ ui.cover = d; setThumb(); }); }
function resizeImage(file, maxW, maxH, q, cb){
  if (!file || !/^image\//.test(file.type)) { toast("เลือกไฟล์รูปภาพเท่านั้น"); return; }
  var fr = new FileReader();
  fr.onload = function(){
    var img = new Image();
    img.onload = function(){
      var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, maxW / w, maxH / h);
      var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
      var x = c.getContext("2d"); x.fillStyle = "#1e1e1e"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", q));
    };
    img.onerror = function(){ toast("อ่านรูปนี้ไม่ได้ ลองไฟล์ JPG หรือ PNG"); };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
function formError(msg){ var e = $("#formErr"); if (!e) return; e.textContent = msg; e.hidden = !msg; }

function bindLogin(){
  var f = $("#loginForm"); if (!f) return;
  setTimeout(function(){ var u = $("#l-user"); if (u) u.focus(); }, 50);
  f.addEventListener("submit", function(e){
    e.preventDefault();
    var err = $("#loginErr"), btn = $("#loginBtn");
    var user = $("#l-user").value.trim().toLowerCase(), pass = $("#l-pass").value;
    if (!user || !pass) { err.textContent = "กรอกชื่อผู้ใช้และรหัสผ่านให้ครบ"; err.hidden = false; return; }
    if (!/^[a-z0-9._-]+$/.test(user)) { err.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    firebase.auth().signInWithEmailAndPassword(user + "@" + ADMIN_DOMAIN, pass).then(function(){
      toast("เข้าสู่ระบบแล้ว");
    }).catch(function(ex){
      btn.disabled = false;
      var c = ex && ex.code;
      err.textContent = c === "auth/too-many-requests" ? "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่" : c === "auth/network-request-failed" ? "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง" : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      err.hidden = false;
      var p = $("#l-pass"); p.value = ""; p.focus();
      f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
    });
  });
}
function bindList(){
  document.querySelectorAll("[data-edit]").forEach(function(b){ b.addEventListener("click", function(){
    var it = findItem(b.getAttribute("data-edit")); if (!it) return;
    ui.editId = it.id; ui.adminMode = it.kind; ui.cover = it.cover || null; ui.panels = Array.isArray(it.panels) ? it.panels.slice() : []; ui.confirmDel = null; render(false); scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
  }); });
  document.querySelectorAll("[data-askdel]").forEach(function(b){ b.addEventListener("click", function(){ ui.confirmDel = b.getAttribute("data-askdel"); refreshList(); }); });
  document.querySelectorAll("[data-del]").forEach(function(b){ b.addEventListener("click", function(){
    var id = b.getAttribute("data-del"); b.disabled = true;
    Promise.all([db.collection("items").doc(id).delete(), db.collection("counters").doc(id).delete().catch(function(){})]).then(function(){ ui.confirmDel = null; delete full[id]; if (ui.editId === id) { ui.editId = null; render(false); } toast("ลบแล้ว"); }).catch(writeFail);
  }); });
}
function refreshList(){ var l = $("#adminList"); if (l) { l.innerHTML = listHTML(); bindList(); } }
function writeFail(ex){
  ui.busy = false;
  document.querySelectorAll("#saveBtn,#saveAbout,[data-del]").forEach(function(b){ b.disabled = false; });
  var c = ex && ex.code;
  if (c === "permission-denied") toast("ไม่มีสิทธิ์บันทึก ลองออกจากระบบแล้วล็อกอินใหม่");
  else if (c === "invalid-argument" || c === "resource-exhausted") toast("ข้อมูลใหญ่เกินไป ลองใช้รูปปกที่เล็กลง");
  else toast("บันทึกไม่สำเร็จ ลองอีกครั้ง");
}
function downloadBackup(){
  var btn = $("#backupBtn"); if (btn) btn.disabled = true;
  var counters = state.counters;
  db.collection("counters").get().then(function(snap){
    counters = {}; snap.docs.forEach(function(d){ counters[d.id] = d.data(); });
  }).catch(function(){}).then(function(){
    var data = { site: "คลังสมบัติ Jittipat_Editz", exportedAt: new Date().toISOString(), about: state.about, visits: state.visits, items: state.items, counters: counters };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    var a = document.createElement("a"); var d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = "jittipat-vault-backup-" + d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    if (btn) btn.disabled = false;
    toast("ดาวน์โหลดไฟล์สำรองแล้ว " + state.items.length + " รายการ");
  });
}
function bindAdmin(){
  if (!isAdmin()) { bindLogin(); return; }
  $("#logoutBtn").addEventListener("click", function(){ firebase.auth().signOut().then(function(){ ui.editId = null; ui.cover = null; toast("ออกจากระบบแล้ว"); }); });
  document.querySelectorAll("[data-mode]").forEach(function(b){ b.addEventListener("click", function(){ ui.adminMode = b.getAttribute("data-mode"); ui.cover = null; ui.panels = []; render(false); }); });
  var ce = $("#cancelEdit"); if (ce) ce.addEventListener("click", function(){ ui.editId = null; ui.cover = null; ui.panels = []; render(false); });
  $("#f-cover").addEventListener("change", function(e){ readCover(e.target.files[0]); e.target.value = ""; });
  $("#rmCover").addEventListener("click", function(){ ui.cover = null; setThumb(); });
  $("#f-hidden").addEventListener("change", function(){ $("#saveLbl").textContent = saveLabel(!!ui.editId, this.checked); });
  $("#backupBtn").addEventListener("click", downloadBackup);
  var drop = $("#drop");
  drop.addEventListener("dragover", function(e){ e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", function(){ drop.classList.remove("over"); });
  drop.addEventListener("drop", function(e){ e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) readCover(e.dataTransfer.files[0]); });
  if (ui.adminMode === "code") {
    var ta = $("#f-code");
    ta.addEventListener("input", function(){ clearTimeout(prevT); prevT = setTimeout(updateCodePreview, 200); });
    ta.addEventListener("keydown", function(e){ if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); } });
    $("#f-lang").addEventListener("change", updateCodePreview);
    updateCodePreview();
  } else if (isRich(ui.adminMode)) {
    var st = $("#f-stype");
    st.addEventListener("change", function(){ $("#sOtherWrap").hidden = st.value !== "other"; setThumb(); });
    $("#f-sother").addEventListener("input", setThumb);
    $("#f-panel").addEventListener("change", function(e){
      var files = Array.prototype.slice.call(e.target.files || []); e.target.value = "";
      var room = MAX_PANELS - ui.panels.length;
      if (files.length > room) toast("เพิ่มได้อีก " + Math.max(0, room) + " ภาพ");
      files.slice(0, Math.max(0, room)).forEach(function(f){ resizeImage(f, 1100, 1400, 0.86, function(d){ if (ui.panels.length < MAX_PANELS) { ui.panels.push(d); renderPanels(); } }); });
    });
    $("#panels").addEventListener("click", function(e){
      var rm = e.target.closest("[data-prm]"), up = e.target.closest("[data-pup]");
      if (rm) { ui.panels.splice(+rm.getAttribute("data-prm"), 1); renderPanels(); }
      else if (up) { var i = +up.getAttribute("data-pup"); var t = ui.panels[i - 1]; ui.panels[i - 1] = ui.panels[i]; ui.panels[i] = t; renderPanels(); }
    });
    renderPanels();
    setThumb();
  } else {
    var ft = $("#f-ftype");
    ft.addEventListener("change", function(){ $("#otherWrap").hidden = ft.value !== "other"; setThumb(); });
    $("#f-fother").addEventListener("input", setThumb);
    setThumb();
  }
  $("#itemForm").addEventListener("submit", function(e){
    e.preventDefault(); formError("");
    if (ui.busy) return;
    var title = $("#f-title").value.trim();
    if (!title) { formError("ใส่ชื่องานก่อนเผยแพร่"); $("#f-title").focus(); return; }
    var base = ui.editId ? findItem(ui.editId) : null;
    var item = { kind: ui.adminMode, title: title, cover: ui.cover || null, created: base ? base.created : Date.now(), updated: Date.now(),
      hidden: $("#f-hidden").checked, pinned: $("#f-pinned").checked };
    var aeInput = $("#f-ae"); if (aeInput && normAE(aeInput.value)) item.ae = normAE(aeInput.value);
    if (ui.adminMode === "code") {
      var code = $("#f-code").value.replace(/\s+$/, "");
      if (!code.trim()) { formError("วางโค้ดก่อนเผยแพร่"); $("#f-code").focus(); return; }
      var sel = $("#f-lang").value;
      item.code = code; item.lang = sel === "auto" ? detectLang(code) : sel; item.langManual = sel !== "auto";
    } else if (isRich(ui.adminMode)) {
      var surl = $("#f-url").value.trim();
      if (!/^https?:\/\/\S+$/i.test(surl)) { formError("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"); $("#f-url").focus(); return; }
      var yt = $("#f-yt").value.trim();
      if (yt && !isYoutube(yt)) { formError("ลิงก์วิดีโอต้องเป็นลิงก์ YouTube (youtube.com หรือ youtu.be)"); $("#f-yt").focus(); return; }
      item.url = surl; item.scriptType = $("#f-stype").value;
      if (item.scriptType === "other") item.scriptTypeOther = $("#f-sother").value.trim() || "อื่นๆ";
      item.panels = ui.panels.slice(0, MAX_PANELS); item.desc = $("#f-desc").value.trim(); item.youtube = yt;
    } else {
      var url = $("#f-url").value.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) { formError("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"); $("#f-url").focus(); return; }
      item.url = url; item.fileType = $("#f-ftype").value;
      if (item.fileType === "other") item.fileTypeOther = $("#f-fother").value.trim() || "อื่นๆ";
    }
    if (JSON.stringify(item).length > 950000) { formError("รูปรวมกันใหญ่เกินไป ลองลดจำนวนภาพหรือใช้ภาพที่เล็กลง"); return; }
    var id = base ? base.id : uid();
    ui.busy = true; $("#saveBtn").disabled = true; toast("กำลังบันทึก…");
    db.collection("items").doc(id).set(item).then(function(){
      ui.busy = false; ui.editId = null; ui.cover = null; ui.panels = [];
      delete full[id];
      toast(item.hidden ? "บันทึกเป็นร่างแล้ว (ยังไม่แสดงให้คนทั่วไปเห็น)" : base ? "บันทึกการแก้ไขแล้ว" : "เผยแพร่ของแจกแล้ว");
      render(false);
    }).catch(writeFail);
  });
  $("#saveAbout").addEventListener("click", function(){
    var b = this, text = $("#f-about").value.trim(); b.disabled = true;
    db.collection("settings").doc("site").set({ about: text }, { merge: true }).then(function(){
      b.disabled = false; state.about = text || DEFAULT_ABOUT; lsJSON(CACHE_ABOUT, { t: Date.now(), v: text }); toast("บันทึกข้อความ About แล้ว");
    }).catch(writeFail);
  });
  bindList();
}

/* ---------- data loading ---------- */
var db, adminUnsub = null, adminLive = false;
var cat = { state: "idle", at: 0, count: 0, msg: "", sig: null, parts: 0, metaLoaded: false };

function setPublicItems(items){
  if (adminLive) return;
  state.items = items.filter(function(i){ return !i.hidden; });
  loaded.items = true; onData();
}
function loadItemsFallback(){
  /* used only until the admin has logged in once with this version and built the catalog */
  return db.collection("items").get().then(function(snap){
    var items = snap.docs.map(function(d){ var x = Object.assign({}, d.data(), { id: d.id }); full[d.id] = x; return x; });
    setPublicItems(items);
  });
}
function loadCatalog(force){
  var cached = lsJSON(CACHE_CAT);
  if (cached && cached.items) setPublicItems(cached.items);
  if (!force && cached && Date.now() - (cached.checked || 0) < META_TTL) return;
  db.collection("catalog").doc("meta").get().then(function(m){
    if (!m.exists) return loadItemsFallback();
    var meta = m.data();
    if (cached && cached.rev === meta.rev) { cached.checked = Date.now(); lsJSON(CACHE_CAT, cached); return; }
    var jobs = []; for (var i = 0; i < (meta.parts || 0); i++) jobs.push(db.collection("catalog").doc("p" + i).get());
    return Promise.all(jobs).then(function(snaps){
      var items = []; snaps.forEach(function(s){ if (s.exists) items = items.concat(s.data().items || []); });
      lsJSON(CACHE_CAT, { rev: meta.rev, checked: Date.now(), items: items });
      setPublicItems(items);
    });
  }).catch(function(){
    /* catalog not readable yet (old rules): fall back to reading items directly */
    return loadItemsFallback().catch(function(){
      if (!cached) { setupError = "อ่านข้อมูลไม่ได้ ตรวจกฎ (Rules) ของ Firestore"; render(false); }
    });
  });
}
function loadCounters(force){
  var c = lsJSON(CACHE_CTR);
  if (c && c.data) { state.counters = c.data; state.ctrTime = c.t; loaded.counters = true; }
  if (!force && c && Date.now() - c.t < CTR_TTL) { updateLive(); return; }
  db.collection("counters").get().then(function(snap){
    var data = {}; snap.docs.forEach(function(d){ data[d.id] = d.data(); });
    state.counters = data; state.ctrTime = Date.now(); loaded.counters = true;
    lsJSON(CACHE_CTR, { t: state.ctrTime, data: data });
    updateLive();
  }).catch(function(){ loaded.counters = true; updateLive(); });
}
function loadVisits(){
  var c = lsJSON(CACHE_VIS);
  if (c && typeof c.v === "number") state.visits = c.v;
  if (c && Date.now() - c.t < VIS_TTL) { updateLive(); return; }
  db.collection("stats").doc("site").get().then(function(d){
    state.visits = d.exists ? (d.data().visits || 0) : 0;
    lsJSON(CACHE_VIS, { t: Date.now(), v: state.visits }); updateLive();
  }).catch(function(){ if (state.visits == null) state.visits = 0; updateLive(); });
}
var aboutPending = false;
function loadAbout(){
  if (loaded.about || aboutPending || !db) return;
  var c = lsJSON(CACHE_ABOUT);
  if (c && Date.now() - c.t < ABOUT_TTL) { state.about = c.v || DEFAULT_ABOUT; loaded.about = true; return; }
  aboutPending = true;
  db.collection("settings").doc("site").get().then(function(d){
    var a = d.exists && d.data().about; state.about = a || DEFAULT_ABOUT; loaded.about = true; aboutPending = false;
    lsJSON(CACHE_ABOUT, { t: Date.now(), v: a || "" });
    if (current.route === "about") render(false);
    var ta = $("#f-about"); if (ta && document.activeElement !== ta) ta.value = state.about;
  }).catch(function(){ aboutPending = false; loaded.about = true; });
}

/* ---------- catalog building (admin only) ---------- */
var thumbCache = {};
function makeThumb(src){
  return new Promise(function(res){
    if (!src) return res(null);
    var key = hashStr(src) + ":" + src.length;
    if (thumbCache[key]) return res(thumbCache[key]);
    var img = new Image();
    img.onload = function(){
      var s = Math.min(1, 520 / img.naturalWidth), c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      var x = c.getContext("2d"); x.fillStyle = "#1e1e1e"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      var out = c.toDataURL("image/jpeg", 0.72); thumbCache[key] = out; res(out);
    };
    img.onerror = function(){ res(null); };
    img.src = src;
  });
}
var SUMMARY_KEYS = ["kind","title","created","updated","lang","fileType","fileTypeOther","scriptType","scriptTypeOther","url","ae","pinned"];
function summaryOf(it){
  var s = { id: it.id };
  SUMMARY_KEYS.forEach(function(k){ if (it[k] != null && it[k] !== "" && it[k] !== false) s[k] = it[k]; });
  return s;
}
function catalogSig(list){ return hashStr(JSON.stringify(list.map(summaryOf)) + "|" + list.map(function(i){ return (i.cover || "").length + ":" + hashStr((i.cover || "").slice(-200)); }).join(",")); }
function setCat(st, msg){ cat.state = st; if (msg != null) cat.msg = msg; var el = $("#catStatus"); if (el) el.innerHTML = catStatusHTML(); }
var rebuildT = null, rebuilding = false;
function scheduleRebuild(){ clearTimeout(rebuildT); rebuildT = setTimeout(rebuildCatalog, 900); }
function rebuildCatalog(){
  if (!adminLive || !cat.metaLoaded || !loaded.items || rebuilding) return;
  var vis = state.items.filter(function(i){ return !i.hidden; });
  var sig = String(catalogSig(vis));
  if (sig === cat.sig) { if (cat.state !== "ok" && cat.state !== "err") setCat("ok"); return; }
  rebuilding = true; setCat("busy");
  Promise.all(vis.map(function(i){ return makeThumb(i.cover).then(function(t){ var s = summaryOf(i); if (t) s.thumb = t; return s; }); })).then(function(sums){
    sums.sort(function(a, b){ return (b.created || 0) - (a.created || 0); });
    var parts = [[]], size = 0, LIMIT = 850000;
    sums.forEach(function(s){ var n = JSON.stringify(s).length; if (size + n > LIMIT && parts[parts.length - 1].length) { parts.push([]); size = 0; } parts[parts.length - 1].push(s); size += n; });
    var batch = db.batch(), rev = Date.now();
    parts.forEach(function(p, i){ batch.set(db.collection("catalog").doc("p" + i), { items: p }); });
    for (var j = parts.length; j < (cat.parts || 0); j++) batch.delete(db.collection("catalog").doc("p" + j));
    batch.set(db.collection("catalog").doc("meta"), { rev: rev, parts: parts.length, count: sums.length, sig: sig });
    return batch.commit().then(function(){
      cat.sig = sig; cat.parts = parts.length; cat.at = rev; cat.count = sums.length;
      lsJSON(CACHE_CAT, { rev: rev, checked: Date.now(), items: sums });
      rebuilding = false; setCat("ok", "");
    });
  }).catch(function(ex){
    rebuilding = false;
    var msg = ex && ex.code === "permission-denied" ? "Firebase ยังไม่อนุญาต ต้องวางกฎ (Rules) ชุดใหม่แล้วกด Publish" : "ลองรีเฟรชหน้าแล้วล็อกอินใหม่";
    setCat("err", msg); toast("อัปเดตรายการสาธารณะไม่สำเร็จ: " + msg);
  });
}
function startAdminLive(){
  if (adminUnsub) return;
  adminLive = true; loaded.items = false;
  cat.metaLoaded = false; setCat("idle");
  db.collection("catalog").doc("meta").get().then(function(m){
    var meta = m.exists ? m.data() : {};
    cat.sig = meta.sig || null; cat.parts = meta.parts || 0; cat.at = meta.rev || 0; cat.count = meta.count || 0;
  }).catch(function(){}).then(function(){ cat.metaLoaded = true; scheduleRebuild(); });
  adminUnsub = db.collection("items").onSnapshot(function(snap){
    state.items = snap.docs.map(function(d){ var x = Object.assign({}, d.data(), { id: d.id }); full[d.id] = x; return x; });
    loaded.items = true; onData(); scheduleRebuild();
  }, function(){ toast("อ่านรายการของแจกไม่ได้ ลองรีเฟรชหน้า"); });
  loadAbout(); loadCounters(true);
}
function stopAdminLive(){
  if (adminUnsub) adminUnsub();
  adminUnsub = null; adminLive = false; full = {};
  loadCatalog(true);
}

/* ---------- router ---------- */
function parseHash(){
  var h = (location.hash || "").replace(/^#/, "");
  if (h.indexOf("code-") === 0) return { route: "code", id: h.slice(5) };
  if (h.indexOf("script-") === 0) return { route: "script", id: h.slice(7) };
  if (h.indexOf("preset-") === 0) return { route: "preset", id: h.slice(7) };
  if (h.indexOf("file-") === 0) return { route: "resource", tab: "files", focus: h.slice(5) };
  if (h === "resource-presets") return { route: "resource", tab: "presets" };
  if (h === "resource-scripts") return { route: "resource", tab: "scripts" };
  if (h === "resource-files") return { route: "resource", tab: "files" };
  if (h === "about" || h === "resource" || h === "admin" || h === "home") return { route: h };
  return { route: "home" };
}
var current = parseHash();
function focusCard(){
  if (!current.focus) return;
  var el = document.querySelector('[data-card="' + current.focus + '"]'); if (!el) return;
  current.focus = null;
  setTimeout(function(){
    el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }, 120);
}
function bindView(){
  var r = current.route;
  if (r === "home") {
    var p = $("#pitch");
    if (p && "IntersectionObserver" in window) { var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { p.classList.add("on"); io.disconnect(); } }); }, { threshold: .4 }); io.observe(p); }
    else if (p) p.classList.add("on");
    bindDash(true);
  }
  if (r === "resource") {
    document.querySelectorAll("[data-tab]").forEach(function(b){ b.addEventListener("click", function(){ ui.resTab = b.getAttribute("data-tab"); ui.filter = "all"; ui.q = ""; render(false); }); });
    document.querySelectorAll("[data-f]").forEach(function(b){ b.addEventListener("click", function(){ ui.filter = b.getAttribute("data-f"); render(false); }); });
    var clr = $("#clearQ"); if (clr) clr.addEventListener("click", function(){ ui.q = ""; render(false); var nq = $("#q"); if (nq) nq.focus(); });
    $("#sortSel").addEventListener("change", function(){ ui.sort = this.value; ls("je-sort", ui.sort); render(false); });
    var q = $("#q");
    q.addEventListener("input", function(){ ui.q = q.value; var pos = q.selectionStart; render(false); var nq = $("#q"); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} });
    focusCard();
  }
  if (r === "preset") bindPreset();
  if (r === "script") {
    document.querySelectorAll("[data-pi]").forEach(function(b){ b.addEventListener("click", function(){
      var it = full[current.id]; if (!it || !it.panels) return;
      var img = $("#suiImg"); if (!img) return;
      img.classList.remove("swap"); void img.offsetWidth; img.classList.add("swap");
      img.src = it.panels[+b.getAttribute("data-pi")];
      document.querySelectorAll("[data-pi]").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
    }); });
  }
  if (r === "code") {
    var btn = $("#copyBtn"); if (!btn) return;
    btn.addEventListener("click", function(){
      var it = full[current.id]; if (!it) return;
      function done(){ btn.classList.add("copied"); btn.innerHTML = ICON.check + "<span>คัดลอกแล้ว</span>"; toast("คัดลอกโค้ดแล้ว"); setTimeout(function(){ btn.classList.remove("copied"); btn.innerHTML = ICON.copy + '<span class="glitch-txt">คัดลอกโค้ด</span>'; }, 1800); }
      copyText(it.code || "").then(done, function(){
        var sel = getSelection(), rg = document.createRange(); rg.selectNodeContents($("#codeOut")); sel.removeAllRanges(); sel.addRange(rg);
        toast("เลือกโค้ดให้แล้ว กด Ctrl+C / ⌘+C เพื่อคัดลอก");
      });
    });
  }
  if (r === "admin") bindAdmin();
}
function render(animate){
  if (current.route === "resource" && current.tab) { ui.resTab = current.tab; if (current.focus) { ui.q = ""; ui.filter = "all"; } current.tab = null; }
  ui.route = current.route;
  renderNav();
  var html = current.route === "about" ? viewAbout() : current.route === "resource" ? viewResource() : current.route === "code" ? viewCode(current.id) : current.route === "script" ? viewScript(current.id, "script") : current.route === "preset" ? viewScript(current.id, "preset") : current.route === "admin" ? viewAdmin() : viewHome();
  var v = $("#view");
  v.innerHTML = html;
  if (animate && !reduced()) { v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); }
  bindView();
  onScroll();
}
function go(animate){
  current = parseHash();
  setMenu(false);
  if (animate && !reduced()) {
    var cut = $("#cut"); cut.classList.remove("run"); void cut.offsetWidth; cut.classList.add("run");
    setTimeout(function(){ if (!current.focus) scrollTo(0, 0); render(true); }, 280);
  } else { render(animate); }
}
addEventListener("hashchange", function(){ ui.confirmDel = null; ui.editId = null; ui.cover = null; ui.panels = []; go(true); });

/* data changed: refresh the page without wiping an admin form in progress */
function onData(){
  if (current.route === "admin" && isAdmin()) { refreshList(); return; }
  if (current.route === "code" || isRich(current.route)) { if (!full[current.id]) render(false); return; }
  if (current.route === "resource") { var q = $("#q"), focused = document.activeElement === q, pos = q && q.selectionStart; render(false); if (focused) { var nq = $("#q"); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } return; }
  render(false);
}

render(true);

/* ---------- firebase ---------- */
(function initFirebase(){
  var cfg = window.FIREBASE_CONFIG;
  if (!window.firebase) { setupError = "โหลดระบบ Firebase ไม่ได้ ตรวจการเชื่อมต่ออินเทอร์เน็ต"; render(false); return; }
  if (!cfg || !cfg.apiKey || /ใส่|YOUR_/i.test(cfg.apiKey)) { setupError = "ยังไม่ได้ใส่ค่าตั้งค่า Firebase ในไฟล์ firebase-config.js"; render(false); return; }
  try { firebase.initializeApp(cfg); } catch (e) { setupError = "ค่าตั้งค่า Firebase ไม่ถูกต้อง"; render(false); return; }
  db = firebase.firestore();
  loadCatalog(false);
  loadCounters(false);
  loadVisits();
  countVisit();
  if (current.route === "about") loadAbout();
  if (current.id) render(false);
  var wasAdmin = false;
  firebase.auth().onAuthStateChanged(function(u){
    ui.user = u; ui.authReady = true;
    if (isAdmin()) { wasAdmin = true; startAdminLive(); }
    else if (wasAdmin) { wasAdmin = false; stopAdminLive(); }
    if (current.route === "admin") render(true);
  });
})();
})();
