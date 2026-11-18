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
const B = '#153189';
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
    const ns = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(20)));
    notices = ns.docs.map((x)=> Object.assign({ id: x.id }, x.data())).filter((n)=> !n.hidden);
  }catch(e){ notices = []; }
  loadCoaches();
  if(!me.nickname){ askNickname(); }
  const hm = /^#help-(guide|pt)$/.exec(location.hash);
  if(hm){ helpKind = hm[1]; history.replaceState(null, '', location.pathname); go('help'); } else go('home');
  autoNotice();
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
  const active = { master: 'home', wod: 'home', session: 'home', done: 'home', help: 'home', home: 'home', challenge: 'challenge', workout: 'challenge', voice: 'voice', me: 'me' }[t];
  $tabs.querySelectorAll('button').forEach((b)=> b.classList.toggle('on', b.dataset.tab === active));
  ({ master: renderMaster, wod: renderWod, session: renderSession, done: renderDone, help: renderHelp, home: renderHome, challenge: renderChallenge, workout: renderWorkout, voice: renderVoice, me: renderMe })[t]();
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
    const w = weekInfo(), goal = w.goal, n = w.n, slots = goal || 7;
    const bar = Array.from({ length: slots }, (_, i)=> '<div class="seg ' + (i < n ? 'on' : '') + '"></div>').join('');
    left = '<div class="card" style="padding:12px 10px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + FLAG + '이번 주 출석</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:8px"><span class="pxf" style="font-size:20px">' + n + '</span><span style="font-size:13px;font-weight:700;color:var(--muted)">' + (goal ? '/ 주 ' + goal + '회' : '회') + '</span></div>' +
      '<div style="display:grid;grid-template-columns:repeat(' + slots + ',minmax(0,1fr));gap:2px;margin-top:8px">' + bar + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">' + (goal ? (n >= goal ? '<b style="color:' + B + '">이번 주 목표 달성!</b>' : '내 목표 주 ' + goal + '회') + '<br><a href="#" id="goalBtn" style="font-weight:700">목표 바꾸기</a>' : '일주일에 몇 번 올까요?<br><a href="#" id="goalBtn" style="font-weight:700">목표 정하기</a>') + '</div></div>';
  }
  const right = '<div class="card" style="padding:12px 10px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + CAL + '회원권</div>' +
    '<div class="pxf" style="font-size:20px;color:' + B + ';margin-top:10px">' + (dday == null ? '-' : dday >= 0 ? 'D-' + dday : '만료') + '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:12px">' + (holding ? '홀딩 중 · ' + dotDate(me.holdEnd).slice(5) + '까지' : dotDate(me.gymExp) + '까지') + '</div></div>';
  $app.innerHTML =
    '<div class="top"><img class="logo" src="./logo.png" alt="RUN N FIT"><button class="iconbtn" type="button" id="bellBtn" aria-label="공지">' + BELL + (notices.some((n)=> !noticeSeen().includes(n.id)) ? '<span class="dot"></span>' : '') + '</button></div>' +
    '<div style="padding:12px 24px 0;display:flex;gap:12px;align-items:center">' + AVATAR(44) +
      '<div><div style="font-size:13px;color:var(--muted);font-weight:500">' + (f30 ? '등록 ' + f30.day + '일째 · ' : '') + (none ? '첫 출석을 기다려요' : cur.name) + '</div><div style="font-size:20px;font-weight:900;margin-top:1px">' + esc(me.nickname || me.name) + '님, 반가워요!</div></div></div>' +
    (attendedToday
      ? '<div class="m" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 4px 14px rgba(9,54,146,.10)"><span style="width:40px;height:40px;border-radius:50%;background:' + B + ';display:flex;align-items:center;justify-content:center;flex:none"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span style="flex:1"><b style="display:block;font-size:16px">오늘도 출석 완료!</b><span style="font-size:13px;color:#4B5563">짱! 잘했어요</span></span><span style="text-align:center;background:var(--bg);border-radius:10px;padding:5px 10px;flex:none"><b style="display:block;font-size:18px;color:' + B + '">' + total + '</b><span style="font-size:10.5px;color:#6B7280">번째 출석</span></span></div>'
      : '<div class="m" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 4px 14px rgba(9,54,146,.10)"><span style="width:40px;height:40px;border-radius:50%;background:#E3E9FF;display:flex;align-items:center;justify-content:center;flex:none"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="' + B + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg></span><span style="flex:1"><b style="display:block;font-size:16px">아직 출석 전</b><span style="font-size:13px;color:#4B5563">런앤핏이 기다리고 있어요!</span></span><span style="text-align:center;background:var(--bg);border-radius:10px;padding:5px 10px;flex:none"><b style="display:block;font-size:18px;color:' + B + '">' + total + '</b><span style="font-size:10.5px;color:#6B7280">번 출석</span></span></div>') +
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
    masterHomeCard() +
    wodHomeCard() +
    '<div style="height:18px"></div>';
  document.getElementById('bellBtn').onclick = showNotices;
  bindWodHome();
  document.getElementById('helpToggle').onclick = ()=>{ helpOpen = !helpOpen; const y = window.scrollY; renderHome(); window.scrollTo(0, y); };
  $app.querySelectorAll('[data-help]').forEach((b)=> b.onclick = ()=>{ helpKind = b.dataset.help; go('help'); });
  const gb = document.getElementById('goalBtn'); if(gb) gb.onclick = (e)=>{ e.preventDefault(); changeGoal(); };
}
const noticeSeen = ()=>{ try{ return JSON.parse(localStorage.getItem('rfNotice.seen') || '[]'); }catch(e){ return []; } };
function markNotices(ids){ try{ const s = noticeSeen(); localStorage.setItem('rfNotice.seen', JSON.stringify(s.concat(ids.filter((i)=> !s.includes(i))).slice(-200))); }catch(e){} const d = document.querySelector('#bellBtn .dot'); if(d && notices.every((n)=> noticeSeen().includes(n.id))) d.remove(); }
const noticeDate = (n)=> n.createdAt && n.createdAt.toDate ? dotDate(kstDate(n.createdAt.toDate().getTime())) : '';
function noticeBody(n){ return '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + noticeDate(n) + (n.by ? ' · ' + esc(n.by) : '') + '</div><div style="font-size:15px;line-height:1.75;margin-top:12px;white-space:pre-line;color:var(--ink)">' + esc(n.body || '') + '</div>'; }
function showNotice(n){
  const bg = sheet('<div style="font-size:12px;font-weight:900;color:' + B + '">런앤핏 공지</div><div class="ttl" style="margin-top:4px;line-height:1.4">' + esc(n.title || '') + '</div>' + noticeBody(n));
  const c = bg.querySelector('[data-close]'); if(c){ c.textContent = '확인했어요'; c.className = 'btn'; }
  markNotices([n.id]);
}
function showNotices(){
  const bg = sheet('<div class="ttl">공지</div>' + (notices.length ? notices.map((n, i)=> '<button type="button" data-n="' + i + '" style="display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid #E5E7EB;padding:12px 0;font-family:inherit;cursor:pointer">' +
    '<div style="display:flex;align-items:center;gap:6px"><b style="font-size:15px;color:var(--ink);flex:1">' + esc(n.title || '') + '</b>' + (noticeSeen().includes(n.id) ? '' : '<span style="background:#EF4444;color:#fff;border-radius:6px;font-size:10.5px;font-weight:900;padding:1px 6px">NEW</span>') + '<span style="color:var(--muted)">›</span></div>' +
    '<div class="muted" style="font-size:12px;margin-top:2px">' + noticeDate(n) + '</div></button>').join('') : '<div class="muted" style="margin-top:12px">아직 공지가 없어요.</div>'));
  bg.querySelectorAll('[data-n]').forEach((b)=> b.onclick = ()=>{ bg.remove(); showNotice(notices[Number(b.dataset.n)]); });
}
// '처음 열 때 한 번 보여주기' 공지는 처음 로그인했을 때 자동으로 한 번 띄움 (다른 창이 열려 있으면 닫힐 때까지 기다림)
function autoNotice(){
  const n = notices.find((x)=> x.popup && !noticeSeen().includes(x.id)); if(!n) return;
  let tries = 0;
  const t = setInterval(()=>{ if(++tries > 120){ clearInterval(t); return; } if(document.querySelector('.sheet-bg') || tab !== 'home') return; clearInterval(t); showNotice(n); }, 800);
}
function coach(){ sheet('<div class="ttl">코치에게 물어보기</div><div style="font-size:15px;margin-top:10px;line-height:1.6">앱에서 바로 묻는 기능은 곧 열려요!<br>지금은 운동하다 궁금한 점이 있으면 <b>트레이너나 프론트</b>에 편하게 물어봐 주세요. 런앤핏이 함께할게요 💙</div>'); }
function changeGoal(){
  const cur = Number(me.weeklyGoal) || 0;
  const bg = sheet('<div class="ttl">이번 주 출석 목표</div><div class="muted" style="font-size:14px;margin-top:4px">일주일에 몇 번 오고 싶으세요? 런앤핏이 함께 응원할게요!</div><div class="chips" style="margin-top:14px">' + [1, 2, 3, 4, 5, 6, 7].map((n)=> '<button type="button" data-n="' + n + '" class="' + (cur === n ? 'on' : '') + '">주 ' + n + '회</button>').join('') + '</div>');
  bg.querySelectorAll('[data-n]').forEach((b)=> b.onclick = async ()=>{
    const n = Number(b.dataset.n); if(n === cur){ bg.remove(); return; }
    try{
      await updateDoc(doc(db, 'members', me.id), { weeklyGoal: n, goalSetAt: serverTimestamp() });
      me.weeklyGoal = n; bg.remove(); (document.getElementById('goalBtn2') ? renderChallenge : renderHome)(); toast('목표를 주 ' + n + '회로 정했어요! 런앤핏이 응원할게요 💙');
      setDoc(doc(collection(db, 'goal_logs')), { uid: auth.currentUser.uid, memberId: me.id, name: me.name || '', nickname: me.nickname || '', goal: n, prev: cur, status: 'new', createdAt: serverTimestamp() }).catch((e)=> console.warn(e));
    }catch(e){ toast('저장하지 못했어요.'); }
  });
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

// ---------- 이번 주 출석 (월~일, KST) ----------
function weekInfo(){
  const t = today(), dow = (new Date(t + 'T12:00:00+09:00').getUTCDay() + 6) % 7, mon = addDays(t, -dow);
  const days = new Set(Array.isArray(me.recentDays) ? me.recentDays : []);
  if(me.lastAttend === t) days.add(t);
  const list = Array.from({ length: 7 }, (_, i)=> addDays(mon, i));
  return { mon, list, n: list.filter((d)=> days.has(d)).length, days, goal: Number(me.weeklyGoal) || 0 };
}

// ---------- 첫 30일 출석 도전 / 이번 달 ----------
function renderChallenge(){
  const f30 = first30Info();
  if(!f30){
    const mk = today().slice(0, 7), mN = me.monthKey === mk ? (Number(me.monthCount) || 0) : 0, w = weekInfo(), n = w.n, goal = w.goal;
    const days = new Set(Array.isArray(me.recentDays) ? me.recentDays : []);
    const first = mk + '-01', last = kstDate(Date.parse(addDays(first, 32) .slice(0, 7) + '-01T12:00:00+09:00') - 864e5);
    const total = daysBetween(last, first) + 1, lead = (new Date(first + 'T12:00:00+09:00').getUTCDay() + 6) % 7;
    const cells = Array.from({ length: lead }, ()=> '<div></div>').concat(Array.from({ length: total }, (_, i)=>{
      const d = addDays(first, i), on = days.has(d), isT = d === today();
      const st = on ? 'background:' + B + ';color:#fff' : isT ? 'background:#fff;color:' + B + ';box-shadow:inset 0 0 0 3px ' + B : d < today() ? 'background:#E9EEF6;color:#6B7280' : 'background:#fff;color:#9CA3AF;box-shadow:inset 0 0 0 1px var(--line)';
      return '<div data-day="' + d + '" style="height:38px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:' + (on || isT ? 900 : 500) + ';' + st + '">' + (on ? CHECK('#FFD54A', 14) : isT ? '오늘' : (i + 1)) + '</div>';
    })).join('');
    const wk = w.list.map((d, i)=>{ const on = w.days.has(d), isT = d === today();
      return '<div style="text-align:center"><div style="font-size:11px;color:var(--muted)">' + '월화수목금토일'[i] + '</div><div style="height:30px;margin-top:3px;display:flex;align-items:center;justify-content:center;' + (on ? 'background:' + B : isT ? 'background:#fff;box-shadow:inset 0 0 0 3px ' + B : 'background:#E9EEF6') + '">' + (on ? CHECK('#FFD54A', 14) : '') + '</div></div>'; }).join('');
    $app.innerHTML = topbar('내 운동') +
      '<div class="hero m" style="padding:16px;text-align:center"><div style="font-size:13px;color:var(--muted)">' + (goal ? '내가 정한 목표 주 ' + goal + '회' : '아직 목표를 안 정했어요') + '</div>' +
        '<div style="display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:8px"><span class="pxf" style="font-size:30px;color:' + B + '">' + n + '</span><span style="font-size:16px;font-weight:700;color:var(--muted)">' + (goal ? '/ ' + goal + '회 출석' : '회 출석') + '</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:12px">' + wk + '</div>' +
        '<div style="display:inline-block;margin-top:12px" class="chip">' + (!goal ? '목표를 정하면 런앤핏이 함께 응원해요' : n >= goal ? '이번 주 목표 달성! 짱!' : (goal - n) + '번 더 출석하면 이번 주 목표 달성!') + '</div>' +
        '<div style="margin-top:10px"><a href="#" id="goalBtn2" style="font-weight:700;font-size:13px">' + (goal ? '목표 바꾸기' : '목표 정하기') + '</a></div></div>' +
      '<div class="card m" style="padding:12px"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div style="font-size:14px;font-weight:900">' + Number(mk.slice(5)) + '월 출석 도장 · ' + mN + '회</div><div style="font-size:12px;color:var(--muted)">파란 칸 = 출석</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;font-size:11px;color:var(--muted);text-align:center;margin-bottom:4px">' + ['월', '화', '수', '목', '금', '토', '일'].map((x)=> '<div>' + x + '</div>').join('') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">' + cells + '</div></div><div id="myWod"></div>';
    document.getElementById('goalBtn2').onclick = (e)=>{ e.preventDefault(); changeGoal(); };
    paintMyWod();
    return;
  }
  const set = new Set(f30.days);
  const cells = Array.from({ length: 30 }, (_, i)=>{
    const d = addDays(f30.start, i), on = set.has(d), isT = d === today();
    const st = on ? 'background:' + B + ';color:#fff' : isT ? 'background:#fff;color:' + B + ';box-shadow:inset 0 0 0 3px ' + B : d < today() ? 'background:#E9EEF6;color:#6B7280' : 'background:#fff;color:#9CA3AF;box-shadow:inset 0 0 0 1px var(--line)';
    return '<div data-day="' + d + '" style="height:38px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:' + (on || isT ? 900 : 500) + ';' + st + '" aria-label="' + (i + 1) + '일차">' + (on ? CHECK('#FFD54A', 14) : isT ? '오늘' : (i + 1)) + '</div>';
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
    '<div id="myWod"></div><div style="height:18px"></div>';
  paintMyWod();
}

// ---------- 런앤핏에 한마디 ----------
const VTYPES = [['praise', '칭찬해요', '어떤 점이 좋으셨어요?', '예: 센터가 늘 깔끔해서 좋아요!'], ['issue', '불편해요', '어떤 점이 불편하셨어요?', '예: 3번 러닝머신에서 소리가 나요'], ['idea', '제안해요', '어떤 점이 있으면 좋을까요?', '예: 마라톤 대회 같이 또 나가고 싶어요!']];
const VCATS = ['기구', '청결', '직원', '수업', '기타'];
let vType = 'praise', vCat = '직원';
async function renderVoice(){
  const t = VTYPES.find((x)=> x[0] === vType);
  $app.innerHTML = topbar('런앤핏에 한마디') +
    '<div class="card m tabseg">' + VTYPES.map((x)=> '<button type="button" data-vt="' + x[0] + '" class="' + (x[0] === vType ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="m chips">' + VCATS.map((c)=> '<button type="button" data-vc="' + c + '" class="' + (c === vCat ? 'on' : '') + '">' + c + '</button>').join('') + '</div>' +
    '<div class="card m field" style="padding:14px"><label for="vText">' + t[2] + '</label><textarea id="vText" maxlength="1000" placeholder="' + t[3] + '"></textarea></div>' +
    '<div class="hero m" style="padding:12px 14px;display:flex;gap:10px;align-items:flex-start;color:' + B + '"><div style="margin-top:2px">' + LOCK + '</div><div style="font-size:13px;line-height:1.55;color:var(--ink)"><b style="color:' + B + '">코치님들에게는 보이지 않아요. 익명(닉네임)으로 전달돼요!</b><br>작은 이야기도 소중하게 듣고, 더 나은 런앤핏으로 답할게요.</div></div>' +
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
    await setDoc(ref, { type: vType, category: vCat, text, nickname: me.nickname || '', photoUrl: null, status: 'new', createdAt: serverTimestamp() });
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

// ---------- 이번 주 런앤핏 운동 프로그램 (띠별 WOD · 운동 기록) ----------
const WBELTS = [
  { k: '노', name: '노란 띠', bg: '#FFD54A', fg: '#3A2A00', soft: '#FFF4CC' },
  { k: '파', name: '파란 띠', bg: '#093692', fg: '#fff', soft: '#E3E9FF' },
  { k: '빨', name: '빨간 띠', bg: '#B91C32', fg: '#fff', soft: '#FDE8EC' },
  { k: '검', name: '검은 띠', bg: '#111827', fg: '#fff', soft: '#E9EBEF' },
];
const WPROG = { A: '스쿼트 중심 전신', B: '힙힌지·밀기 중심 전신', C: '당기기·한쪽 하체 전신' };
// 11월 셋째 주 (센터 모니터판과 같은 내용). 직원 관리 화면에서 매주 바꾸면 wods/current 가 이걸 덮어씀
const DEFAULT_WOD = { start: '2026-11-16', end: '2026-11-22', programs: {
  노: { A: [['01', '레그프레스'], ['12', '체스트프레스'], ['08', '랫풀다운'], ['맨몸', '스쿼트'], ['13', '암컬'], ['체력', '스텝박스 기본 스텝', '20회×3']],
        B: [['03', '레그컬'], ['14', '숄더프레스'], ['06', '롱풀'], ['맨몸', '힙힌지'], ['11', '팩덱플라이'], ['체력', '제자리 피칭', '30초×3']],
        C: [['19', '레그프레스'], ['09', '시티드로우'], ['12', '체스트프레스'], ['04', '레그익스텐션'], ['21', '케이블 삼두 푸시다운'], ['체력', '스텝박스 사이드 스텝', '20회×3']] },
  파: { A: [['덤벨', '덤벨 스쿼트'], ['덤벨', '덤벨 벤치프레스'], ['09', '시티드로우'], ['KB', '케틀벨 데드리프트'], ['덤벨', '덤벨 레터럴 레이즈'], ['체력', '점핑잭', '30회×3']],
        B: [['KB', '케틀벨 데드리프트'], ['덤벨', '덤벨 숄더프레스'], ['08', '랫풀다운'], ['덤벨', '덤벨 리버스 런지'], ['21', '케이블 삼두 푸시다운'], ['체력', '스텝박스 교차 스텝', '20회×3']],
        C: [['덤벨', '덤벨 스플릿 스쿼트'], ['덤벨', '원암 덤벨로우'], ['덤벨', '덤벨 인클라인 프레스'], ['03', '레그컬'], ['덤벨', '덤벨 레터럴 레이즈'], ['체력', '마운틴클라이머', '20회×3']] },
  빨: { A: [['23', '바벨 백스쿼트'], ['18', '바벨 벤치프레스'], ['07', '어시스트 풀업'], ['덤벨', '덤벨 루마니안 데드리프트'], ['21', '케이블 삼두 푸시다운'], ['체력', '스텝업', '20회×3']],
        B: [['24', '바벨 데드리프트'], ['14', '숄더프레스'], ['09', '시티드로우'], ['덤벨', '덤벨 리버스 런지'], ['13', '암컬'], ['체력', '버피', '10회×3']],
        C: [['22', '스미스 스쿼트'], ['바벨', '바벨 벤트오버로우'], ['덤벨', '덤벨 인클라인 프레스'], ['03', '레그컬'], ['덤벨', '덤벨 레터럴 레이즈'], ['체력', 'A스킵', '30회×3']] },
  검: { A: [['23', '바벨 백스쿼트'], ['덤벨', '덤벨 벤치프레스'], ['맨몸', '풀업'], ['덤벨', '덤벨 워킹 런지'], ['덤벨', '덤벨 레터럴 레이즈'], ['체력', '스쿼트 점프', '10회×3']],
        B: [['24', '바벨 데드리프트'], ['바벨', '바벨 오버헤드프레스'], ['맨몸', '풀업'], ['덤벨', '덤벨 리버스 런지'], ['덤벨', '덤벨 암컬'], ['체력', '버피', '15회×3']],
        C: [['덤벨', '덤벨 불가리안 스플릿 스쿼트'], ['덤벨', '원암 덤벨로우'], ['덤벨', '덤벨 인클라인 프레스'], ['KB', '바벨 데드리프트'], ['덤벨', '덤벨 레터럴 레이즈'], ['체력', '마운틴클라이머', '20회×3']] },
} };
let WOD = null;          // { start, end, programs: { 노: { A: [{t,n,x}] } } }
let wodBelt = null;      // 프로그램 화면에서 보고 있는 띠
let myLogs = null;       // 내 운동 기록 (최근 순)
let wodSel = null;       // 내 운동에서 고른 날짜
const SKEY = 'rfWod.session.v1';

function normWod(w){
  const out = { start: w.start, end: w.end, programs: {} };
  WBELTS.forEach(({ k })=>{ out.programs[k] = {}; ['A', 'B', 'C'].forEach((p)=>{
    const src = (w.programs && w.programs[k] && w.programs[k][p]) || [];
    out.programs[k][p] = src.map((r)=> Array.isArray(r) ? { t: r[0], n: r[1], x: r[2] || '' } : { t: r.t, n: r.n, x: r.x || '' });
  }); });
  return out;
}
async function loadWod(){
  if(WOD) return WOD;
  try{ const s = await getDoc(doc(db, 'wods', 'current')); if(s.exists() && s.data().programs) { WOD = normWod(s.data()); return WOD; } }catch(e){}
  WOD = normWod(DEFAULT_WOD); return WOD;
}
const wodRange = ()=> WOD ? dotDate(WOD.start).slice(5) + ' – ' + dotDate(WOD.end).slice(5) : '';
function myBeltKey(){ const t = Number(me.total) || 0; return t >= 100 ? '검' : t >= 50 ? '빨' : t >= 30 ? '파' : '노'; }
const wBelt = (k)=> WBELTS.find((b)=> b.k === k) || WBELTS[0];
function kindOf(t){
  if(/^\d+$/.test(t)) return ['17', '18', '22', '23', '24'].includes(t) ? 'bar' : 'machine';
  return { '덤벨': 'db', 'KB': 'kb', '바벨': 'bar', '맨몸': 'body', '체력': 'cond' }[t] || 'body';
}
const weighted = (k)=> k === 'machine' || k === 'bar' || k === 'db' || k === 'kb';
const kgStep = (k)=> k === 'db' ? 1 : k === 'kb' ? 2 : k === 'bar' ? 2.5 : 5;
function tagHtml(t){
  const st = t === '체력' ? 'background:#FFD54A;color:#3A2A00' : /^\d+$/.test(t) ? 'background:' + B + ';color:#fff' : 'background:#fff;color:#6B7280;box-shadow:inset 0 0 0 1px #D5DCE8';
  return '<span style="min-width:36px;text-align:center;border-radius:5px;font-size:11px;font-weight:900;padding:1px 4px;flex:none;' + st + '">' + esc(t) + '</span>';
}
const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const CHK = (c, s)=> '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || '#fff') + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const getSession = ()=>{ try{ return JSON.parse(localStorage.getItem(SKEY) || 'null'); }catch(e){ return null; } };
const putSession = (s)=>{ try{ s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); }catch(e){} };

// 홈 칸 (예전 오늘의 운동 자리)
function wodHomeCard(){
  const s = getSession(), mb = wBelt(myBeltKey()), white = (Number(me.total) || 0) < 10;
  return '<div class="m" style="background:' + B + ';color:#fff;border-radius:14px;padding:14px 16px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;font-weight:700;color:var(--y)">이번 주 런앤핏 운동 프로그램</span><span style="font-size:12px;opacity:.8" id="wodRange">' + wodRange() + '</span></div>' +
    '<div style="font-size:17px;font-weight:900;margin-top:4px;line-height:1.35">출석만 하세요! 운동은 런앤핏이 준비했어요</div>' +
    '<div style="margin-top:10px;background:rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.5">' +
      (white ? '<b style="color:var(--y)">흰 띠는 기본 머신 사용법부터!</b><br>노란 띠 프로그램으로 천천히 시작해 보세요' : '<b style="color:var(--y)">내 띠 추천 ' + mb.name + '!</b><br>다른 띠 프로그램도 자유롭게 도전해봐도 좋아요') + '</div>' +
    '<button type="button" id="wodGo" style="width:100%;margin-top:10px;height:44px;border:0;border-radius:10px;background:#fff;color:' + B + ';font-weight:900;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-family:inherit">' +
      (s ? wBelt(s.belt).name + ' ' + s.prog + ' 이어서 하기 ' : '이번 주 운동 프로그램 보기 ') + ARROW + '</button></div>';
}
function bindWodHome(){
  const b = document.getElementById('wodGo'); if(!b) return;
  b.onclick = ()=> go(getSession() ? 'session' : 'wod');
  if(!WOD) loadWod().then(()=>{ const r = document.getElementById('wodRange'); if(r) r.textContent = wodRange(); });
}

// 프로그램 고르기 (P1)
async function renderWod(){
  $app.innerHTML = topbar('이번 주 운동 프로그램') + '<div class="loading">불러오는 중…</div>';
  await loadWod();
  if(!wodBelt) wodBelt = myBeltKey();
  const mk = myBeltKey();
  const tabs = WBELTS.map((b)=> '<button type="button" data-belt="' + b.k + '" style="flex:1;position:relative;border:0;border-radius:10px;padding:10px 0 9px;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;' +
    (b.k === wodBelt ? 'background:' + b.bg + ';color:' + b.fg : 'background:transparent;color:#374151') + '">' + b.name +
    (b.k === mk ? '<i style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:' + B + ';color:#fff;font-style:normal;font-size:9.5px;border-radius:4px;padding:0 5px;white-space:nowrap">내 띠 추천</i>' : '') + '</button>').join('');
  const card = (p, first)=>{ const items = WOD.programs[wodBelt][p] || [];
    return '<div class="card m" style="padding:12px 14px">' +
      '<div style="display:flex;align-items:center;gap:10px"><b style="width:34px;height:34px;border-radius:8px;background:' + B + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-style:italic">' + p + '</b><b style="font-size:15px">' + WPROG[p] + '</b></div>' +
      '<div style="margin-top:6px">' + items.map((it)=> '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:14px">' + tagHtml(it.t) + '<span style="flex:1">' + esc(it.n) + '</span>' + (it.x ? '<span style="font-size:12.5px;color:' + B + ';font-weight:700">' + esc(it.x) + '</span>' : '') + '</div>').join('') + '</div>' +
      '<button type="button" data-start="' + p + '" class="btn' + (first ? '' : ' ghost') + '" style="width:100%;margin-top:8px;height:44px;font-size:14px' + (first ? '' : ';box-shadow:none;background:#E3E9FF') + '">' + p + '로 운동 시작하기</button></div>'; };
  $app.innerHTML = '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" data-go="home" aria-label="뒤로">' + BACK + '</button><div class="ttl">이번 주 운동 프로그램</div><span style="margin-left:auto;font-size:12px;color:var(--muted)">' + wodRange() + '</span></div>' +
    '<div class="m" style="font-size:13px;color:#4B5563;line-height:1.6"><b style="color:var(--ink)">내 띠는 추천!</b><br>다른 띠 프로그램도 자유롭게 도전해봐도 좋아요!<br>A · B · C 중 선택해서 진행해보세요!</div>' +
    '<div class="m" style="margin-top:18px;display:flex;gap:4px;background:#fff;border-radius:12px;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' + tabs + '</div>' +
    card('A', true) + card('B') + card('C') +
    '<div class="m" style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:6px">반복 10~15회 · 3~5세트 · 휴식 60~90초 · 고중량은 휴식 2~3분<br>기구가 비어 있는 운동부터 해도 OK!</div><div style="height:18px"></div>';
  $app.querySelectorAll('[data-belt]').forEach((b)=> b.onclick = ()=>{ wodBelt = b.dataset.belt; renderWod(); });
  $app.querySelectorAll('[data-start]').forEach((b)=> b.onclick = ()=> startSession(wodBelt, b.dataset.start));
}

async function loadMyLogs(force){
  if(myLogs && !force) return myLogs;
  try{
    const s = await getDocs(query(collection(db, 'workout_logs'), where('uid', '==', auth.currentUser.uid), limit(200)));
    myLogs = s.docs.map((d)=> Object.assign({ id: d.id }, d.data())).sort((a, b)=> (b.date || '').localeCompare(a.date || '') || ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
  }catch(e){ console.warn(e); myLogs = myLogs || []; }
  return myLogs;
}
function lastOf(name){
  for(const l of (myLogs || [])) for(const it of (l.items || [])) if(it.n === name && it.sets && it.sets.length) return it.sets;
  return null;
}
async function startSession(belt, prog){
  const old = getSession();
  if(old && !confirm('하던 운동(' + wBelt(old.belt).name + ' ' + old.prog + ')이 있어요. 새로 시작할까요?')){ go('session'); return; }
  await loadMyLogs();
  const items = (WOD.programs[belt][prog] || []).map((it)=>{
    const kind = kindOf(it.t), last = lastOf(it.n);
    const m = /(\d+)\s*(회|초)\s*[×x]\s*(\d+)/.exec(it.x || '');
    const unit = m ? m[2] : '회', n = m ? Number(m[3]) : 3, baseReps = m ? Number(m[1]) : 12;
    const defKg = { machine: 20, bar: 20, db: 5, kb: 8 }[kind] || 0;
    const sets = Array.from({ length: n }, (_, i)=>{ const l = last && (last[i] || last[last.length - 1]);
      return { kg: weighted(kind) ? (l && l.kg != null ? l.kg : defKg) : null, reps: l && l.reps ? l.reps : baseReps, done: false, prev: l ? (weighted(kind) && l.kg != null ? l.kg + '×' + l.reps : l.reps + unit) : '' }; });
    return { t: it.t, n: it.n, x: it.x, kind, unit, sets };
  });
  putSession({ belt, prog, items, cur: 0, start: Date.now() });
  go('session');
}

// 운동 기록 (R3 + S1 휠 + 쉬는 시간)
let restT = null, restLeft = 0;
function renderSession(){
  const s = getSession(); if(!s){ go('wod'); return; }
  const it = s.items[s.cur], bl = wBelt(s.belt);
  const doneIt = (x)=> x.sets.length && x.sets.every((z)=> z.done);
  const nDone = s.items.filter(doneIt).length;
  const strip = s.items.map((x, i)=>{ const d = doneIt(x), on = i === s.cur;
    return '<button type="button" data-ex="' + i + '" style="flex:1;height:36px;border:0;border-radius:8px;font-family:inherit;font-size:11.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
      (d ? 'background:' + B + ';color:#fff' : on ? 'background:#fff;color:' + B + ';box-shadow:inset 0 0 0 2.5px ' + B : 'background:#E9EEF6;color:#6B7280') + '">' + (d ? CHK('#fff', 14) : esc(x.t)) + '</button>'; }).join('');
  const w = weighted(it.kind);
  const box = (v, u, i, f)=> '<button type="button" data-pick="' + i + '" data-f="' + f + '" style="width:' + (w ? 76 : 120) + 'px;height:42px;border:0;border-radius:9px;background:#F1F4FA;font-family:inherit;font-size:17px;font-weight:900;cursor:pointer;color:var(--ink)">' + v + '<span style="font-size:11px;font-weight:500;margin-left:2px">' + u + '</span></button>';
  const rows = it.sets.map((z, i)=> '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-top:1px solid #F0F2F7">' +
    '<span style="width:50px"><b style="display:block;font-size:14px;color:#374151">' + (i + 1) + '세트</b>' + (z.prev ? '<span style="font-size:10.5px;color:#9CA3AF">지난번 ' + esc(z.prev) + '</span>' : '') + '</span>' +
    (w ? box(z.kg, 'kg', i, 'kg') + '<span style="color:#9CA3AF">×</span>' : '') + box(z.reps, it.unit, i, 'reps') + '<span style="flex:1"></span>' +
    '<button type="button" data-done="' + i + '" aria-label="' + (i + 1) + '세트 완료" style="width:46px;height:46px;border:0;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;' + (z.done ? 'background:' + B : 'background:#fff;box-shadow:inset 0 0 0 2px #C7D3EE') + '">' + (z.done ? CHK() : '') + '</button></div>').join('');
  $app.innerHTML = '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" id="sBack" aria-label="뒤로">' + BACK + '</button><div class="ttl" style="font-size:17px">' + bl.name + ' ' + s.prog + ' · ' + WPROG[s.prog] + '</div><span style="margin-left:auto;font-size:12.5px;color:' + B + ';font-weight:900;white-space:nowrap">' + nDone + ' / ' + s.items.length + ' 완료</span></div>' +
    '<div class="m" style="display:flex;gap:5px">' + strip + '</div><div class="m" style="margin-top:6px;font-size:11.5px;color:var(--muted)">번호를 누르면 그 운동으로 이동 · 순서는 자유예요</div>' +
    '<div class="card m" style="padding:14px 16px"><div style="display:flex;align-items:center;gap:10px">' + tagHtml(it.t) + '<b style="font-size:19px">' + esc(it.n) + '</b></div>' +
      '<div style="font-size:12.5px;color:#4B5563;margin-top:4px">' + (it.x ? esc(it.x) : '10~15회 × 3세트') + ' · 휴식 60~90초</div>' + '<div style="display:flex;justify-content:flex-end;margin-top:8px;font-size:11.5px;font-weight:700;color:' + B + '">완료하면 체크해 주세요 ↓</div>' + rows +
      '<button type="button" id="addSet" style="width:100%;border:0;background:none;font-family:inherit;font-size:13px;color:var(--muted);padding:10px 0 2px;cursor:pointer">+ 세트 추가</button></div>' +
    '<div id="rest"></div><div style="height:96px"></div>' +
    '<div style="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));width:min(480px,100%);padding:0 22px;box-sizing:border-box;display:flex;gap:8px;z-index:5">' +
      '<button type="button" id="nextEx" class="btn" style="flex:1;background:#E3E9FF;color:' + B + '">다음 운동</button><button type="button" id="finish" class="btn" style="flex:1.4">오늘 운동 마치기</button></div>';
  paintRest();
  document.getElementById('sBack').onclick = ()=> go('wod');
  $app.querySelectorAll('[data-ex]').forEach((b)=> b.onclick = ()=>{ s.cur = Number(b.dataset.ex); putSession(s); renderSession(); });
  $app.querySelectorAll('[data-done]').forEach((b)=> b.onclick = ()=>{ const z = it.sets[Number(b.dataset.done)]; z.done = !z.done; putSession(s); if(z.done) startRest(90); renderSession(); });
  $app.querySelectorAll('[data-pick]').forEach((b)=> b.onclick = ()=> openWheel(s, Number(b.dataset.pick)));
  document.getElementById('addSet').onclick = ()=>{ const l = it.sets[it.sets.length - 1] || { kg: null, reps: 12 }; it.sets.push({ kg: l.kg, reps: l.reps, done: false, prev: '' }); putSession(s); renderSession(); };
  document.getElementById('nextEx').onclick = ()=>{ const n = s.items.length; let k = s.cur; for(let i = 1; i <= n; i++){ const j = (s.cur + i) % n; if(!doneIt(s.items[j])){ k = j; break; } } s.cur = k === s.cur ? (s.cur + 1) % n : k; putSession(s); renderSession(); };
  document.getElementById('finish').onclick = ()=> finishSession();
}
function startRest(sec){ restLeft = sec; clearInterval(restT); restT = setInterval(()=>{ restLeft--; if(restLeft <= 0){ clearInterval(restT); restT = null; try{ navigator.vibrate && navigator.vibrate([200, 100, 200]); }catch(e){} } paintRest(); }, 1000); paintRest(); }
function paintRest(){
  const el = document.getElementById('rest'); if(!el) return;
  if(!restT || restLeft <= 0){ el.innerHTML = ''; return; }
  el.innerHTML = '<div class="m" style="background:' + B + ';color:#fff;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px"><span style="font-size:13px;opacity:.9">쉬는 시간</span><b style="font-size:24px;letter-spacing:1px">' + Math.floor(restLeft / 60) + ':' + String(restLeft % 60).padStart(2, '0') + '</b>' +
    '<button type="button" id="rPlus" style="margin-left:auto;border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:7px 10px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">+30초</button><button type="button" id="rSkip" style="border:0;background:#fff;color:' + B + ';border-radius:8px;padding:7px 10px;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer">건너뛰기</button></div>';
  document.getElementById('rPlus').onclick = ()=>{ restLeft += 30; paintRest(); };
  document.getElementById('rSkip').onclick = ()=>{ clearInterval(restT); restT = null; paintRest(); };
}
function wheelCol(vals, cur, unit){
  return '<div class="wcol" style="flex:1;height:220px;overflow-y:auto;scroll-snap-type:y mandatory;position:relative;z-index:1;-webkit-overflow-scrolling:touch;scrollbar-width:none">' +
    '<div style="height:88px"></div>' + vals.map((v)=> '<div data-v="' + v + '" style="height:44px;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900">' + v + '<span style="font-size:13px;font-weight:500;margin-left:3px">' + unit + '</span></div>').join('') + '<div style="height:88px"></div></div>';
}
function openWheel(s, i){
  const it = s.items[s.cur], z = it.sets[i], w = weighted(it.kind), step = kgStep(it.kind);
  const kgs = []; for(let v = 0; v <= (it.kind === 'db' || it.kind === 'kb' ? 60 : 300); v = Math.round((v + step) * 10) / 10) kgs.push(v);
  const reps = []; if(it.unit === '초'){ for(let v = 5; v <= 180; v += 5) reps.push(v); } else { for(let v = 1; v <= 60; v++) reps.push(v); }
  const prev = i > 0 ? it.sets[0] : null, big = it.kind === 'db' ? 2 : 5;
  const bg = sheet('<div class="ttl">' + (i + 1) + '세트 · ' + esc(it.n) + '</div><div class="muted" style="font-size:13px;margin-top:2px">위아래로 굴려서 고르세요' + (z.prev ? ' · 지난번 ' + esc(z.prev) : '') + '</div>' +
    '<div style="position:relative;display:flex;gap:12px;margin-top:12px"><div style="position:absolute;left:0;right:0;top:88px;height:44px;background:#E3E9FF;border-radius:10px"></div>' +
      (w ? wheelCol(kgs, z.kg, 'kg') : '') + wheelCol(reps, z.reps, it.unit) + '</div>' +
    '<div style="display:flex;gap:6px;margin-top:12px">' +
      (z.prev ? '<button type="button" class="chipq" data-q="prev">지난번과 같게</button>' : '') + (prev ? '<button type="button" class="chipq" data-q="first">1세트와 같게</button>' : '') + (w ? '<button type="button" class="chipq" data-q="plus">+' + big + 'kg</button>' : '') + '</div>' +
    '<button type="button" class="btn" id="wOk" style="width:100%;margin-top:12px">확인</button>');
  bg.querySelectorAll('.chipq').forEach((b)=> b.style.cssText = 'flex:1;height:36px;border:0;border-radius:18px;background:#F1F4FA;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer');
  const cols = bg.querySelectorAll('.wcol');
  const setCol = (col, v)=>{ const k = [...col.querySelectorAll('[data-v]')].findIndex((d)=> Number(d.dataset.v) >= v); col.scrollTop = Math.max(0, k) * 44; };
  const readCol = (col)=>{ const ds = col.querySelectorAll('[data-v]'); const k = Math.min(ds.length - 1, Math.max(0, Math.round(col.scrollTop / 44))); return Number(ds[k].dataset.v); };
  requestAnimationFrame(()=>{ if(w){ setCol(cols[0], z.kg || 0); setCol(cols[1], z.reps); } else setCol(cols[0], z.reps); });
  bg.querySelectorAll('[data-q]').forEach((b)=> b.onclick = ()=>{
    const q = b.dataset.q;
    if(q === 'prev'){ const p = /([\d.]+)×(\d+)/.exec(z.prev) || /(\d+)/.exec(z.prev); if(p){ if(w && p[2]){ setCol(cols[0], Number(p[1])); setCol(cols[1], Number(p[2])); } else setCol(cols[w ? 1 : 0], Number(p[1])); } }
    if(q === 'first' && prev){ if(w) setCol(cols[0], prev.kg || 0); setCol(cols[w ? 1 : 0], prev.reps); }
    if(q === 'plus' && w) setCol(cols[0], readCol(cols[0]) + big);
  });
  bg.querySelector('#wOk').onclick = ()=>{ if(w){ z.kg = readCol(cols[0]); z.reps = readCol(cols[1]); } else z.reps = readCol(cols[0]);
    // 뒤 세트가 아직 안 한 세트면 같은 값으로 따라가게
    for(let j = i + 1; j < it.sets.length; j++) if(!it.sets[j].done){ if(w) it.sets[j].kg = z.kg; it.sets[j].reps = z.reps; }
    putSession(s); bg.remove(); renderSession(); };
}

// 완료 (1·2·3 섞은 화면)
let lastDone = null;
async function finishSession(){
  const s = getSession(); if(!s) return;
  const doneSets = s.items.reduce((a, x)=> a + x.sets.filter((z)=> z.done).length, 0);
  if(!doneSets){ toast('완료한 세트가 아직 없어요. 세트 칸을 체크해 주세요!'); return; }
  const left = s.items.filter((x)=> !x.sets.every((z)=> z.done)).length;
  if(left && !confirm('아직 ' + left + '개 운동이 남았어요. 오늘 운동을 마칠까요?')) return;
  await loadMyLogs();
  const items = s.items.map((x)=> ({ t: x.t, n: x.n, kind: x.kind, unit: x.unit, sets: x.sets.filter((z)=> z.done).map((z)=> ({ kg: weighted(x.kind) ? Number(z.kg) || 0 : null, reps: Number(z.reps) || 0 })) })).filter((x)=> x.sets.length);
  const kg = Math.round(items.reduce((a, x)=> a + x.sets.reduce((b, z)=> b + (z.kg || 0) * (x.unit === '초' ? 0 : z.reps), 0), 0));
  const minutes = Math.max(1, Math.round((Date.now() - s.start) / 60000));
  // 성장 알림: 지난 기록보다 무거워진 운동, 처음 도전한 띠
  let grow = '';
  for(const x of items){ if(!weighted(x.kind)) continue; const mx = Math.max(...x.sets.map((z)=> z.kg || 0)); let best = null;
    for(const l of myLogs) for(const y of (l.items || [])) if(y.n === x.n) for(const z of (y.sets || [])) if(z.kg != null) best = best == null ? z.kg : Math.max(best, z.kg);
    if(best != null && mx > best){ grow = x.n + ' +' + (Math.round((mx - best) * 10) / 10) + 'kg!'; break; } }
  if(!grow && s.belt !== myBeltKey() && !myLogs.some((l)=> l.belt === s.belt)) grow = wBelt(s.belt).name + ' 첫 도전!';
  const rec = { uid: auth.currentUser.uid, memberId: me.id, name: me.name || '', nickname: me.nickname || '', total: Number(me.total) || 0, myBelt: myBeltKey(), belt: s.belt, prog: s.prog, date: today(),
    items, exDone: s.items.filter((x)=> x.sets.length && x.sets.every((z)=> z.done)).length, exTotal: s.items.length, sets: doneSets, kg, minutes, grow, cheer: false, createdAt: serverTimestamp() };
  const btn = document.getElementById('finish'); if(btn) btn.disabled = true;
  try{ const ref = doc(collection(db, 'workout_logs')); await setDoc(ref, rec); myLogs.unshift(Object.assign({ id: ref.id }, rec, { createdAt: { seconds: Date.now() / 1000 } })); }
  catch(e){ console.warn(e); toast('저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'); if(btn) btn.disabled = false; return; }
  putSession(null); clearInterval(restT); restT = null;
  lastDone = rec; go('done');
}
function doneHero(r){
  const d = new Date(r.date + 'T12:00:00+09:00'), wd = '일월화수목금토'[d.getUTCDay()];
  const st = [[r.exDone + '/' + r.exTotal, '운동'], [r.sets, '세트'], [r.kg.toLocaleString(), 'kg 들었어요'], [r.minutes, '분']];
  return '<div style="background:' + B + ';color:#fff;padding:22px 22px;border-radius:0 0 28px 28px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between"><img src="./logo-white.png" alt="RUN N FIT" style="width:120px"><span style="font-size:13px;opacity:.85">' + dotDate(r.date) + ' (' + wd + ')</span></div>' +
    '<div style="text-align:center;margin-top:20px"><span style="width:56px;height:56px;border-radius:16px;background:var(--y);display:inline-flex;align-items:center;justify-content:center">' + CHK(B, 30) + '</span>' +
    '<div style="font-size:25px;font-weight:900;margin-top:10px">오늘 운동 완료! 짱!</div><div style="font-size:13px;opacity:.85;margin-top:4px"><b style="color:var(--y)">' + wBelt(r.belt).name + ' ' + r.prog + '</b> · ' + WPROG[r.prog] + ' · ' + r.total + '번째 출석</div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px">' + st.map(([v, l])=> '<div style="border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.12)"><b style="font-size:22px">' + v + '</b><div style="font-size:12px;opacity:.8">' + l + '</div></div>').join('') + '</div>' +
    (r.grow ? '<div style="margin-top:10px;background:rgba(255,213,74,.16);border-radius:10px;padding:9px 12px;font-size:13px"><b style="color:var(--y)">' + esc(r.grow) + '</b> ' + (/kg!$/.test(r.grow) ? '지난번보다 무거워졌어요' : '멋진 도전이에요') + '</div>' : '') + '</div>';
}
function itemList(r){
  return r.items.map((x)=> '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #F0F2F7">' + tagHtml(x.t) + '<b style="font-size:13.5px;flex:1">' + esc(x.n) + '</b><span style="font-size:12.5px;color:#4B5563">' +
    (x.sets[0].kg != null ? x.sets[0].kg + 'kg × ' + x.sets[0].reps : x.sets[0].reps + (x.unit || '회')) + ' · ' + x.sets.length + '세트</span></div>').join('');
}
function renderDone(){
  const r = lastDone; if(!r){ go('home'); return; }
  $app.innerHTML = doneHero(r) +
    '<div class="m" style="display:flex;gap:8px"><button type="button" class="btn" data-go="home" style="flex:1;background:#E3E9FF;color:' + B + '">홈으로</button><button type="button" class="btn" id="share" style="flex:1.3">이 화면 공유하기</button></div>' +
    '<div class="card m" style="padding:4px 14px"><div style="font-size:13px;font-weight:900;padding:8px 0 4px">오늘 한 운동</div>' + itemList(r) + '</div><div style="height:18px"></div>';
  document.getElementById('share').onclick = ()=> shareDone(r);
}
async function shareDone(r){
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const F = (w, s)=> w + ' ' + s + "px 'Noto Sans KR', sans-serif";
  g.fillStyle = B; g.fillRect(0, 0, W, H);
  const logo = await new Promise((res)=>{ const im = new Image(); im.onload = ()=> res(im); im.onerror = ()=> res(null); im.src = './logo-white.png'; });
  if(logo) g.drawImage(logo, 80, 80, 330, 330 * logo.height / logo.width);
  const d = new Date(r.date + 'T12:00:00+09:00');
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = F(500, 38); g.textAlign = 'right'; g.fillText(dotDate(r.date) + ' (' + '일월화수목금토'[d.getUTCDay()] + ')', W - 80, 125);
  g.textAlign = 'center'; g.fillStyle = '#FFD54A'; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 75, 230, 150, 150, 40) : g.rect(W / 2 - 75, 230, 150, 150); g.fill();
  g.strokeStyle = B; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 38, 308); g.lineTo(W / 2 - 10, 336); g.lineTo(W / 2 + 42, 280); g.stroke();
  g.fillStyle = '#fff'; g.font = F(900, 92); g.fillText('오늘 운동 완료! 짱!', W / 2, 500);
  g.font = F(500, 38); g.fillStyle = '#FFD54A'; g.fillText(wBelt(r.belt).name + ' ' + r.prog + ' · ' + WPROG[r.prog] + ' · ' + r.total + '번째 출석', W / 2, 570);
  const st = [[r.exDone + '/' + r.exTotal, '운동'], [String(r.sets), '세트'], [r.kg.toLocaleString(), 'kg 들었어요'], [String(r.minutes), '분']];
  st.forEach(([v, l], i)=>{ const x = 80 + (i % 2) * 470, y = 640 + Math.floor(i / 2) * 230; g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, 450, 200, 32) : g.rect(x, y, 450, 200); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = F(900, 80); g.fillText(v, x + 40, y + 105); g.font = F(500, 34); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(l, x + 40, y + 160); });
  if(r.grow){ g.fillStyle = 'rgba(255,213,74,.16)'; g.beginPath(); g.roundRect ? g.roundRect(80, 1130, W - 160, 110, 28) : g.rect(80, 1130, W - 160, 110); g.fill(); g.textAlign = 'center'; g.font = F(900, 40); g.fillStyle = '#FFD54A'; g.fillText(r.grow, W / 2, 1200); }
  const blob = await new Promise((res)=> c.toBlob(res, 'image/png'));
  const file = new File([blob], 'runnfit-' + r.date + '.png', { type: 'image/png' });
  try{ if(navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: '런앤핏 오늘 운동 완료!' }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); toast('사진을 저장했어요. 인스타에 올려 보세요!');
}

// 미션 탭 · 내 운동 (K1): 도장판에 A·B·C, 날짜 누르면 기록, 운동별 성장
async function paintMyWod(){
  const box = document.getElementById('myWod'); if(!box) return;
  await loadMyLogs();
  const byDay = {}; (myLogs || []).forEach((l)=>{ (byDay[l.date] = byDay[l.date] || []).push(l); });
  document.querySelectorAll('[data-day]').forEach((cell)=>{ const ls = byDay[cell.dataset.day]; if(!ls) return;
    cell.style.cursor = 'pointer'; cell.style.flexDirection = 'column'; cell.style.lineHeight = '1.05';
    if(!cell.querySelector('.wl')) cell.insertAdjacentHTML('beforeend', '<i class="wl" style="font-style:normal;font-size:9px;font-weight:900;color:#FFD54A">' + ls.map((l)=> l.prog).join('') + '</i>');
    if(cell.dataset.day === wodSel) cell.style.outline = '3px solid #FFD54A'; else cell.style.outline = '';
    cell.onclick = ()=>{ wodSel = cell.dataset.day; paintMyWod(); }; });
  if(!myLogs.length){ box.innerHTML = '<div class="card m" style="padding:14px;font-size:13.5px;line-height:1.6;color:#374151"><b style="color:' + B + '">아직 운동 기록이 없어요</b><br>홈의 \'이번 주 런앤핏 운동 프로그램\'에서 운동을 시작하면 여기에 쌓여요!</div>'; return; }
  if(!wodSel || !byDay[wodSel]) wodSel = myLogs[0].date;
  const dl = byDay[wodSel];
  const dayHtml = dl.map((r)=> '<div class="m" style="background:' + B + ';color:#fff;border-radius:14px;padding:12px 14px"><div style="display:flex;justify-content:space-between;font-size:12.5px;gap:8px"><b><span style="color:var(--y)">' + dotDate(r.date).slice(5) + '</span> · ' + wBelt(r.belt).name + ' ' + r.prog + '</b><span style="opacity:.85">' + r.minutes + '분 · ' + (r.kg || 0).toLocaleString() + 'kg</span></div>' +
    (r.cheer ? '<div style="margin-top:6px;background:rgba(255,213,74,.16);border-radius:8px;padding:6px 10px;font-size:12.5px"><b style="color:var(--y)">런앤핏이 응원해요!</b> 오늘도 정말 잘했어요</div>' : '') +
    '<div style="margin-top:6px">' + r.items.map((x)=> '<div style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:3px 0">' + tagHtml(x.t).replace('background:' + B + ';color:#fff', 'background:#fff;color:' + B) + '<span style="flex:1">' + esc(x.n) + '</span><span style="opacity:.85">' + (x.sets[0].kg != null ? x.sets[0].kg + '×' + x.sets[0].reps : x.sets[0].reps + (x.unit || '회')) + ' · ' + x.sets.length + '</span></div>').join('') + '</div></div>').join('');
  // 운동별 성장: 처음 무게 → 최근 무게, 최고 기록
  const g = {}; [...myLogs].reverse().forEach((l)=> (l.items || []).forEach((x)=>{ if(!x.sets || x.sets[0].kg == null) return; const mx = Math.max(...x.sets.map((z)=> z.kg || 0));
    const o = g[x.n] = g[x.n] || { t: x.t, first: mx, last: mx, best: mx }; o.last = mx; o.best = Math.max(o.best, mx); }));
  const grows = Object.entries(g).sort((a, b)=> (b[1].last - b[1].first) - (a[1].last - a[1].first)).slice(0, 8);
  box.innerHTML = '<div class="m" style="font-size:14px;font-weight:900">' + dotDate(wodSel).slice(5) + ' 운동 기록 <span style="font-size:12px;color:var(--muted);font-weight:500">· 날짜를 누르면 그날 기록</span></div>' + dayHtml +
    (grows.length ? '<div class="card m" style="padding:12px 14px"><b style="font-size:14px">운동별 성장</b>' + grows.map(([n, o])=> '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #F0F2F7;font-size:13px">' + tagHtml(o.t) + '<b style="flex:1">' + esc(n) + '</b><span style="color:var(--muted)">' + o.first + 'kg</span><span style="color:' + B + ';font-weight:900">→ ' + o.last + 'kg</span>' + (o.last >= o.best && o.last > o.first ? '<span style="background:#FFF4CC;color:#5B4300;font-size:10.5px;font-weight:900;border-radius:4px;padding:0 5px">최고</span>' : '') + '</div>').join('') + '</div>' : '') +
    '<div style="height:12px"></div>';
  // 응원 받은 기록 알림 (한 번만)
  const seen = JSON.parse(localStorage.getItem('rfWod.cheerSeen') || '[]'); const nw = myLogs.filter((l)=> l.cheer && !seen.includes(l.id));
  if(nw.length){ toast('런앤핏이 ' + dotDate(nw[0].date).slice(5) + ' 운동을 응원했어요! 💙'); localStorage.setItem('rfWod.cheerSeen', JSON.stringify(seen.concat(nw.map((l)=> l.id)).slice(-100))); }
}


// ---------- 머신 마스터 (회원이 직접 체크 · 23개 다 할 때까지 홈에 보임) ----------
const MACHINES = [['01', '레그프레스(머신)'], ['02', '이너타이'], ['03', '레그컬'], ['04', '레그익스텐션'], ['05', '몬스터글루트'], ['06', '롱풀'], ['07', '어시스트 풀업'], ['08', '랫풀다운'], ['09', '시티드로우'], ['10', '와이드풀다운'], ['11', '팩덱플라이'], ['12', '체스트프레스'], ['13', '암컬'], ['14', '숄더프레스'], ['15', '싯업보드'], ['16', '백익스텐션'], ['17', '인클라인 벤치프레스'], ['18', '벤치프레스'], ['19', '레그프레스'], ['20', '브이스쿼트'], ['21', '케이블'], ['22', '스미스머신'], ['23', '랙']];
const myMachines = ()=> Array.isArray(me.machines) ? me.machines.filter((n)=> MACHINES.some((m)=> m[0] === n)) : [];
function masterBar(n, dark){ return '<div style="height:8px;border-radius:4px;background:' + (dark ? 'rgba(255,255,255,.2)' : '#E9EEF6') + ';margin-top:8px;overflow:hidden"><i style="display:block;height:100%;width:' + (n / MACHINES.length * 100) + '%;background:' + (dark ? 'var(--y)' : B) + '"></i></div>'; }
function masterHomeCard(){
  const n = myMachines().length; if(n >= MACHINES.length || (Number(me.total) || 0) >= 30) return '';   // 흰 띠 · 노란 띠만
  return '<div class="m" style="background:' + B + ';color:#fff;border-radius:14px;padding:14px 16px">' +
    '<div style="font-size:12px;font-weight:700;color:var(--y)">머신 마스터</div>' +
    '<div style="font-size:17px;font-weight:900;margin-top:4px">센터 머신 ' + MACHINES.length + '개, 하나씩 내 것으로!</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span style="opacity:.9">런앤핏 머신에는 번호가 붙어있어요</span><b style="color:var(--y)">' + n + ' / ' + MACHINES.length + '</b></div>' + masterBar(n, true) +
    '<button type="button" data-go="master" style="width:100%;margin-top:12px;height:44px;border:0;border-radius:10px;background:#fff;color:' + B + ';font-weight:900;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;font-family:inherit">머신 마스터 체크하기 ' + ARROW + '</button></div>';
}
let masterSave = null;
function renderMaster(){
  const have = new Set(myMachines()), n = have.size, all = n >= MACHINES.length;
  const tiles = MACHINES.map(([no, nm])=>{ const on = have.has(no);
    return '<button type="button" data-mc="' + no + '" aria-pressed="' + on + '" style="height:78px;border:0;border-radius:12px;padding:8px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;text-align:left;font-family:inherit;cursor:pointer;' +
      (on ? 'background:' + B + ';color:#fff' : 'background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px #D5DCE8') + '"><span style="display:flex;justify-content:space-between;width:100%"><b style="font-size:13px">' + no + '</b>' + (on ? CHK('#FFD54A', 15) : '') + '</span><span style="font-size:11.5px;font-weight:700;line-height:1.25">' + nm + '</span></button>'; }).join('');
  $app.innerHTML = topbar('머신 마스터') +
    '<div class="card m" style="padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px">' + (all ? '머신 마스터 완료! 짱!' : '내 머신 마스터') + '</b><span><b style="font-size:22px;color:' + B + '">' + n + '</b><span style="color:var(--muted)"> / ' + MACHINES.length + '</span></span></div>' + masterBar(n) +
      '<div style="font-size:12.5px;color:#374151;margin-top:8px;line-height:1.6">할 줄 아는 머신은 체크! 모르는 건 코치님께 배우고 체크해요.</div></div>' +
    '<div class="m" style="font-size:12px;color:var(--muted)">눌러서 체크 · 한 번 더 누르면 취소</div>' +
    '<div class="m" style="margin-top:8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">' + tiles + '</div>' +
    '<div class="m" style="background:#E3E9FF;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px"><span style="flex:1;font-size:13.5px;color:' + B + ';font-weight:700;line-height:1.5">모르는 건 언제든 코치님께 물어보세요!</span><button type="button" id="mcHelp" style="border:0;background:' + B + ';color:#fff;border-radius:9px;padding:8px 12px;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer;white-space:nowrap">1:1 운동가이드 받기</button></div>' +
    '<div style="height:18px"></div>';
  document.getElementById('mcHelp').onclick = ()=>{ helpKind = 'guide'; go('help'); };
  $app.querySelectorAll('[data-mc]').forEach((b)=> b.onclick = ()=>{
    const no = b.dataset.mc, list = myMachines(), was = list.length;
    me.machines = list.includes(no) ? list.filter((x)=> x !== no) : list.concat(no).sort();
    const y = window.scrollY; renderMaster(); window.scrollTo(0, y);
    if(me.machines.length >= MACHINES.length && was < MACHINES.length) toast('머신 마스터 완료! 짱! 런앤핏이 함께 축하해요 💙');
    clearTimeout(masterSave);
    masterSave = setTimeout(()=> updateDoc(doc(db, 'members', me.id), { machines: me.machines, machinesAt: serverTimestamp() }).catch((e)=>{ console.warn(e); toast('저장하지 못했어요. 잠시 후 다시 눌러 주세요.'); }), 700);
  });
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
