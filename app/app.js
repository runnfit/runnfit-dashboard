// 런앤핏 회원앱 (1단계)
// - 휴대폰 문자 인증으로 로그인 → 서버(runnfit-member)의 내 회원 정보만 읽는다
// - 회원 정보는 직원 대시보드가 다짐에서 읽어 보내준다 (출석은 바로, 회원권·홀딩은 10분 안에)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, limit, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBbE0ktG6f5t-1xvVEg56f18DE_QdtIrts',
  authDomain: 'runnfit-member.firebaseapp.com',
  projectId: 'runnfit-member',
  storageBucket: 'runnfit-member.firebasestorage.app',
  messagingSenderId: '1029886465637',
  appId: '1:1029886465637:web:36ac86705e3504f6c0588c',
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
auth.languageCode = 'ko';
const db = getFirestore(fbApp);

// ---------- 공통 ----------
const B = '#093692';
const BELTS = [
  { from: 1, name: '흰 띠', bg: '#F4F7FB' }, { from: 10, name: '노란 띠', bg: '#FFD54A' },
  { from: 30, name: '파란 띠', bg: '#093692' }, { from: 50, name: '빨간 띠', bg: '#B91C32' }, { from: 100, name: '검은 띠', bg: '#111827' },
];
const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const esc = (s)=> String(s == null ? '' : s).replace(/[&<>"']/g, (c)=> ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KST = 9 * 3600e3;
const kstDate = (ms)=> new Date(ms + KST).toISOString().slice(0, 10);
const today = ()=> kstDate(Date.now());
const daysBetween = (a, b)=> Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
const addDays = (d, n)=> kstDate(Date.parse(d + 'T12:00:00+09:00') + n * 864e5);
const dotDate = (d)=> d ? d.replace(/-/g, '.') : '-';
const normName = (s)=> String(s || '').replace(/\s+/g, '');
function e164(p){
  const d = String(p || '').replace(/\D/g, '');
  if(/^01\d{8,9}$/.test(d)) return '+82' + d.slice(1);
  if(/^821\d{8,9}$/.test(d)) return '+' + d;
  return null;
}
function beltOf(n){ n = Number(n) || 0; let f = BELTS[0]; BELTS.forEach((b)=>{ if(n >= b.from) f = b; }); return n >= 1 ? f : BELTS[0]; }
function nextBelt(n){ n = Number(n) || 0; return BELTS.find((b)=> b.from > n) || null; }
function beltSvg(fill, w, label){
  return '<svg width="' + w + '" height="' + (w / 2) + '" viewBox="0 0 32 16" shape-rendering="crispEdges" role="img" aria-label="' + esc(label) + '">' +
    '<rect x="0" y="4" width="32" height="8" fill="#111827"/><rect x="1" y="5" width="30" height="6" fill="' + fill + '"/>' +
    '<rect x="12" y="2" width="8" height="12" fill="#111827"/><rect x="13" y="3" width="6" height="10" fill="' + fill + '"/>' +
    '<rect x="11" y="12" width="4" height="4" fill="#111827"/><rect x="17" y="12" width="4" height="4" fill="#111827"/></svg>';
}
const AVATAR = (s)=> '<svg width="' + s + '" height="' + s + '" viewBox="0 0 14 14" shape-rendering="crispEdges" role="img" aria-label="내 픽셀 캐릭터"><rect x="4" y="1" width="6" height="5" fill="#F2C9A0"/><rect x="4" y="1" width="6" height="2" fill="#3B2A1A"/><rect x="5" y="4" width="1" height="1" fill="#111827"/><rect x="8" y="4" width="1" height="1" fill="#111827"/><rect x="3" y="6" width="8" height="4" fill="#093692"/><rect x="3" y="8" width="8" height="1" fill="#F4F7FB"/><rect x="4" y="10" width="2" height="3" fill="#111827"/><rect x="8" y="10" width="2" height="3" fill="#111827"/></svg>';
const CHECK = (c, w = 16)=> '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const BACK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const BELL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>';
const FLAG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>';
const CAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>';
const LOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function toast(t){ const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(()=> el.remove(), 2600); }
function sheet(html){
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '<button class="btn ghost" type="button" data-close style="width:100%;margin-top:16px">닫기</button></div>';
  bg.addEventListener('click', (e)=>{ if(e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}
function topbar(title){
  return '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" data-go="home" aria-label="뒤로">' + BACK + '</button><div class="ttl">' + esc(title) + '</div></div>';
}

// ---------- 상태 ----------
let me = null;          // { id, ...members 문서 }
let tab = 'home';
let notices = [];
let helpOpen = false;
let helpKind = 'guide';   // guide | pt
let helpDone = null;
// 코치 목록 (Firestore config/coaches 문서가 있으면 그걸 씀)
let COACHES = [{ name: '런관장', desc: '런앤핏 대표', photo: './coaches/run.jpg' }, { name: '가온코치', desc: '런앤핏 코치', photo: './coaches/gaon.jpg' }, { name: '하루코치', desc: '런앤핏 코치', photo: './coaches/haru.jpg' }, { name: '로라코치', desc: '런앤핏 코치', photo: './coaches/laura.jpg' }];
const HELP_TIMES = ['평일 오전', '평일 점심', '평일 저녁', '주말', '아무 때나'];
const HELP_KINDS = {
  guide: { title: '1:1 운동가이드 받기', sub: '코치님이 기구 · 자세를 직접 봐드려요', icon: 'coach' },
  pt: { title: 'PT 상담받기', sub: '목표에 맞는 PT를 안내해 드려요', icon: 'chat' },
};
function hIco(kind, fg, bg, size){
  fg = fg || B; bg = bg || '#E3E9FF'; size = size || 30;
  const P = {
    coach: '<circle cx="12" cy="7" r="3.2"/><path d="M5.5 20c.6-3.8 3.2-6 6.5-6s5.9 2.2 6.5 6"/><path d="M3 11h3M18 11h3M4.5 9.5v3M19.5 9.5v3"/>',
    chat: '<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z"/><path d="M8 10.5h8"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.6" r=".6" fill="' + fg + '"/>',
  }[kind];
  const k = Math.round(size * .6);
  return '<span style="width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * .3) + 'px;background:' + bg + ';display:inline-flex;align-items:center;justify-content:center;flex:none"><svg viewBox="0 0 24 24" width="' + k + '" height="' + k + '" fill="none" stroke="' + fg + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P + '</svg></span>';
}
function helpCard(){
  const rows = helpOpen ? Object.keys(HELP_KINDS).map((k)=>{ const h = HELP_KINDS[k];
    return '<button type="button" data-help="' + k + '" style="width:100%;display:flex;align-items:center;gap:9px;background:#fff;color:#0B1B4D;border:0;border-radius:10px;padding:9px 10px;margin-top:6px;text-align:left;cursor:pointer;font-family:inherit">' + hIco(h.icon) +
      '<span style="flex:1"><span style="display:block;font-size:14px;font-weight:900">' + h.title + '</span><span style="display:block;font-size:11.5px;color:#4B5563">' + h.sub + '</span></span><span style="color:' + B + ';font-weight:900">›</span></button>'; }).join('') : '';
  return '<div class="m" style="background:' + B + ';border-radius:12px;padding:10px 12px;color:#fff">' +
    '<button type="button" id="helpToggle" aria-expanded="' + helpOpen + '" style="width:100%;display:flex;align-items:center;gap:8px;background:none;border:0;color:#fff;padding:0;text-align:left;cursor:pointer;font-family:inherit">' + hIco('help', '#fff', 'rgba(255,255,255,.16)', 28) +
      '<span style="flex:1"><span style="display:block;font-size:15px;font-weight:900">도와줘요! 런앤핏!</span><span style="display:block;font-size:11px;opacity:.85;margin-top:1px">비용이 따로 들지 않아요 · 언제든 편하게 신청해주세요!</span></span>' +
      '<span style="font-size:13px;display:inline-block;transform:rotate(' + (helpOpen ? 180 : 0) + 'deg)">▾</span></button>' + rows + '</div>';
}

// ---------- 입장 (문자 인증) ----------
let confirmation = null, verifier = null, timer = null;
function renderLogin(err){
  $tabs.classList.add('hidden'); $app.classList.add('nonav');
  $app.innerHTML =
    '<div style="padding:40px 28px 0;display:flex;flex-direction:column;align-items:center;text-align:center">' +
      '<img class="logo" src="./logo.png" alt="RUN N FIT" style="height:35px">' +
      '<div style="margin-top:22px;line-height:0">' + AVATAR(64) + '</div>' +
      '<div style="font-size:24px;font-weight:900;margin-top:14px">출석만 해도 성공!</div>' +
      '<div style="font-size:15px;color:#374151;margin-top:6px">한 번 한 번의 출석이, 나의 띠가 돼요</div>' +
    '</div>' +
    '<form class="card hero" id="loginForm" style="margin:24px 26px 0;padding:18px;display:flex;flex-direction:column;gap:14px;border-radius:0" autocomplete="on">' +
      '<div style="font-size:14px;font-weight:700;line-height:1.5">센터에 등록한 이름과 휴대폰 번호를 입력해 주세요<span style="display:block;font-size:12px;font-weight:500;color:var(--muted)">처음 한 번만 해요</span></div>' +
      '<div class="field"><label for="fName">이름</label><input id="fName" autocomplete="name" placeholder="홍길동"></div>' +
      '<div class="field"><label for="fPhone">휴대폰 번호</label><div style="display:flex;gap:8px"><input id="fPhone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" style="flex:1;min-width:0"><button class="btn" type="button" id="sendBtn" style="white-space:nowrap;font-size:14px">인증번호 받기</button></div></div>' +
      '<div class="field" id="codeWrap"><label for="fCode">인증번호</label><div style="display:flex;gap:8px;align-items:center"><input id="fCode" inputmode="numeric" autocomplete="one-time-code" placeholder="6자리 숫자" style="flex:1;min-width:0"><span class="pxf" id="timer" style="font-size:10px;color:#B91C32;min-width:52px;text-align:right"></span></div></div>' +
      '<div class="field"><label for="fNick">닉네임</label><input id="fNick" placeholder="예: 달리는민수" maxlength="12"><div class="help">미니런앤핏과 방명록에서 이 이름으로 보여요 · 처음 한 번만 입력하면 돼요</div></div>' +
      '<div class="msg ' + (err ? 'err' : '') + '" id="lMsg">' + esc(err || '') + '</div>' +
    '</form>' +
    '<div style="padding:16px 26px 0"><button class="btn pxbtn" type="button" id="enterBtn" style="width:100%;height:54px;font-size:17px">런앤핏 입장하기</button>' +
      '<div style="font-size:12px;color:var(--muted);text-align:center;margin-top:12px;line-height:1.6">이용 중인 회원권이 있는 회원님을 위한 공간이에요.<br>정보가 맞지 않으면 프론트에 말씀해 주세요.</div>' +
      '<div style="font-size:11px;color:#6B7280;text-align:center;margin-top:10px">이 화면은 reCAPTCHA로 보호되며 Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">개인정보처리방침</a>과 <a href="https://policies.google.com/terms" target="_blank" rel="noopener">서비스 약관</a>이 적용돼요.</div></div>';
  const msg = (t, ok)=>{ const m = document.getElementById('lMsg'); m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = t; };
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.onclick = async ()=>{
    const phone = e164(document.getElementById('fPhone').value);
    const name = document.getElementById('fName').value.trim();
    if(!name){ msg('이름을 입력해 주세요.'); return; }
    if(!phone){ msg('휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)'); return; }
    sendBtn.disabled = true; msg('인증번호를 보내는 중…', true);
    try{
      if(!verifier) verifier = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' });
      confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      msg('인증번호를 보냈어요. 문자로 받은 6자리를 입력해 주세요.', true);
      sessionStorage.setItem('rfName', name);
      let left = 180; clearInterval(timer);
      const t = document.getElementById('timer');
      timer = setInterval(()=>{ left--; if(t) t.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); if(left <= 0){ clearInterval(timer); sendBtn.disabled = false; sendBtn.textContent = '다시 받기'; } }, 1000);
      document.getElementById('fCode').focus();
    }catch(e){
      sendBtn.disabled = false;
      const c = (e && e.code) || '';
      msg(/billing|operation-not-allowed/.test(c) ? '문자 인증이 아직 준비 중이에요. (센터 설정 필요 · ' + c + ' · ' + String((e && e.message) || '').replace(/^Firebase: /, '').slice(0, 120) + ')'
        : /too-many-requests/.test(c) ? '요청이 너무 많아요. 잠시 후 다시 해주세요.'
        : /invalid-phone/.test(c) ? '휴대폰 번호를 확인해 주세요.'
        : '인증번호를 보내지 못했어요. (' + (c || e.message) + ')');
      try{ verifier && verifier.clear(); }catch(_){} verifier = null;
    }
  };
  document.getElementById('enterBtn').onclick = async ()=>{
    const code = document.getElementById('fCode').value.replace(/\D/g, '');
    if(!confirmation){ msg('먼저 인증번호를 받아 주세요.'); return; }
    if(code.length !== 6){ msg('인증번호 6자리를 입력해 주세요.'); return; }
    sessionStorage.setItem('rfNick', document.getElementById('fNick').value.trim());
    sessionStorage.setItem('rfName', document.getElementById('fName').value.trim());
    try{ await confirmation.confirm(code); }
    catch(e){ msg(/invalid-verification-code/.test(e.code || '') ? '인증번호가 맞지 않아요.' : /code-expired/.test(e.code || '') ? '인증번호 시간이 지났어요. 다시 받아 주세요.' : '인증하지 못했어요. (' + (e.code || e.message) + ')'); }
  };
}

// ---------- 로그인 후: 내 회원 정보 찾기 ----------
async function loadMe(user){
  $app.innerHTML = '<div class="loading">회원 정보를 확인하는 중…</div>';
  const snap = await getDocs(query(collection(db, 'members'), where('phone', '==', user.phoneNumber), limit(1)));
  if(snap.empty){ await signOut(auth); renderLogin('이 번호로 등록된 런앤핏 회원을 찾지 못했어요. 프론트에 말씀해 주세요.'); return; }
  const d = snap.docs[0];
  me = Object.assign({ id: d.id }, d.data());
  const typed = sessionStorage.getItem('rfName');
  if(typed && normName(typed) !== normName(me.name)){ me = null; await signOut(auth); renderLogin('센터에 등록된 이름과 달라요. 이름을 다시 확인해 주세요.'); return; }
  const active = (me.gymExp && me.gymExp >= today()) || (me.holdEnd && me.holdEnd >= today());
  if(!active){ const exp = me.gymExp; me = null; await signOut(auth); renderLogin('회원권이 ' + dotDate(exp) + '에 끝났어요. 다시 등록하시면 바로 이어서 쓸 수 있어요.'); return; }
  const nick = sessionStorage.getItem('rfNick');
  const patch = {};
  if(!me.uid || me.uid !== user.uid){ patch.uid = user.uid; }
  if(!me.appJoinedAt){ patch.appJoinedAt = serverTimestamp(); }
  if(nick && !me.nickname){ patch.nickname = nick; }
  if(Object.keys(patch).length){ try{ await updateDoc(doc(db, 'members', me.id), patch); Object.assign(me, patch); }catch(e){ console.warn(e); } }
  sessionStorage.removeItem('rfNick'); sessionStorage.removeItem('rfName');
  try{ if(verifier){ verifier.clear(); verifier = null; } }catch(e){}
  try{
    const ns = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(5)));
    notices = ns.docs.map((x)=> Object.assign({ id: x.id }, x.data()));
  }catch(e){ notices = []; }
  loadCoaches();
  if(!me.nickname){ askNickname(); }
  const hm = /^#help-(guide|pt)$/.exec(location.hash);
  if(hm){ helpKind = hm[1]; history.replaceState(null, '', location.pathname); go('help'); } else go('home');
}
function askNickname(){
  const bg = sheet('<div class="ttl">닉네임을 정해 주세요</div><div class="muted" style="font-size:14px;margin-top:4px">미니런앤핏과 방명록에서 이 이름으로 보여요</div>' +
    '<div class="field" style="margin-top:14px"><label for="nk">닉네임</label><input id="nk" maxlength="12" placeholder="예: 달리는민수"></div><button class="btn" type="button" id="nkSave" style="width:100%;margin-top:12px">저장</button>');
  bg.querySelector('#nkSave').onclick = async ()=>{
    const v = bg.querySelector('#nk').value.trim(); if(!v) return;
    try{ await updateDoc(doc(db, 'members', me.id), { nickname: v }); me.nickname = v; bg.remove(); go(tab); }catch(e){ toast('저장하지 못했어요. 잠시 후 다시 해주세요.'); }
  };
}

// ---------- 화면 전환 ----------
function go(t){
  tab = t;
  if(t === 'pixel'){ location.href = './gym/'; return; }
  $tabs.classList.remove('hidden'); $app.classList.remove('nonav');
  const active = { help: 'home', home: 'home', challenge: 'challenge', workout: 'challenge', voice: 'voice', me: 'me' }[t];
  $tabs.querySelectorAll('button').forEach((b)=> b.classList.toggle('on', b.dataset.tab === active));
  ({ help: renderHelp, home: renderHome, challenge: renderChallenge, workout: renderWorkout, voice: renderVoice, me: renderMe })[t]();
  window.scrollTo(0, 0);
}
$tabs.addEventListener('click', (e)=>{ const b = e.target.closest('button[data-tab]'); if(b) go(b.dataset.tab); });
$app.addEventListener('click', (e)=>{ const a = e.target.closest('[data-go]'); if(a){ e.preventDefault(); go(a.dataset.go); } });

// ---------- 홈 ----------
function first30Info(){
  const start = me.first30Start || me.firstStart;
  if(!start) return null;
  const day = daysBetween(today(), start) + 1;
  if(day < 1 || day > 30) return null;
  const days = Array.isArray(me.first30Days) ? me.first30Days : [];
  const visits = me.first30Visits != null ? me.first30Visits : days.length;
  return { start, day, visits, days, left: 30 - day };
}
function workoutDoneKey(){ return 'rfWorkout.' + me.id + '.' + today(); }
function renderHome(){
  const total = Number(me.total) || 0;
  const none = total < 1;
  const cur = none ? { name: '띠 없음', bg: '#FFFFFF', from: 0 } : beltOf(total), nxt = nextBelt(total);
  const prevFrom = cur.from === 1 ? 0 : cur.from;
  const span = nxt ? nxt.from - prevFrom : 1, got = nxt ? total - prevFrom : 1;
  const segN = 10, on = Math.max(0, Math.min(segN, Math.floor(got / span * segN)));
  const attendedToday = me.lastAttend === today();
  const f30 = first30Info();
  const dday = me.gymExp ? daysBetween(me.gymExp, today()) : null;
  const holding = me.holdEnd && me.holdEnd >= today();
  const done = localStorage.getItem(workoutDoneKey()) === '1';
  const journey = BELTS.map((b)=>{
    const isCur = !none && b.name === cur.name;
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="opacity:' + (isCur ? 1 : .45) + ';' + (isCur ? 'outline:3px solid ' + B + ';outline-offset:3px;' : '') + 'line-height:0">' + beltSvg(b.bg, 38, b.name) + '</div><div style="font-size:12px;font-weight:' + (isCur ? 900 : 500) + '">' + b.name + '</div>' +
      (isCur ? '<div style="font-size:11px;font-weight:900;color:#fff;background:' + B + ';padding:1px 5px">지금</div>' : '<div style="font-size:11px;color:var(--muted)">' + b.from + '회' + (b.from === 1 ? '~' : '') + '</div>') + '</div>';
  }).join('');
  let left;
  if(f30){
    const goal = 12, bar = Array.from({ length: goal }, (_, i)=> '<div class="seg ' + (i < f30.visits ? 'on' : '') + '"></div>').join('');
    left = '<div class="card" style="padding:12px 10px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + FLAG + '첫 30일 출석 도전</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:8px"><span class="pxf" style="font-size:20px">' + f30.visits + '</span><span style="font-size:13px;font-weight:700;color:var(--muted)">/ 12회</span></div>' +
      '<div class="grid12" style="margin-top:8px">' + bar + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">30일 ' + f30.visits + '회 출석<br><b style="color:var(--ink)">' + (f30.visits >= goal ? '도전 성공! 🎉' : '목표까지 ' + (goal - f30.visits) + '회') + '</b></div></div>';
  } else {
    const mk = today().slice(0, 7), n = me.monthKey === mk ? (Number(me.monthCount) || 0) : 0, goal = Number(me.monthlyGoal) || 8;
    const bar = Array.from({ length: goal }, (_, i)=> '<div class="seg ' + (i < n ? 'on' : '') + '"></div>').join('');
    left = '<div class="card" style="padding:12px 10px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + FLAG + '이번 달 출석</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:8px"><span class="pxf" style="font-size:20px">' + n + '</span><span style="font-size:13px;font-weight:700;color:var(--muted)">/ ' + goal + '회</span></div>' +
      '<div style="display:grid;grid-template-columns:repeat(' + goal + ',minmax(0,1fr));gap:2px;margin-top:8px">' + bar + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">내가 정한 목표 월 ' + goal + '회<br><a href="#" id="goalBtn" style="font-weight:700">목표 바꾸기</a></div></div>';
  }
  const right = '<div class="card" style="padding:12px 10px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + CAL + '회원권</div>' +
    '<div class="pxf" style="font-size:20px;color:' + B + ';margin-top:10px">' + (dday == null ? '-' : dday >= 0 ? 'D-' + dday : '만료') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:12px">' + (holding ? '홀딩 중 · ' + dotDate(me.holdEnd).slice(5) + '까지' : dotDate(me.gymExp) + '까지') + '</div></div>';
  $app.innerHTML =
    '<div class="top"><img class="logo" src="./logo.png" alt="RUN N FIT"><button class="iconbtn" type="button" id="bellBtn" aria-label="공지">' + BELL + (notices.length ? '<span class="dot"></span>' : '') + '</button></div>' +
    '<div style="padding:12px 24px 0;display:flex;gap:12px;align-items:center">' + AVATAR(44) +
      '<div><div style="font-size:13px;color:var(--muted);font-weight:500">' + (f30 ? '등록 ' + f30.day + '일째 · ' : '') + (none ? '첫 출석을 기다려요' : cur.name) + '</div><div style="font-size:20px;font-weight:900;margin-top:1px">' + esc(me.nickname || me.name) + '님, 반가워요!</div></div></div>' +
    (attendedToday
      ? '<div class="m" style="background:#E3E9FF;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px"><div style="width:26px;height:26px;background:' + B + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + CHECK('#fff') + '</div><div style="font-size:14px"><b style="color:' + B + '">오늘 출석 완료</b> · 오늘도 와주셨네요!</div></div>'
      : '<div class="m" style="background:#fff;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;box-shadow:inset 0 0 0 2px var(--line)"><div style="width:26px;height:26px;box-shadow:inset 0 0 0 2px #9CA3AF;flex-shrink:0"></div><div style="font-size:14px;color:#374151"><b>오늘은 아직 출석 전</b> · 센터에서 출석하면 바로 표시돼요</div></div>') +
    helpCard() +
    '<div class="hero m" style="padding:14px 16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:13px;font-weight:700;color:var(--muted)">출석 띠</div><div style="font-size:13px;color:var(--muted)">총 <b style="color:var(--ink)">' + total + '회</b> 출석</div></div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-top:8px">' + beltSvg(cur.bg, 56, cur.name) +
        '<div style="font-size:19px;font-weight:900;line-height:1.35">' + (none ? '<span style="color:' + B + '">첫 출석</span>하면<br>흰 띠를 받아요!' : nxt ? '<span style="color:' + B + '">' + (nxt.from - total) + '번 더</span> 출석하면<br>' + nxt.name + '예요!' : '최고 단계<br>검은 띠예요! 🎉') + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px"><div class="grid10" style="flex:1" role="img" aria-label="다음 띠까지 진행">' + Array.from({ length: segN }, (_, i)=> '<div class="seg ' + (i < on ? 'on' : '') + '" style="height:6px"></div>').join('') + '</div><div class="pxf" style="font-size:7px;color:#6B7280">EXP ' + (nxt ? got + '/' + span : 'MAX') + '</div></div>' +
      '<div style="height:1px;background:#E5E7EB;margin:12px -16px 10px"></div>' +
      '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px">' + journey + '</div>' +
    '</div>' +
    '<div class="m" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">' + left + right + '</div>' +
    '<div style="height:18px"></div>';
  document.getElementById('bellBtn').onclick = showNotices;
  document.getElementById('helpToggle').onclick = ()=>{ helpOpen = !helpOpen; const y = window.scrollY; renderHome(); window.scrollTo(0, y); };
  $app.querySelectorAll('[data-help]').forEach((b)=> b.onclick = ()=>{ helpKind = b.dataset.help; go('help'); });
  const gb = document.getElementById('goalBtn'); if(gb) gb.onclick = (e)=>{ e.preventDefault(); changeGoal(); };
}
function showNotices(){
  sheet('<div class="ttl">공지</div>' + (notices.length ? notices.map((n)=> '<div style="padding:12px 0;border-top:1px solid #E5E7EB"><div style="font-weight:900">' + esc(n.title || '') + '</div><div class="muted" style="font-size:12px;margin-top:2px">' + (n.createdAt && n.createdAt.toDate ? dotDate(kstDate(n.createdAt.toDate().getTime())) : '') + '</div><div style="font-size:14px;margin-top:6px;white-space:pre-line">' + esc(n.body || '') + '</div></div>').join('') : '<div class="muted" style="margin-top:12px">아직 공지가 없어요.</div>'));
}
function coach(){ sheet('<div class="ttl">코치에게 물어보기</div><div style="font-size:15px;margin-top:10px;line-height:1.6">앱에서 바로 묻는 기능은 곧 열려요!<br>지금은 운동하다 궁금한 점이 있으면 <b>트레이너나 프론트</b>에 편하게 물어봐 주세요. 런앤핏이 함께할게요 💙</div>'); }
function changeGoal(){
  const opts = [4, 8, 12, 16, 20];
  const bg = sheet('<div class="ttl">이번 달 출석 목표</div><div class="muted" style="font-size:14px;margin-top:4px">한 달에 몇 번 오고 싶으세요?</div><div class="chips" style="margin-top:14px">' + opts.map((n)=> '<button type="button" data-n="' + n + '" class="' + ((Number(me.monthlyGoal) || 8) === n ? 'on' : '') + '">월 ' + n + '회</button>').join('') + '</div>');
  bg.querySelectorAll('[data-n]').forEach((b)=> b.onclick = async ()=>{ const n = Number(b.dataset.n); try{ await updateDoc(doc(db, 'members', me.id), { monthlyGoal: n }); me.monthlyGoal = n; bg.remove(); renderHome(); toast('목표를 월 ' + n + '회로 정했어요!'); }catch(e){ toast('저장하지 못했어요.'); } });
}

// ---------- 오늘의 운동 ----------
const DEFAULT_WORKOUT = { title: '러닝머신 20분 + 스쿼트 3세트', note: '흰 띠 회원님을 위한 기본 루틴 · 약 35분', items: [
  { name: '러닝머신', spec: '20분', steps: ['속도 5~6km/h로 5분 가볍게 걸어요', '숨이 조금 찰 정도(대화는 가능)로 12분 유지해요', '마지막 3분은 천천히 걸으며 정리해요'], rest: '없음' },
  { name: '스쿼트', spec: '15회 × 3세트', steps: ['발은 어깨너비, 발끝은 살짝 바깥으로', '의자에 앉듯 엉덩이를 뒤로 빼며 내려가요', '무릎이 발끝 방향을 따라가게 해요'], rest: '세트 사이 60초' },
] };
let workoutCache = null;
function weekKey(d){ const t = new Date(d + 'T12:00:00+09:00'); const dow = (t.getUTCDay() + 6) % 7; return addDays(d, -dow); }   // 그 주 월요일
async function loadWorkout(){
  if(workoutCache && workoutCache.date === today()) return workoutCache.w;
  let w = DEFAULT_WORKOUT;
  try{
    const s = await getDoc(doc(db, 'workouts', weekKey(today())));
    if(s.exists()){ const d = s.data(); const k = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][(new Date(today() + 'T12:00:00+09:00').getUTCDay() + 6) % 7]; if(d[k] && d[k].title) w = d[k]; }
  }catch(e){}
  workoutCache = { date: today(), w };
  return w;
}
async function renderWorkout(){
  $app.innerHTML = topbar('런앤핏 오늘의 운동') + '<div class="loading">불러오는 중…</div>';
  const w = await loadWorkout();
  const done = localStorage.getItem(workoutDoneKey()) === '1';
  $app.innerHTML = topbar('런앤핏 오늘의 운동') +
    '<div style="margin:4px 26px 0;font-size:14px;color:var(--muted)">' + esc(w.note || '') + '</div>' +
    (w.items || []).map((it)=> '<div class="card m" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div style="font-size:17px;font-weight:900">' + esc(it.name) + '</div><div style="font-size:13px;font-weight:700;color:' + B + '">' + esc(it.spec || '') + '</div></div>' +
      '<div style="margin-top:6px">' + (it.steps || []).map((t, i)=> '<div style="display:flex;gap:10px;padding:6px 0"><div class="pxf" style="font-size:10px;color:' + B + ';width:16px;padding-top:4px">' + (i + 1) + '</div><div style="font-size:14px;line-height:1.55">' + esc(t) + '</div></div>').join('') + '</div>' +
      (it.rest ? '<div style="margin-top:6px;font-size:13px;background:var(--bg);padding:8px 10px">쉬는 시간 <b>' + esc(it.rest) + '</b></div>' : '') + '</div>').join('') +
    '<div style="padding:16px 26px 0;display:flex;gap:10px">' +
      (done ? '<button class="btn" disabled style="flex:1">완료했어요 ✓</button>' : '<button class="btn" id="wDone" type="button" style="flex:1">운동 완료하기</button>') +
      '<button class="btn ghost" id="wCoach" type="button">코치에게 물어보기</button></div>' +
    '<div style="margin:10px 26px 0;font-size:12px;color:var(--muted);text-align:center">통증이 느껴지면 바로 멈추고 트레이너에게 말씀해 주세요</div>';
  const b = document.getElementById('wDone'); if(b) b.onclick = ()=>{ localStorage.setItem(workoutDoneKey(), '1'); toast('멋져요! 오늘의 운동 완료 💪 런앤핏이 응원할게요!'); go('home'); };
  document.getElementById('wCoach').onclick = coach;
}

// ---------- 첫 30일 출석 도전 / 이번 달 ----------
function renderChallenge(){
  const f30 = first30Info();
  if(!f30){
    const mk = today().slice(0, 7), n = me.monthKey === mk ? (Number(me.monthCount) || 0) : 0, goal = Number(me.monthlyGoal) || 8;
    const days = new Set(Array.isArray(me.recentDays) ? me.recentDays : []);
    const first = mk + '-01', last = kstDate(Date.parse(addDays(first, 32) .slice(0, 7) + '-01T12:00:00+09:00') - 864e5);
    const total = daysBetween(last, first) + 1, lead = (new Date(first + 'T12:00:00+09:00').getUTCDay() + 6) % 7;
    const cells = Array.from({ length: lead }, ()=> '<div></div>').concat(Array.from({ length: total }, (_, i)=>{
      const d = addDays(first, i), on = days.has(d), isT = d === today();
      const st = on ? 'background:' + B + ';color:#fff' : isT ? 'background:#fff;color:' + B + ';box-shadow:inset 0 0 0 3px ' + B : d < today() ? 'background:#E9EEF6;color:#6B7280' : 'background:#fff;color:#9CA3AF;box-shadow:inset 0 0 0 1px var(--line)';
      return '<div style="height:38px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:' + (on || isT ? 900 : 500) + ';' + st + '">' + (on ? CHECK('#FFD54A', 14) : isT ? '오늘' : (i + 1)) + '</div>';
    })).join('');
    $app.innerHTML = topbar('이번 달 출석') +
      '<div class="hero m" style="padding:16px;text-align:center"><div style="font-size:13px;color:var(--muted)">' + Number(mk.slice(5)) + '월 · 내가 정한 목표 월 ' + goal + '회</div>' +
        '<div style="display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:8px"><span class="pxf" style="font-size:30px;color:' + B + '">' + n + '</span><span style="font-size:16px;font-weight:700;color:var(--muted)">/ ' + goal + '회 출석</span></div>' +
        '<div style="display:inline-block;margin-top:10px" class="chip">' + (n >= goal ? '이번 달 목표 달성! 🎉' : (goal - n) + '번 더 출석하면 목표 달성!') + '</div></div>' +
      '<div class="card m" style="padding:12px"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-size:14px;font-weight:900">' + Number(mk.slice(5)) + '월 출석 도장</div><div style="font-size:12px;color:var(--muted)">파란 칸 = 출석</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;font-size:11px;color:var(--muted);text-align:center;margin-bottom:4px">' + ['월', '화', '수', '목', '금', '토', '일'].map((x)=> '<div>' + x + '</div>').join('') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">' + cells + '</div></div>';
    return;
  }
  const set = new Set(f30.days);
  const cells = Array.from({ length: 30 }, (_, i)=>{
    const d = addDays(f30.start, i), on = set.has(d), isT = d === today();
    const st = on ? 'background:' + B + ';color:#fff' : isT ? 'background:#fff;color:' + B + ';box-shadow:inset 0 0 0 3px ' + B : d < today() ? 'background:#E9EEF6;color:#6B7280' : 'background:#fff;color:#9CA3AF;box-shadow:inset 0 0 0 1px var(--line)';
    return '<div style="height:38px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:' + (on || isT ? 900 : 500) + ';' + st + '" aria-label="' + (i + 1) + '일차">' + (on ? CHECK('#FFD54A', 14) : isT ? '오늘' : (i + 1)) + '</div>';
  }).join('');
  const reward = (n, title)=>{ const done = f30.visits >= n; return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">' + (done ? '<div style="width:28px;height:28px;background:' + B + ';display:flex;align-items:center;justify-content:center">' + CHECK('#FFD54A') + '</div>' : '<div style="width:28px;height:28px;box-shadow:inset 0 0 0 2px var(--line)"></div>') + '<div class="pxf" style="font-size:10px;color:' + B + ';width:34px">' + n + '회</div><div style="flex:1;font-size:14px;font-weight:' + (done ? 500 : 700) + '">' + title + '</div><div style="font-size:12px;color:var(--muted)">' + (done ? '획득!' : (n - f30.visits) + '회 남음') + '</div></div>'; };
  const bar = Array.from({ length: 12 }, (_, i)=> '<div class="seg ' + (i < f30.visits ? 'on' : '') + '" style="height:10px"></div>').join('');
  $app.innerHTML = topbar('첫 30일 출석 도전') +
    '<div class="hero m" style="padding:16px 16px 14px;text-align:center">' +
      '<div style="font-size:13px;color:var(--muted);font-weight:500">등록 ' + f30.day + '일째 · ' + f30.left + '일 남았어요</div>' +
      '<div style="font-size:14px;font-weight:700;margin-top:4px">첫 달 12번, 함께 꾸준함을 만들어봐요</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:8px"><span class="pxf" style="font-size:30px;color:' + B + '">' + f30.visits + '</span><span style="font-size:16px;font-weight:700;color:var(--muted)">/ 12회 출석</span></div>' +
      '<div class="grid12" style="gap:3px;margin-top:12px">' + bar + '</div>' +
      '<div class="chip" style="margin-top:10px;font-size:13px;padding:3px 8px">' + (f30.visits >= 12 ? '도전 성공! 런앤핏이 함께 축하할게요 🎉' : (12 - f30.visits) + '번만 더 출석하면 성공!') + '</div></div>' +
    '<div class="card m" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:14px;font-weight:900">30일 출석 도장</div><div style="font-size:12px;color:var(--muted)">파란 칸 = 출석</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px">' + cells + '</div></div>' +
    '<div class="card m" style="padding:6px 14px">' + reward(6, '첫 도장 뱃지') + reward(12, '도전 성공 · [센터 보상]') + reward(16, '출석왕 · [센터 보상]') + '</div>' +
    '<div style="height:18px"></div>';
}

// ---------- 런앤핏에 한마디 ----------
const VTYPES = [['praise', '칭찬해요', '어떤 점이 좋으셨어요?', '예: 트레이너님 덕분에 운동이 즐거워졌어요'], ['issue', '불편해요', '어떤 점이 불편하셨어요?', '예: 3번 러닝머신에서 소리가 나요'], ['idea', '제안해요', '어떤 점이 있으면 좋을까요?', '예: 주말 아침 러닝 크루가 있으면 좋겠어요']];
const VCATS = ['기구', '청결', '직원', '수업', '기타'];
let vType = 'praise', vCat = '직원';
async function renderVoice(){
  const t = VTYPES.find((x)=> x[0] === vType);
  $app.innerHTML = topbar('런앤핏에 한마디') +
    '<div class="card m tabseg">' + VTYPES.map((x)=> '<button type="button" data-vt="' + x[0] + '" class="' + (x[0] === vType ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="m chips">' + VCATS.map((c)=> '<button type="button" data-vc="' + c + '" class="' + (c === vCat ? 'on' : '') + '">' + c + '</button>').join('') + '</div>' +
    '<div class="card m field" style="padding:14px"><label for="vText">' + t[2] + '</label><textarea id="vText" maxlength="1000" placeholder="' + t[3] + '"></textarea></div>' +
    '<div class="hero m" style="padding:12px 14px;display:flex;gap:10px;align-items:flex-start;color:' + B + '"><div style="margin-top:2px">' + LOCK + '</div><div style="font-size:13px;line-height:1.55;color:var(--ink)"><b style="color:' + B + '">트레이너·직원에게는 익명으로 전달돼요.</b><br>작은 이야기도 소중하게 듣고, 더 나은 런앤핏으로 답할게요.</div></div>' +
    '<div class="m"><button class="btn" id="vSend" type="button" style="width:100%;height:52px;font-size:16px">익명으로 보내기</button><div class="msg" id="vMsg"></div></div>' +
    '<div class="card m" style="padding:8px 14px 6px"><div style="font-size:13px;font-weight:900;padding:4px 0 8px">내가 보낸 이야기</div><div id="vList"><div class="muted" style="font-size:13px;padding:6px 0 10px">불러오는 중…</div></div></div>' +
    '<div style="height:18px"></div>';
  $app.querySelectorAll('[data-vt]').forEach((b)=> b.onclick = ()=>{ vType = b.dataset.vt; vCat = vType === 'praise' ? '직원' : '기구'; renderVoice(); });
  $app.querySelectorAll('[data-vc]').forEach((b)=> b.onclick = ()=>{ vCat = b.dataset.vc; $app.querySelectorAll('[data-vc]').forEach((x)=> x.classList.toggle('on', x === b)); });
  document.getElementById('vSend').onclick = sendVoice;
  loadMyVoices();
}
async function sendVoice(){
  const text = document.getElementById('vText').value.trim();
  const msg = document.getElementById('vMsg'), btn = document.getElementById('vSend');
  if(text.length < 2){ msg.className = 'msg err'; msg.textContent = '내용을 조금만 더 적어 주세요.'; return; }
  btn.disabled = true;
  try{
    const ref = doc(collection(db, 'voices'));
    await setDoc(ref, { type: vType, category: vCat, text, photoUrl: null, status: 'new', createdAt: serverTimestamp() });
    await setDoc(doc(db, 'voices_private', ref.id), { uid: auth.currentUser.uid, memberId: me.id, name: me.name, createdAt: serverTimestamp() });
    document.getElementById('vText').value = '';
    msg.className = 'msg ok'; msg.textContent = vType === 'praise' ? '따뜻한 한마디 고마워요! 런앤핏이 꼭 전할게요 💙' : '소중한 이야기 고마워요. 확인하고 답할게요.';
    loadMyVoices();
  }catch(e){ msg.className = 'msg err'; msg.textContent = '보내지 못했어요. 잠시 후 다시 해주세요.'; }
  finally{ btn.disabled = false; }
}
async function loadMyVoices(){
  const box = document.getElementById('vList'); if(!box) return;
  try{
    const ps = await getDocs(query(collection(db, 'voices_private'), where('uid', '==', auth.currentUser.uid), limit(20)));
    const rows = [];
    for(const p of ps.docs){ try{ const v = await getDoc(doc(db, 'voices', p.id)); if(v.exists()) rows.push(Object.assign({ id: v.id }, v.data())); }catch(e){} }
    rows.sort((a, b)=> ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    const label = { praise: '칭찬', issue: '불편', idea: '제안' };
    box.innerHTML = rows.length ? rows.map((v)=>{
      const doneV = v.status === 'answered' || v.reply;
      return '<div style="padding:10px 0;border-top:1px solid #E5E7EB"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:12px;color:var(--muted);width:44px">' + (label[v.type] || '') + '</div><div style="flex:1;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.text) + '</div><div style="font-size:12px;font-weight:700;padding:2px 8px;' + (doneV ? 'background:' + B + ';color:#fff' : 'background:#FFF4CC;color:#111827') + '">' + (doneV ? '답변 완료' : '확인 중') + '</div></div>' +
        (v.reply ? '<div style="margin:8px 0 0 54px;font-size:13px;background:var(--bg);padding:8px 10px;line-height:1.5"><b style="color:' + B + '">런앤핏</b> ' + esc(v.reply) + '</div>' : '') + '</div>';
    }).join('') : '<div class="muted" style="font-size:13px;padding:6px 0 10px">아직 보낸 이야기가 없어요.</div>';
  }catch(e){ box.innerHTML = '<div class="muted" style="font-size:13px;padding:6px 0 10px">불러오지 못했어요.</div>'; }
}

// ---------- 도와줘요! 런앤핏! ----------
let hPick = 'want', hCoach = null, hTimes = [];
async function loadCoaches(){
  try{ const c = await getDoc(doc(db, 'config', 'coaches')); const l = c.exists() && c.data().list; if(Array.isArray(l) && l.length) COACHES = l; }catch(e){}
}
function renderHelp(){
  if(helpDone){ return renderHelpDone(); }
  const h = HELP_KINDS[helpKind], guide = helpKind === 'guide';
  const coachRows = COACHES.map((c, i)=>{ const on = hCoach === c.name;
    return '<button type="button" data-coach="' + esc(c.name) + '" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 ' + (on ? '2.5px ' + B : '1.5px #D5DCE8') + ';margin-top:6px;text-align:left;cursor:pointer;font-family:inherit">' + (c.photo ? '<img src="' + esc(c.photo) + '" alt="" width="44" height="44" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex:none;background:' + B + '">' : AVATAR(34)) +
      '<span style="flex:1"><span style="display:block;font-size:14.5px;font-weight:900;color:#111827">' + esc(c.name) + '</span><span style="display:block;font-size:12px;color:#4B5563">' + esc(c.desc || '') + '</span></span>' +
      '<span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 ' + (on ? '7px ' + B : '2px #9CA3AF') + '"></span></button>'; }).join('');
  const seg = (v, t)=> '<button type="button" data-pick="' + v + '" style="flex:1;height:40px;border:0;border-radius:10px;font-family:inherit;font-size:13.5px;cursor:pointer;' + (hPick === v ? 'background:' + B + ';color:#fff;font-weight:900' : 'background:#fff;color:#111827;font-weight:700;box-shadow:inset 0 0 0 1.5px #D5DCE8') + '">' + t + '</button>';
  const chips = HELP_TIMES.map((t)=>{ const on = hTimes.includes(t);
    return '<button type="button" data-time="' + t + '" style="height:36px;padding:0 13px;border:0;border-radius:999px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;' + (on ? 'background:' + B + ';color:#fff' : 'background:#fff;color:#111827;box-shadow:inset 0 0 0 1.5px #D5DCE8') + '">' + (on ? '✓ ' : '') + t + '</button>'; }).join('');
  const typed = (document.getElementById('hText') || {}).value || '';
  $app.innerHTML = topbar(h.title) +
    '<div style="margin:2px 24px 0;font-size:13px;color:#4B5563">' + (guide ? '코치님이 기구 사용법과 자세를 1:1로 봐드려요 · 비용 없음' : '목표를 듣고 맞는 PT를 안내해 드려요 · 비용 없음') + '</div>' +
    '<div style="margin:16px 24px 0;font-size:14px;font-weight:900">어떤 코치님께 받을까요?</div>' +
    '<div style="margin:8px 24px 0;display:flex;gap:6px">' + seg('want', '원하는 선생님이 있어요') + seg('rec', '런관장님이 추천해주세요') + '</div>' +
    (hPick === 'want' ? '<div style="margin:2px 24px 0">' + coachRows + '</div>' : '<div style="margin:8px 24px 0;font-size:13px;color:#374151;background:#E3E9FF;border-radius:10px;padding:10px 12px">런관장님이 하고 싶은 말을 보고 딱 맞는 코치님을 연결해 드려요</div>') +
    '<div style="margin:16px 24px 0;font-size:14px;font-weight:900">편한 시간 <span style="font-weight:500;color:#6B7280;font-size:12px">(여러 개 선택 가능)</span></div>' +
    '<div style="margin:8px 24px 0;display:flex;gap:6px;flex-wrap:wrap">' + chips + '</div>' +
    '<div style="margin:16px 24px 0;font-size:14px;font-weight:900">하고 싶은 말 <span style="font-weight:500;color:#6B7280;font-size:12px">(선택)</span></div>' +
    '<div style="margin:8px 24px 0"><textarea id="hText" maxlength="300" placeholder="' + (guide ? '예: 스쿼트할 때 무릎이 아파요. 하체 기구 사용법도 알려주세요!' : '예: 3개월 안에 5kg 빼고 싶어요. 허리가 조금 안 좋아요.') + '" style="width:100%;min-height:84px;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 2px #C7D3EE;padding:12px;font-size:15px;line-height:1.5;font-family:inherit;resize:vertical;box-sizing:border-box">' + esc(typed) + '</textarea></div>' +
    '<div style="margin:16px 24px 0"><button class="btn" type="button" id="hSend" style="width:100%;height:54px;font-size:16px">보내기</button><div class="msg" id="hMsg"></div></div>' +
    '<div style="margin:6px 24px 0;text-align:center;font-size:12px;color:#6B7280">보내면 런앤핏에서 확인하고 연락드려요</div>' +
    '<div style="height:18px"></div>';
  $app.querySelectorAll('[data-pick]').forEach((b)=> b.onclick = ()=>{ hPick = b.dataset.pick; renderHelp(); });
  $app.querySelectorAll('[data-coach]').forEach((b)=> b.onclick = ()=>{ hCoach = b.dataset.coach; renderHelp(); });
  $app.querySelectorAll('[data-time]').forEach((b)=> b.onclick = ()=>{ const t = b.dataset.time; hTimes = hTimes.includes(t) ? hTimes.filter((x)=> x !== t) : hTimes.concat(t); renderHelp(); });
  document.getElementById('hSend').onclick = sendHelp;
}
async function sendHelp(){
  const msg = document.getElementById('hMsg'), btn = document.getElementById('hSend');
  const text = document.getElementById('hText').value.trim();
  if(hPick === 'want' && !hCoach){ msg.className = 'msg err'; msg.textContent = '원하는 코치님을 골라 주세요.'; return; }
  if(!hTimes.length){ msg.className = 'msg err'; msg.textContent = '편한 시간을 하나 이상 골라 주세요.'; return; }
  btn.disabled = true;
  try{
    const coach = hPick === 'want' ? hCoach : null;
    await setDoc(doc(collection(db, 'help_requests')), {
      uid: auth.currentUser.uid, memberId: me.id, name: me.name || '', nickname: me.nickname || '', phone: auth.currentUser.phoneNumber || '',
      kind: helpKind, pick: hPick, coach, times: hTimes, text, status: 'new', createdAt: serverTimestamp(),
    });
    helpDone = { coach };
    hCoach = null; hTimes = []; hPick = 'want';
    renderHelp();
  }catch(e){ console.warn(e); msg.className = 'msg err'; msg.textContent = '보내지 못했어요. 잠시 후 다시 해주세요.'; btn.disabled = false; }
}
function renderHelpDone(){
  const c = helpDone.coach;
  $app.innerHTML = topbar('도움 요청') +
    '<div class="card m" style="padding:22px 16px;text-align:center">' +
      '<span style="width:56px;height:56px;border-radius:18px;background:' + B + ';display:inline-flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
      '<div style="font-size:19px;font-weight:900;margin-top:10px">신청이 잘 도착했어요!</div>' +
      '<div style="font-size:14px;color:#4B5563;margin-top:6px;line-height:1.6">' + (c ? esc(c) + '님께 전달했어요' : '런관장님이 딱 맞는 코치님을 연결해 드릴게요') + '<br>런앤핏이 하루 안에 연락드릴게요</div></div>' +
    '<div class="m" style="font-size:14px;font-weight:900">내 신청</div><div id="hList"><div class="m muted" style="font-size:13px">불러오는 중…</div></div>' +
    '<div class="m"><button class="btn" type="button" id="hHome" style="width:100%;height:50px">홈으로</button></div><div style="height:18px"></div>';
  document.getElementById('hHome').onclick = ()=>{ helpDone = null; helpOpen = false; go('home'); };
  loadMyHelp();
}
async function loadMyHelp(){
  const box = document.getElementById('hList'); if(!box) return;
  try{
    const ps = await getDocs(query(collection(db, 'help_requests'), where('uid', '==', auth.currentUser.uid), limit(20)));
    const rows = ps.docs.map((x)=> x.data()).sort((a, b)=> ((b.createdAt && b.createdAt.seconds) || 9e9) - ((a.createdAt && a.createdAt.seconds) || 9e9));
    box.innerHTML = rows.length ? rows.map((r)=>{ const h = HELP_KINDS[r.kind] || HELP_KINDS.guide, doneH = r.status === 'done';
      const when = r.createdAt && r.createdAt.seconds ? kstDate(r.createdAt.seconds * 1000).slice(5).replace('-', '.') : '방금';
      return '<div class="card m" style="padding:12px 14px;display:flex;align-items:center;gap:10px;margin-top:8px">' + hIco(h.icon, B, '#E3E9FF', 34) +
        '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:900">' + h.title + '</div><div style="font-size:12px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.coach || '런관장 추천') + ' · ' + esc((r.times || []).join(', ')) + ' · ' + when + '</div></div>' +
        '<span style="font-size:12px;font-weight:900;border-radius:6px;padding:3px 8px;' + (doneH ? 'background:' + B + ';color:#fff' : 'background:#E3E9FF;color:' + B) + '">' + (doneH ? '연락 완료' : '확인 중') + '</span></div>'; }).join('')
      : '<div class="m muted" style="font-size:13px">아직 신청한 내역이 없어요.</div>';
  }catch(e){ box.innerHTML = '<div class="m muted" style="font-size:13px">불러오지 못했어요.</div>'; }
}

// ---------- 내 정보 ----------
function renderMe(){
  $app.innerHTML = topbar('내 정보') +
    '<div class="card m" style="padding:16px;display:flex;gap:14px;align-items:center">' + AVATAR(52) + '<div><div style="font-size:18px;font-weight:900">' + esc(me.nickname || '-') + '</div><div class="muted" style="font-size:13px">' + esc(me.name) + ' · ' + ((Number(me.total) || 0) < 1 ? '띠 없음' : beltOf(me.total).name) + ' · 총 ' + (Number(me.total) || 0) + '회 출석</div></div></div>' +
    '<div class="card m" style="padding:6px 16px">' +
      '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #E5E7EB"><span class="muted">회원권</span><b>' + dotDate(me.gymExp) + '까지</b></div>' +
      (me.holdEnd && me.holdEnd >= today() ? '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #E5E7EB"><span class="muted">홀딩</span><b>' + dotDate(me.holdEnd) + '까지</b></div>' : '') +
      '<div style="display:flex;justify-content:space-between;padding:12px 0"><span class="muted">마지막 출석</span><b>' + dotDate(me.lastAttend) + '</b></div></div>' +
    '<div class="m" style="display:flex;flex-direction:column;gap:10px"><button class="btn ghost" id="nickBtn" type="button">닉네임 바꾸기</button><button class="btn ghost" id="outBtn" type="button" style="color:#B91C32;box-shadow:inset 0 0 0 2px #F3C2CA">로그아웃</button></div>' +
    '<div class="m muted" style="font-size:12px;text-align:center;line-height:1.6">수업 예약은 다짐 앱에서 할 수 있어요.<br>회원 정보는 센터에 등록된 정보로 자동 반영돼요.</div>';
  document.getElementById('nickBtn').onclick = askNickname;
  document.getElementById('outBtn').onclick = async ()=>{ await signOut(auth); };
}

// ---------- 시작 ----------
onAuthStateChanged(auth, (user)=>{
  if(user && user.phoneNumber){ loadMe(user).catch((e)=>{ console.error(e); renderLogin('회원 정보를 불러오지 못했어요. 잠시 후 다시 해주세요.'); }); }
  else { me = null; renderLogin(); }
});
