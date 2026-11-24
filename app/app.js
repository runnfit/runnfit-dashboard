// 런앤핏 회원앱 (1단계)
// - 휴대폰 문자 인증으로 로그인 → 서버(runnfit-member)의 내 회원 정보만 읽는다
// - 회원 정보는 직원 대시보드가 다짐에서 읽어 보내준다 (출석은 바로, 회원권·홀딩은 10분 안에)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, limit, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc, writeBatch, increment, startAfter, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
  const active = (me.gymExp && me.gymExp >= today()) || (me.holdEnd && me.holdEnd >= today()) || STAFF_PH.includes(user.phoneNumber) || COACH_PH.includes(user.phoneNumber) || me.staff === true;
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
  if(t === 'pixel'){ location.href = './gym/?t=' + Date.now(); return; }
  $tabs.classList.remove('hidden'); $app.classList.remove('nonav');
  const active = { master: 'home', wod: 'home', session: 'home', done: 'home', help: 'home', home: 'home', challenge: 'me', workout: 'me', voice: 'voice', me: 'me', community: 'community', write: 'community', post: 'community' }[t];
  $tabs.querySelectorAll('button').forEach((b)=> b.classList.toggle('on', b.dataset.tab === active));
  ({ master: renderMaster, wod: renderWod, session: renderSession, done: renderDone, help: renderHelp, home: renderHome, challenge: renderChallenge, workout: renderWorkout, voice: renderVoice, me: renderMe, community: renderCommunity, write: renderWrite, post: renderPost })[t]();
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
    left = '<div class="card" data-go="challenge" role="button" style="padding:12px 10px;text-align:center;cursor:pointer"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + FLAG + '첫 30일 출석 도전</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:8px"><span class="pxf" style="font-size:20px">' + f30.visits + '</span><span style="font-size:13px;font-weight:700;color:var(--muted)">/ 12회</span></div>' +
      '<div class="grid12" style="margin-top:8px">' + bar + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5">30일 ' + f30.visits + '회 출석<br><b style="color:var(--ink)">' + (f30.visits >= goal ? '도전 성공! 🎉' : '목표까지 ' + (goal - f30.visits) + '회') + '</b></div></div>';
  } else {
    const w = weekInfo(), goal = w.goal, n = w.n, slots = goal || 7;
    const bar = Array.from({ length: slots }, (_, i)=> '<div class="seg ' + (i < n ? 'on' : '') + '"></div>').join('');
    left = '<div class="card" data-go="challenge" role="button" style="padding:12px 10px;text-align:center;cursor:pointer"><div style="display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-weight:700">' + FLAG + '이번 주 출석</div>' +
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
  const gb = document.getElementById('goalBtn'); if(gb) gb.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); changeGoal(); };
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
const WPROG = { A: '하체 중심 전신운동', B: '당기기 중심 전신운동', C: '밀기 중심 전신운동' };
const PN = { A: '1회차', B: '2회차', C: '3회차' }, pn = (p)=> PN[p] || p || '';
// 11월 셋째 주 (센터 모니터판과 같은 내용). 직원 관리 화면에서 매주 바꾸면 wods/current 가 이걸 덮어씀
const DEFAULT_WOD = { start: '2026-11-23', end: '2026-11-29', rev: '2026-11-24T23:40:00+09:00', programs: {
  노: { A: [['01', '레그프레스'], ['맨몸', '힙힌지'], ['03', '레그컬'], ['08', '랫풀다운'], ['12', '체스트프레스'], ['코어', '크런치', '15회×3'], ['체력', '스텝박스 기본 스텝', '20회×3']],
        B: [['08', '랫풀다운'], ['09', '시티드로우'], ['13', '암컬'], ['14', '숄더프레스'], ['맨몸', '스쿼트'], ['코어', '레그레이즈', '15회×3'], ['체력', '제자리 피칭', '30초×3']],
        C: [['12', '체스트프레스'], ['14', '숄더프레스'], ['맨몸', '무릎 푸시업'], ['06', '롱풀'], ['01', '레그프레스'], ['코어', '플랭크', '30초×3'], ['체력', '스텝박스 사이드 스텝', '20회×3']] },
  파: { A: [['덤벨', '덤벨 스쿼트'], ['KB', '케틀벨 데드리프트'], ['04', '레그익스텐션'], ['09', '시티드로우'], ['12', '체스트프레스'], ['코어', '크런치', '15회×3'], ['체력', '점핑잭', '30회×3']],
        B: [['07', '어시스트 풀업'], ['06', '롱풀'], ['13', '암컬'], ['덤벨', '덤벨 숄더프레스'], ['KB', '케틀벨 데드리프트'], ['코어', '레그레이즈', '15회×3'], ['체력', '스텝박스 교차 스텝', '20회×3']],
        C: [['18', '덤벨 벤치프레스'], ['덤벨', '덤벨 숄더프레스'], ['21', '케이블 푸시다운'], ['10', '와이드 풀다운'], ['20', 'V스쿼트'], ['코어', '플랭크', '40초×3'], ['체력', '마운틴클라이머', '20회×3']] },
  빨: { A: [['23', '바벨 백스쿼트'], ['덤벨', '덤벨 루마니안 데드리프트'], ['03', '레그컬'], ['08', '랫풀다운'], ['18', '덤벨 벤치프레스'], ['코어', '크런치', '20회×4'], ['체력', '스텝업', '20회×3']],
        B: [['맨몸', '풀업'], ['바벨', '바벨 벤트오버로우'], ['21', '케이블 페이스풀'], ['덤벨', '덤벨 암컬'], ['20', 'V스쿼트'], ['코어', '레그레이즈', '20회×4'], ['체력', '버피', '10회×3']],
        C: [['18', '바벨 벤치프레스'], ['덤벨', '덤벨 숄더프레스'], ['덤벨', '덤벨 사이드 레터럴 레이즈'], ['21', '케이블 푸시다운'], ['19', '레그프레스'], ['코어', '플랭크', '50초×3'], ['체력', 'A스킵', '30초×3']] },
  검: { A: [['23', '바벨 백스쿼트'], ['바벨', '바벨 루마니안 데드리프트'], ['덤벨', '덤벨 불가리안 스플릿 스쿼트'], ['19', '레그프레스'], ['03', '레그컬'], ['코어', '크런치', '20회×4'], ['체력', '스쿼트 점프', '10회×3']],
        B: [['맨몸', '풀업'], ['바벨', '바벨 벤트오버로우'], ['09', '시티드로우'], ['21', '케이블 리어델트 플라이'], ['덤벨', '덤벨 해머컬'], ['코어', '레그레이즈', '20회×4'], ['체력', '버피', '15회×3']],
        C: [['18', '바벨 벤치프레스'], ['17', '덤벨 인클라인 벤치프레스'], ['14', '숄더프레스'], ['덤벨', '덤벨 사이드 레터럴 레이즈'], ['21', '케이블 오버헤드 익스텐션'], ['코어', '플랭크', '60초×3'], ['체력', '마운틴클라이머', '40회×3']] },
} };
const wodNewer = (w, d)=> (w.start || '') > d.start || ((w.start || '') === d.start && w.updatedAt && w.updatedAt.seconds * 1000 > Date.parse(d.rev));
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
  try{ const s = await getDoc(doc(db, 'wods', 'current')); if(s.exists() && s.data().programs && wodNewer(s.data(), DEFAULT_WOD)) { WOD = normWod(s.data()); return WOD; } }catch(e){}
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
  const st = t === '체력' ? 'background:#FFD54A;color:#3A2A00' : t === '코어' ? 'background:#E3E9FF;color:' + B : /^\d+$/.test(t) ? 'background:' + B + ';color:#fff' : 'background:#fff;color:#6B7280;box-shadow:inset 0 0 0 1px #D5DCE8';
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
      (s ? wBelt(s.belt).name + ' ' + pn(s.prog) + ' 이어서 하기 ' : '이번 주 운동 프로그램 보기 ') + ARROW + '</button></div>';
}
function bindWodHome(){
  const b = document.getElementById('wodGo'); if(!b) return;
  b.onclick = ()=> go(getSession() ? 'session' : 'wod');
  if(!WOD) loadWod().then(()=>{ const r = document.getElementById('wodRange'); if(r) r.textContent = wodRange(); });
}

const GUIDE = [['워밍업', '점핑잭 15~20회 × 3세트 + 관절 스트레칭'], ['반복', '10~15회'], ['세트', '3~5세트'], ['휴식', '60~90초'], ['고중량', '휴식 2~3분']];
const guideHtml = ()=> '<div class="m" style="margin-top:12px;background:#fff;border-radius:12px;box-shadow:inset 0 0 0 2px ' + B + ';overflow:hidden">' +
  '<div style="background:' + B + ';color:#fff;padding:7px 12px;display:flex;align-items:baseline;gap:6px"><b style="font-size:13.5px">운동 가이드</b><span style="font-size:11px;color:var(--y);font-weight:700">모든 띠 공통</span></div>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;padding:10px 12px 4px">' + GUIDE.map((g, i)=> '<div style="display:flex;gap:6px;align-items:baseline;font-size:13px' + (i === 0 ? ';grid-column:1 / -1' : '') + '"><b style="color:' + B + ';flex:none">' + g[0] + '</b><b style="color:var(--ink)">' + g[1] + '</b></div>').join('') + '</div>' +
  '<div style="padding:4px 12px 10px;font-size:12px;color:var(--muted);font-weight:700">기구가 비어 있는 운동부터 해도 OK!</div></div>';
const BINFO = { 노: ['10~29회', '머신 중심의 기본 움직임 학습', '운동 기초', '기초 전신운동 · 머신 4 + 맨몸 1'], 파: ['30~49회', '다양한 운동 학습 및 운동 능력 향상', '운동 숙련', '응용 전신운동 · 머신 3 + 프리웨이트 2'],
  빨: ['50~99회', '부위별 운동량 증가 및 근육 발달', '근육 성장', '부위별 강조운동 · 머신 2 + 프리웨이트 3'], 검: ['100회 이상', '하체·당기기·밀기 부위별 집중', '운동 심화', '3분할 운동 · 해당 부위 5종목 집중'] };
const beltInfo = (k)=>{ const b = wBelt(k), i = BINFO[k]; if(!i) return ''; return '<div class="m" style="margin-top:8px;background:' + b.bg + ';color:' + b.fg + ';border-radius:12px;padding:10px 12px">' +
  '<div style="font-size:12.5px;font-weight:700;opacity:.9">' + i[0] + ' · ' + i[1] + '</div>' +
  '<div style="display:flex;align-items:center;gap:7px;margin-top:5px;font-size:13.5px;font-weight:900"><span style="background:' + (k === '노' ? '#fff' : 'rgba(255,255,255,.18)') + ';border-radius:6px;padding:1px 7px;font-size:12px">' + i[2] + '</span>' + i[3] + '</div></div>'; };
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
      '<div style="display:flex;align-items:center;gap:10px"><b style="width:34px;height:34px;border-radius:8px;background:' + B + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-style:italic">' + p.replace('A', '1').replace('B', '2').replace('C', '3') + '</b><b style="font-size:15px">' + WPROG[p] + '</b></div>' +
      '<div style="margin-top:6px">' + items.map((it)=> '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:14px">' + tagHtml(it.t) + '<span style="flex:1">' + esc(it.n) + '</span>' + (it.x ? '<span style="font-size:12.5px;color:' + B + ';font-weight:700">' + esc(it.x) + '</span>' : '') + '</div>').join('') + '</div>' +
      '<button type="button" data-start="' + p + '" class="btn' + (first ? '' : ' ghost') + '" style="width:100%;margin-top:8px;height:44px;font-size:14px' + (first ? '' : ';box-shadow:none;background:#E3E9FF') + '">' + pn(p) + ' 운동 시작하기</button></div>'; };
  $app.innerHTML = '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" data-go="home" aria-label="뒤로">' + BACK + '</button><div class="ttl">이번 주 운동 프로그램</div><span style="margin-left:auto;font-size:12px;color:var(--muted)">' + wodRange() + '</span></div>' +
    '<div class="m" style="font-size:13px;color:#4B5563;line-height:1.6"><b style="color:var(--ink)">내 띠는 추천!</b><br>다른 띠 프로그램도 자유롭게 도전해봐도 좋아요!<br>1 · 2 · 3회차 중 선택해서 진행해보세요!</div>' + guideHtml() +
    '<div class="m" style="margin-top:14px;display:flex;gap:4px;background:#fff;border-radius:12px;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' + tabs + '</div>' + beltInfo(wodBelt) +
    card('A', true) + card('B') + card('C') +
    '<div style="height:18px"></div>';
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
  if(old && !confirm('하던 운동(' + wBelt(old.belt).name + ' ' + pn(old.prog) + ')이 있어요. 새로 시작할까요?')){ go('session'); return; }
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
  $app.innerHTML = '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" id="sBack" aria-label="뒤로">' + BACK + '</button><div class="ttl" style="font-size:17px">' + bl.name + ' ' + pn(s.prog) + ' · ' + WPROG[s.prog] + '</div><span style="margin-left:auto;font-size:12.5px;color:' + B + ';font-weight:900;white-space:nowrap">' + nDone + ' / ' + s.items.length + ' 완료</span></div>' +
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
    '<div style="font-size:25px;font-weight:900;margin-top:10px">오늘 운동 완료! 짱!</div><div style="font-size:13px;opacity:.85;margin-top:4px"><b style="color:var(--y)">' + wBelt(r.belt).name + ' ' + pn(r.prog) + '</b> · ' + WPROG[r.prog] + ' · ' + r.total + '번째 출석</div></div>' +
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
    '<div class="m"><button type="button" class="btn" id="owBtn" style="width:100%;height:54px;background:var(--y);color:' + B + ';font-size:16px">📸 오운완 인증 올리기</button></div>' +
    '<div class="m" style="display:flex;gap:8px"><button type="button" class="btn" data-go="home" style="flex:1;background:#E3E9FF;color:' + B + '">홈으로</button><button type="button" class="btn" id="share" style="flex:1.3">이 화면 공유하기</button></div>' +
    '<div class="card m" style="padding:4px 14px"><div style="font-size:13px;font-weight:900;padding:8px 0 4px">오늘 한 운동</div>' + itemList(r) + '</div><div style="height:18px"></div>';
  document.getElementById('share').onclick = ()=> shareDone(r);
  document.getElementById('owBtn').onclick = ()=> startWrite(recFromLog(r));
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
  g.font = F(500, 38); g.fillStyle = '#FFD54A'; g.fillText(wBelt(r.belt).name + ' ' + pn(r.prog) + ' · ' + WPROG[r.prog] + ' · ' + r.total + '번째 출석', W / 2, 570);
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
    if(!cell.querySelector('.wl')) cell.insertAdjacentHTML('beforeend', '<i class="wl" style="font-style:normal;font-size:9px;font-weight:900;color:#FFD54A">' + ls.map((l)=> ({ A: '1', B: '2', C: '3' })[l.prog] || l.prog).join('') + '</i>');
    if(cell.dataset.day === wodSel) cell.style.outline = '3px solid #FFD54A'; else cell.style.outline = '';
    cell.onclick = ()=>{ wodSel = cell.dataset.day; paintMyWod(); }; });
  if(!myLogs.length){ box.innerHTML = '<div class="card m" style="padding:14px;font-size:13.5px;line-height:1.6;color:#374151"><b style="color:' + B + '">아직 운동 기록이 없어요</b><br>홈의 \'이번 주 런앤핏 운동 프로그램\'에서 운동을 시작하면 여기에 쌓여요!</div>'; return; }
  if(!wodSel || !byDay[wodSel]) wodSel = myLogs[0].date;
  const dl = byDay[wodSel];
  const dayHtml = dl.map((r)=> '<div class="m" style="background:' + B + ';color:#fff;border-radius:14px;padding:12px 14px"><div style="display:flex;justify-content:space-between;font-size:12.5px;gap:8px"><b><span style="color:var(--y)">' + dotDate(r.date).slice(5) + '</span> · ' + wBelt(r.belt).name + ' ' + pn(r.prog) + '</b><span style="opacity:.85">' + r.minutes + '분 · ' + (r.kg || 0).toLocaleString() + 'kg</span></div>' +
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
  $app.innerHTML = topbar('MY') +
    '<div class="card m" style="padding:16px;display:flex;gap:14px;align-items:center">' + AVATAR(52) + '<div><div style="font-size:18px;font-weight:900">' + esc(me.nickname || '-') + '</div><div class="muted" style="font-size:13px">' + esc(me.name) + ' · ' + ((Number(me.total) || 0) < 1 ? '띠 없음' : beltOf(me.total).name) + ' · 총 ' + (Number(me.total) || 0) + '회 출석</div></div></div>' +
    '<button type="button" data-go="challenge" class="m" style="display:flex;align-items:center;gap:12px;width:calc(100% - 44px);background:' + B + ';color:#fff;border:0;border-radius:14px;padding:14px 16px;text-align:left;font-family:inherit;cursor:pointer"><span style="flex:1"><span style="display:block;font-size:16px;font-weight:900">내 미션</span><span style="display:block;font-size:12px;opacity:.85;margin-top:2px">출석 도장판 · 내 운동 기록 · 목표</span></span><span style="color:var(--y);font-weight:900;font-size:18px">›</span></button>' +
    '<div class="card m" style="padding:6px 16px">' +
      '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #E5E7EB"><span class="muted">회원권</span><b>' + dotDate(me.gymExp) + '까지</b></div>' +
      (me.holdEnd && me.holdEnd >= today() ? '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #E5E7EB"><span class="muted">홀딩</span><b>' + dotDate(me.holdEnd) + '까지</b></div>' : '') +
      '<div style="display:flex;justify-content:space-between;padding:12px 0"><span class="muted">마지막 출석</span><b>' + dotDate(me.lastAttend) + '</b></div></div>' +
    '<div class="m" style="display:flex;flex-direction:column;gap:10px"><button class="btn ghost" id="nickBtn" type="button">닉네임 바꾸기</button><button class="btn ghost" id="outBtn" type="button" style="color:#B91C32;box-shadow:inset 0 0 0 2px #F3C2CA">로그아웃</button></div>' +
    '<div class="m muted" style="font-size:12px;text-align:center;line-height:1.6">수업 예약은 다짐 앱에서 할 수 있어요.<br>회원 정보는 센터에 등록된 정보로 자동 반영돼요.</div>';
  document.getElementById('nickBtn').onclick = askNickname;
  document.getElementById('outBtn').onclick = async ()=>{ await signOut(auth); };
}

// ---------- 커뮤니티 (오운완 인증) ----------
const STAFF_PH = ['+821096091607', '+821028774334', '+821041224441', '+821075563855'];
const COACH_PH = ['+821082522866', '+821091458865', '+821051015969'];
const myRole = ()=>{ const p = (auth.currentUser && auth.currentUser.phoneNumber) || ''; return STAFF_PH.includes(p) ? 'staff' : COACH_PH.includes(p) ? 'coach' : ''; };
const roleTag = (r)=> r === 'staff' ? '<span style="font-size:10.5px;font-weight:900;color:#fff;background:' + B + ';border-radius:4px;padding:1px 5px;margin-left:5px;vertical-align:1px">런앤핏</span>' : r === 'coach' ? '<span style="font-size:10.5px;font-weight:900;color:' + B + ';box-shadow:inset 0 0 0 1px ' + B + ';border-radius:4px;padding:1px 5px;margin-left:5px;vertical-align:1px">코치</span>' : '';
const CARD_NAMES = ['로고·날짜', '네이비 띠', '오운완!+칩', '큰 숫자', '흰 스티커', '에디토리얼', '센터', '글래스', '세로 레일'];
const cardOrder = (rec)=> rec ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 2, 4, 7, 6, 5];
let posts = [], postsLast = null, postsEnd = false, postSel = null, W8 = null;
const clapKey = ()=> 'rfClap.' + ((auth.currentUser && auth.currentUser.uid) || '');
const clapSet = ()=>{ try{ return new Set(JSON.parse(localStorage.getItem(clapKey()) || '[]')); }catch(e){ return new Set(); } };
const clapSave = (s)=>{ try{ localStorage.setItem(clapKey(), JSON.stringify([...s].slice(-500))); }catch(e){} };
function ago(ts){
  const sec = ts && ts.seconds ? Date.now() / 1000 - ts.seconds : 0;
  if(sec < 60) return '방금'; if(sec < 3600) return Math.floor(sec / 60) + '분 전'; if(sec < 86400) return Math.floor(sec / 3600) + '시간 전'; if(sec < 604800) return Math.floor(sec / 86400) + '일 전';
  const d = new Date(ts.seconds * 1000 + KST); return (d.getUTCMonth() + 1) + '.' + d.getUTCDate();
}
function beltDot(n){ const b = (Number(n) || 0) < 1 ? { bg: '#FFFFFF' } : beltOf(n); return '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + b.bg + ';box-shadow:inset 0 0 0 1.5px rgba(17,24,39,.22);margin-right:5px;vertical-align:1px"></span>'; }
function avHtml(nick, size){ size = size || 34; return '<span style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#E8EDF8;color:' + B + ';font-weight:900;font-size:' + Math.round(size * .4) + 'px;display:inline-flex;align-items:center;justify-content:center;flex:none">' + esc(String(nick || '회').slice(0, 1)) + '</span>'; }
async function loadPosts(reset){
  if(reset){ posts = []; postsLast = null; postsEnd = false; }
  if(postsEnd) return;
  try{
    const q = postsLast ? query(collection(db, 'posts'), orderBy('ts', 'desc'), startAfter(postsLast), limit(8)) : query(collection(db, 'posts'), orderBy('ts', 'desc'), limit(8));
    const s = await getDocs(q);
    if(s.docs.length) postsLast = s.docs[s.docs.length - 1];
    if(s.docs.length < 8) postsEnd = true;
    s.docs.forEach((d)=>{ if(!posts.some((p)=> p.id === d.id)) posts.push(Object.assign({ id: d.id }, d.data())); });
  }catch(e){ console.warn(e); postsEnd = true; }
}
function recBox(r){
  if(!r) return '';
  const head = r.beltName ? r.beltName + (r.prog ? ' ' + r.prog : '') + ' WOD' : '오늘의 운동';
  const items = (r.items || []).slice(0, 6).map((x)=> esc(x.n) + ' ' + (x.kg != null ? x.kg + 'kg × ' + x.reps : x.reps + '회') + ' · ' + x.sets + '세트').join('<br>');
  return '<div style="margin:10px 18px 0;background:#F4F7FB;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.65;color:#374151"><b style="color:' + B + '">' + esc(head) + '</b>' +
    (r.runKm || r.runMin ? '<div>🏃 러닝 ' + [r.runKm ? r.runKm + 'km' : '', r.runMin ? r.runMin + '분' : '', r.runKm && r.runMin ? (()=>{ const sec = Math.round(r.runMin * 60 / r.runKm); return Math.floor(sec / 60) + "'" + String(sec % 60).padStart(2, '0') + '"/km'; })() : ''].filter(Boolean).join(' · ') + '</div>' : '') + '<div>' + [r.exTotal ? r.exDone + '/' + r.exTotal + ' 운동' : '', r.sets ? r.sets + '세트' : '', r.kg ? Number(r.kg).toLocaleString() + 'kg' : '', r.minutes ? r.minutes + '분' : ''].filter(Boolean).join(' · ') + '</div>' + (items ? '<div style="margin-top:4px">' + items + '</div>' : '') + '</div>';
}
function postHtml(p, full){
  const uid = auth.currentUser && auth.currentUser.uid, mine = p.uid === uid, clapped = clapSet().has(p.id);
  const t = String(p.text || ''), cut = !full && t.length > 80;
  return '<div style="background:#fff;margin-bottom:10px;padding-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:9px;padding:12px 18px">' + avHtml(p.nick) + '<div style="flex:1;min-width:0"><div style="font-weight:900;font-size:14.5px">' + beltDot(p.belt) + esc(p.nick || '회원') + roleTag(p.role) + '</div><div style="font-size:11.5px;color:#8A94A8">' + ago(p.ts) + '</div></div>' +
    (mine || myRole() ? '<button type="button" data-pdel="' + p.id + '" aria-label="글 메뉴" style="background:none;border:0;font-size:20px;color:#9AA3B5;cursor:pointer;padding:4px 6px">⋯</button>' : '') + '</div>' +
    (p.img ? '<img src="' + p.img + '" alt="' + esc(p.nick || '') + '님의 오운완 사진" data-popen="' + p.id + '" style="width:100%;display:block;aspect-ratio:4/5;object-fit:cover;background:#1C2433;cursor:pointer">' : '') +
    (t ? '<div data-popen="' + p.id + '" style="padding:10px 18px 0;font-size:14px;line-height:1.6;white-space:pre-wrap;cursor:pointer">' + esc(cut ? t.slice(0, 80) : t) + (cut ? '<span style="color:#8A94A8">…더보기</span>' : '') + '</div>' : '') +
    (full ? recBox(p.rec) : '') +
    '<div style="display:flex;gap:8px;padding:10px 18px 0"><button type="button" data-clap="' + p.id + '" class="cmchip' + (clapped ? ' on' : '') + '">👏 박수 ' + (p.claps || 0) + '</button><button type="button" data-popen="' + p.id + '" class="cmchip">💬 댓글 ' + (p.cmts || 0) + '</button></div></div>';
}
function bindPosts(root){
  root.querySelectorAll('[data-popen]').forEach((el)=> el.onclick = ()=>{ postSel = posts.find((p)=> p.id === el.dataset.popen) || postSel; if(postSel) go('post'); });
  root.querySelectorAll('[data-clap]').forEach((el)=> el.onclick = ()=> toggleClap(el.dataset.clap));
  root.querySelectorAll('[data-pdel]').forEach((el)=> el.onclick = ()=> postMenu(el.dataset.pdel));
}
async function toggleClap(id){
  const p = posts.find((x)=> x.id === id) || (postSel && postSel.id === id ? postSel : null); if(!p) return;
  const s = clapSet(), on = !s.has(id), uid = auth.currentUser.uid;
  if(on) s.add(id); else s.delete(id); clapSave(s); p.claps = Math.max(0, (p.claps || 0) + (on ? 1 : -1));
  document.querySelectorAll('[data-clap="' + id + '"]').forEach((b)=>{ b.classList.toggle('on', on); b.textContent = '👏 박수 ' + p.claps; });
  if(on) burstClap();
  try{ const b = writeBatch(db); const cr = doc(db, 'posts', id, 'claps', uid);
    if(on) b.set(cr, { uid, nick: me.nickname || '', ts: serverTimestamp() }); else b.delete(cr);
    b.update(doc(db, 'posts', id), { claps: increment(on ? 1 : -1) }); await b.commit(); }catch(e){ console.warn(e); }
}
function burstClap(){ const el = document.createElement('div'); el.textContent = '👏'; el.style.cssText = 'position:fixed;left:50%;top:45%;font-size:64px;transform:translate(-50%,-50%) scale(.6);opacity:0;transition:all .45s;z-index:50;pointer-events:none'; document.body.appendChild(el); requestAnimationFrame(()=>{ el.style.opacity = '1'; el.style.transform = 'translate(-50%,-60%) scale(1.1)'; }); setTimeout(()=>{ el.style.opacity = '0'; }, 500); setTimeout(()=> el.remove(), 900); }
function postMenu(id){
  const bg = sheet('<div class="ttl">이 글을 지울까요?</div><div class="muted" style="font-size:13px;margin-top:6px">지운 글은 되돌릴 수 없어요.</div><button type="button" class="btn" id="pDelOk" style="width:100%;margin-top:14px;background:#B91C32">지우기</button>');
  bg.querySelector('#pDelOk').onclick = async ()=>{ try{ await deleteDoc(doc(db, 'posts', id)); posts = posts.filter((p)=> p.id !== id); bg.remove(); toast('지웠어요'); go('community'); }catch(e){ toast('지우지 못했어요. 잠시 후 다시 해주세요.'); } };
}
async function renderCommunity(){
  const n = notices[0];
  $app.innerHTML = '<div class="top"><div class="ttl" style="font-size:21px">커뮤니티</div></div>' +
    (n ? '<button type="button" id="cmNotice" class="m" style="display:flex;align-items:center;gap:10px;background:' + B + ';color:#fff;border:0;border-radius:14px;padding:11px 14px;text-align:left;font-family:inherit;cursor:pointer;width:calc(100% - 44px)"><span style="background:var(--y);color:' + B + ';font-size:11px;font-weight:900;border-radius:999px;padding:2px 8px;flex:none">공지</span><span style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(n.title || '') + '</span></button>' : '') +
    '<div id="cmChamp"></div>' +
    '<button type="button" id="cmWrite" class="card m" style="display:flex;align-items:center;gap:10px;border:0;padding:12px 14px;text-align:left;font-family:inherit;cursor:pointer;width:calc(100% - 44px)">' + avHtml(me.nickname || me.name) + '<span style="flex:1;color:#9AA3B5;font-size:14px">오늘 운동 인증해 볼까요?</span><span style="background:' + B + ';color:#fff;font-weight:900;font-size:13px;border-radius:999px;padding:8px 14px">📸 오운완</span></button>' +
    '<div id="feed" style="margin-top:14px"><div class="muted" style="text-align:center;padding:30px 0;font-size:13px">불러오는 중…</div></div><div id="feedMore" style="padding:4px 22px 10px"></div>';
  if(n) document.getElementById('cmNotice').onclick = ()=> showNotice(n);
  document.getElementById('cmWrite').onclick = ()=> startWrite(null);
  paintChamps();
  if(!posts.length) await loadPosts(true);
  if(tab !== 'community') return;
  paintFeed();
}
// 어제의 미니런앤핏 1등 (혼자 하기 미니게임)
const CHAMP_G = { run: ['🏃', '런관장 RUN!', false], inv: ['🍩', '칼로리 침공', false], snake: ['🍗', '단백질 냠냠', false], mole: ['🔨', '게으름 잡기', false], merge: ['🥏', '원판 합치기', false], dog: ['🐶', '복덩이 찾기', false], tower: ['🏋️', '원판 탑 쌓기', false], ten: ['⏱️', '런관장의 10초', true], locker: ['🔵', '몇 번 사물함?', false] };
let champCache = null;
async function paintChamps(){
  const box = document.getElementById('cmChamp'); if(!box) return;
  const yd = kstDate(Date.now() - 864e5);
  if(!champCache || champCache.day !== yd){
    try{ const sn = await getDocs(query(collection(db, 'gym_daily'), where('day', '==', yd), limit(500))); champCache = { day: yd, rows: sn.docs.map((d)=> d.data()) }; }catch(e){ champCache = { day: yd, rows: [] }; }
  }
  const fmt = (g, r)=> g === 'run' ? r.score + 'm' : g === 'inv' ? Number(r.score).toLocaleString() + 'kcal' : g === 'snake' ? r.score + 'g' : g === 'mole' ? r.score + '마리' : g === 'ten' ? (r.v / 1000).toFixed(2) + '초' : g === 'tower' ? r.score + '단' : g === 'dog' ? r.score + '마리' : g === 'merge' || g === 'desk' ? Number(r.score).toLocaleString() + '점' : r.score + '단계';
  const win = Object.keys(CHAMP_G).map((g)=>{ const L = champCache.rows.filter((r)=> r.g === g).sort((a, b)=> CHAMP_G[g][2] ? a.score - b.score : b.score - a.score); return L[0] ? [g, L[0]] : null; }).filter(Boolean);
  if(!win.length || !document.getElementById('cmChamp')) return;
  const d = new Date(Date.now() - 864e5 + KST);
  const ds = (d.getUTCMonth() + 1) + '.' + d.getUTCDate() + ' (' + '일월화수목금토'[d.getUTCDay()] + ')';
  box.innerHTML = '<div class="card m" style="padding:12px 14px">' +
    '<button type="button" id="chTg" style="all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:6px;cursor:pointer"><b style="color:' + B + ';font-size:15px">👑 어제의 미니런앤핏 1등</b><span style="font-size:11.5px;color:#8A94A8">' + ds + '</span><span style="margin-left:auto;font-size:12.5px;font-weight:800;color:' + B + '" id="chAr">' + win.length + '종목 보기 ▾</span></button>' +
    '<div id="chList" style="display:none;margin-top:6px">' + win.map(([g, r])=> '<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid #F0F2F7"><span>' + CHAMP_G[g][0] + ' ' + CHAMP_G[g][1] + '</span><b>' + esc(r.nick || '회원') + ' <span style="color:' + B + '">' + fmt(g, r) + '</span></b></div>').join('') + '</div>' +
    '<button type="button" class="cmchip" id="chGo" style="width:100%;margin-top:10px">🎮 나도 도전하기</button></div>';
  document.getElementById('chTg').onclick = ()=>{ const L = document.getElementById('chList'), on = L.style.display === 'none'; L.style.display = on ? 'block' : 'none'; document.getElementById('chAr').textContent = on ? '접기 ▴' : win.length + '종목 보기 ▾'; };
  document.getElementById('chGo').onclick = ()=> go('pixel');
}
function paintFeed(){
  const f = document.getElementById('feed'); if(!f) return;
  f.innerHTML = posts.length ? posts.map((p)=> postHtml(p, false)).join('') : '<div class="card m" style="padding:22px;text-align:center;font-size:14px;line-height:1.6"><b style="color:' + B + '">첫 오운완의 주인공이 되어 보세요!</b><br><span class="muted">운동 사진 한 장이면 충분해요</span></div>';
  bindPosts(f);
  const m = document.getElementById('feedMore');
  m.innerHTML = postsEnd ? '' : '<button type="button" class="btn ghost" id="moreBtn" style="width:100%">더 보기</button>';
  if(!postsEnd) document.getElementById('moreBtn').onclick = async ()=>{ await loadPosts(false); paintFeed(); };
}
async function renderPost(){
  const p = postSel; if(!p){ go('community'); return; }
  $app.innerHTML = '<div class="top" style="justify-content:flex-start;gap:6px;padding-left:12px"><button class="back" type="button" data-go="community" aria-label="뒤로">' + BACK + '</button><div class="ttl">오운완</div></div><div style="margin-top:10px" id="pOne">' + postHtml(p, true) + '</div>' +
    '<div style="background:#fff;padding:4px 0 8px" id="cmts"><div class="muted" style="padding:14px 18px;font-size:13px">댓글 불러오는 중…</div></div><div style="height:70px"></div>' +
    '<div style="position:fixed;left:0;right:0;bottom:calc(68px + env(safe-area-inset-bottom));z-index:5"><div style="max-width:480px;margin:0 auto;background:#fff;border-top:1px solid #E5E9F2;padding:9px 14px;display:flex;gap:8px;align-items:center">' +
    '<button type="button" data-clap="' + p.id + '" aria-label="박수 보내기" style="background:none;border:0;font-size:24px;cursor:pointer">👏</button><input id="cmIn" maxlength="300" placeholder="따뜻한 응원 한마디 남기기" style="flex:1;height:42px;border:0;background:#F4F7FB;border-radius:999px;padding:0 14px;font-size:15px;font-family:inherit"><button type="button" id="cmGo" style="background:none;border:0;color:' + B + ';font-weight:900;font-size:14.5px;cursor:pointer">등록</button></div></div>';
  bindPosts(document.getElementById('pOne'));
  document.querySelector('[aria-label="박수 보내기"]').onclick = ()=> toggleClap(p.id);
  const box = document.getElementById('cmts');
  let list = [];
  const paint = ()=>{ box.innerHTML = list.length ? list.map((c)=> '<div style="display:flex;gap:10px;padding:10px 18px;align-items:flex-start">' + avHtml(c.nick, 30) + '<div style="flex:1;min-width:0"><div style="font-size:13.5px;line-height:1.55"><b>' + esc(c.nick || '회원') + '</b>' + roleTag(c.role) + ' ' + esc(c.text) + '</div><div style="font-size:11.5px;color:#8A94A8">' + ago(c.ts) + '</div></div></div>').join('') : '<div class="muted" style="padding:14px 18px;font-size:13px">첫 응원 댓글을 남겨 보세요 👏</div>'; };
  try{ const s = await getDocs(query(collection(db, 'posts', p.id, 'comments'), orderBy('ts'), limit(200))); list = s.docs.map((d)=> d.data()); }catch(e){ console.warn(e); }
  paint();
  const send = async ()=>{
    const inp = document.getElementById('cmIn'), v = inp.value.trim(); if(!v) return;
    if(!me.nickname){ askNickname(); return; }
    const c = { uid: auth.currentUser.uid, nick: me.nickname, belt: Number(me.total) || 0, role: myRole(), text: v, ts: serverTimestamp() };
    inp.value = ''; list.push(Object.assign({}, c, { ts: { seconds: Date.now() / 1000 } })); paint(); p.cmts = (p.cmts || 0) + 1;
    document.querySelectorAll('#pOne [data-popen].cmchip').forEach((b)=> b.textContent = '💬 댓글 ' + p.cmts);
    try{ const b = writeBatch(db); b.set(doc(collection(db, 'posts', p.id, 'comments')), c); b.update(doc(db, 'posts', p.id), { cmts: increment(1) }); await b.commit(); }catch(e){ console.warn(e); toast('댓글을 올리지 못했어요. 잠시 후 다시 해주세요.'); }
  };
  document.getElementById('cmGo').onclick = send;
  document.getElementById('cmIn').addEventListener('keydown', (e)=>{ if(e.key === 'Enter') send(); });
}

// 오운완 카드 그리기 (사진 + 9가지 카드)
let LOGO_IMG = null;
function logoImg(){ return LOGO_IMG ? Promise.resolve(LOGO_IMG) : new Promise((res)=>{ const im = new Image(); im.onload = ()=>{ LOGO_IMG = im; res(im); }; im.onerror = ()=> res(null); im.src = './logo-white.png'; }); }
function recFromLog(r){
  return { beltName: wBelt(r.belt).name, prog: pn(r.prog), total: r.total || 0, exDone: r.exDone || 0, exTotal: r.exTotal || 0, sets: r.sets || 0, kg: r.kg || 0, minutes: r.minutes || 0,
    items: (r.items || []).slice(0, 8).map((x)=> ({ n: x.n, kg: x.sets && x.sets[0] ? x.sets[0].kg : null, reps: x.sets && x.sets[0] ? x.sets[0].reps : 0, sets: (x.sets || []).length })) };
}
function drawCard(g, W, H, img, st, rec){
  const k = W / 330, Y = '#FFD54A', G2 = '#E9C46A';
  g.save(); g.clearRect(0, 0, W, H);
  if(img){ const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1D3FA8'); gr.addColorStop(1, '#0F2366'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  if(st){ const gr = g.createLinearGradient(0, H * .45, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(0, H * .45, W, H * .55); }
  const gt = g.createLinearGradient(0, 0, 0, H * .2); gt.addColorStop(0, 'rgba(0,0,0,.28)'); gt.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gt; g.fillRect(0, 0, W, H * .2);
  const FF = "-apple-system,'Noto Sans KR',sans-serif";
  const T = (s, x, y, px, wt, col, al, ls, sh)=>{ g.font = wt + ' ' + Math.round(px * k) + 'px ' + FF; g.fillStyle = col || '#fff'; g.textAlign = al || 'left'; try{ g.letterSpacing = (ls || 0) * k + 'px'; }catch(e){}
    g.shadowColor = sh === false ? 'transparent' : 'rgba(0,0,0,.4)'; g.shadowBlur = sh === false ? 0 : 6 * k; g.fillText(s, x * k, y * k); g.shadowBlur = 0; try{ g.letterSpacing = '0px'; }catch(e){} };
  const RR = (x, y, w, h, r, fill, stroke)=>{ g.beginPath(); if(g.roundRect) g.roundRect(x * k, y * k, w * k, h * k, r * k); else g.rect(x * k, y * k, w * k, h * k); if(fill){ g.fillStyle = fill; g.fill(); } if(stroke){ g.strokeStyle = stroke; g.lineWidth = k; g.stroke(); } };
  const L = (x1, y1, x2, y2, col, w)=>{ g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.strokeStyle = col; g.lineWidth = (w || 1) * k; g.stroke(); };
  const HH = H / k, WW = 330;
  const d = new Date(today() + 'T12:00:00+09:00'), dstr = dotDate(today()), wd = '일월화수목금토'[d.getUTCDay()];
  const top = (dateOnly)=>{ if(LOGO_IMG){ const h = 17, w = h * LOGO_IMG.width / LOGO_IMG.height; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6 * k; g.drawImage(LOGO_IMG, 16 * k, 16 * k, w * k, h * k); g.shadowBlur = 0; } T(dstr + (dateOnly ? '' : ' (' + wd + ')'), WW - 16, 29, 12, 700, '#fff', 'right'); };
  const r = rec, has = !!(r && (r.kg || r.sets || r.minutes || r.runKm || r.runMin));
  const beltLine = r && r.beltName ? r.beltName + (r.prog ? ' ' + r.prog : '') + (r.total ? ' · ' + r.total + '번째 출석' : '') : '';
  const AC = has ? Y : '#86A8FF', AC2 = has ? G2 : '#86A8FF';
  const tot = (r && r.total) || Number(me.total) || 0, bName = (r && r.beltName) || (tot < 1 ? '' : beltOf(tot).name), nthL = tot ? tot + '번째 출석' : '', infoL = [bName, nthL].filter(Boolean).join(' · ');
  const hasEx = has && (r.exTotal > 0 || (r.items || []).length > 0);
  const vKg = has ? Number(r.kg || 0).toLocaleString() : '', vSet = has ? String(r.sets || 0) : '', vMin = has ? String(r.minutes || 0) : '', vEx = has ? (r.exTotal ? r.exDone + '/' + r.exTotal : String((r.items || []).length || '-')) : '';
  const pace = has && r.runKm > 0 && r.runMin > 0 ? (()=>{ const sec = Math.round(r.runMin * 60 / r.runKm); return Math.floor(sec / 60) + "'" + String(sec % 60).padStart(2, '0') + '"'; })() : '';
  const M = has ? [(r.runKm > 0) && ['거리', 'DISTANCE', String(Math.round(r.runKm * 100) / 100), 'km', 'km'], (r.runMin > 0) && ['러닝', 'RUN TIME', String(r.runMin), '분', 'min'], pace && ['페이스', 'PACE', pace, '/km', '/km'], hasEx && ['운동', 'EXERCISE', vEx, '개', ''], (r.sets > 0) && ['세트', 'SETS', vSet, '세트', ''], (r.kg > 0) && ['무게', 'VOLUME', vKg, 'kg', 'kg'], (r.minutes > 0) && ['시간', 'TIME', vMin, '분', 'min']].filter(Boolean) : [];
  if(st === 0){ top(false); }
  else if(st === 1){ top(false); if(has){ g.fillStyle = 'rgba(21,49,137,.9)'; g.fillRect(0, (HH - 96) * k, W, 96 * k); }
    if(has){ if(beltLine || infoL) T('● ' + (beltLine || infoL), 14, HH - 74, 11.5, 700, AC, 'left', 0, false);
      const cols = M.map((m)=> [m[0], m[2], m[3]]), cw = (WW - 28) / Math.max(cols.length, 2); cols.forEach(([l, v, u], i)=>{ const x = 14 + i * cw; if(i) L(x - 8, HH - 58, x - 8, HH - 14, 'rgba(255,255,255,.25)');
        T(l, x, HH - 46, 10.5, 500, 'rgba(255,255,255,.8)', 'left', 0, false); T(v, x, HH - 20, cols.length < 3 ? 26 : 21, 900, '#fff', 'left', 0, false); g.font = '900 ' + Math.round((cols.length < 3 ? 26 : 21) * k) + 'px ' + FF; const vw = g.measureText(v).width / k; T(u, x + vw + 2, HH - 20, 11, 700, '#fff', 'left', 0, false); }); }
    else { g.fillStyle = 'rgba(21,49,137,.9)'; g.fillRect(0, (HH - 78) * k, W, 78 * k); T('오운완!', 16, HH - 34, 30, 900, '#fff', 'left', 0, false); if(infoL) T(infoL, 16, HH - 14, 11.5, 700, AC, 'left', 0, false); T('WORKOUT', WW - 16, HH - 42, 11, 800, 'rgba(255,255,255,.75)', 'right', 2, false); T('COMPLETE', WW - 16, HH - 26, 11, 800, 'rgba(255,255,255,.75)', 'right', 2, false); g.fillStyle = AC; g.fillRect((WW - 40) * k, (HH - 18) * k, 24 * k, 2 * k); } }
  else if(st === 2){ top(false); if(has || !infoL) T('오운완!', 16, has ? HH - 56 : HH - 22, 36, 900);
    if(!has && infoL){ T('오운완!', 16, HH - 56, 36, 900); }
    { const chips = has ? M.map((m)=> m[0] === '운동' ? '운동 ' + m[2] : m[2] + m[3]) : [bName, nthL, 'WORKOUT DONE'].filter(Boolean); let x = 16; if(chips.length) chips.forEach((s)=>{ g.font = '700 ' + Math.round(12.5 * k) + 'px ' + FF; const w = g.measureText(s).width / k + 20; RR(x, HH - 42, w, 26, 13, 'rgba(255,255,255,.18)', 'rgba(255,255,255,.4)'); T(s, x + w / 2, HH - 24.5, 12.5, 700, '#fff', 'center', 0, false); x += w + 6; }); } }
  else if(st === 3){ top(false);
    if(has){ M.slice(0, 3).forEach((m, i, a)=>{ const y = HH - 22 - (a.length - 1 - i) * 50; T(m[0], 16, y - (a.length === 1 ? 44 : 30), 10.5, 700); T(m[2] + (m[3] === 'kg' ? ' kg' : m[3]), 16, y, a.length === 1 ? 40 : 28, 900); }); if(beltLine) T(r.beltName + (r.prog ? ' · ' + r.prog : ''), WW - 16, HH - 22, 12, 900, AC, 'right'); }
    else { T('TODAY', 16, HH - 96, 11, 800, '#fff', 'left', 2); T(dstr, 16, HH - 74, 22, 900); T('오운완!', 16, HH - 24, 44, 900); if(infoL) T(infoL, WW - 16, HH - 24, 12, 900, AC, 'right'); } }
  else if(st === 4){ top(false); const h = 66; RR(14, HH - 14 - h, WW - 28, h, 14, '#fff'); RR(24, HH - 14 - h + (h - 40) / 2, 40, 40, 11, B); T('✓', 44, HH - 14 - h / 2 + 8, 22, 900, AC, 'center', 0, false);
    T('오운완!', 74, HH - 14 - h + 26, 16, 900, B, 'left', 0, false); if(bName){ g.font = '900 ' + Math.round(16 * k) + 'px ' + FF; T(bName + (r && r.prog ? ' · ' + r.prog : ''), 74 + g.measureText('오운완!').width / k + 6, HH - 14 - h + 26, 11.5, 700, (has ? '#B8860B' : B), 'left', 0, false); }
    T(has ? M.map((m)=> m[0] === '운동' ? m[2] + ' 운동' : m[2] + m[3]).join(' · ') : (nthL ? nthL + ' · ' : '') + '오늘도 해냈어요', 74, HH - 14 - h + 48, 12, 700, '#374151', 'left', 0, false); }
  else if(st === 5){ top(true); const base = has ? HH - 128 : HH - 70; T('오운완!', 18, base, has ? 24 : 40, 900, AC2);
    if(!has){ L(18, HH - 56, WW - 18, HH - 56, 'rgba(255,255,255,.55)'); T('WORKOUT COMPLETE', 18, HH - 34, 11, 800, '#fff', 'left', 2.2); if(infoL) T(infoL, WW - 18, HH - 34, 11, 800, 'rgba(255,255,255,.9)', 'right', 0.5); }
    if(has){ L(18, HH - 112, WW - 18, HH - 112, 'rgba(255,255,255,.55)'); const E = M.filter((m)=> m[0] !== '운동').slice(0, 3), ew = (WW - 36) / Math.max(E.length, 1), es = E.length === 1 ? 44 : E.length === 3 ? 28 : 32; E.forEach(([, l, v, , u], i)=>{ const x = 18 + i * ew; T(l, x, HH - 66 - es, 10, 800, '#fff', 'left', 1.6); T(v, x, HH - 60, es, 900, '#fff', 'left', -1); g.font = '900 ' + Math.round(es * k) + 'px ' + FF; const vw = g.measureText(v).width / k; if(u) T(u, x + vw + 3, HH - 60, 13, 700); });
      if(beltLine) T(beltLine, 18, HH - 30, 10.5, 800, 'rgba(255,255,255,.9)', 'left', 1.2); } }
  else if(st === 6){
    if(has){ const E = M.filter((m)=> m[0] !== '운동').slice(0, 3); E.map((m, i)=> [m[1], m[2], m[4], HH / 2 + 14 + (i - (E.length - 1) / 2) * 74]).forEach(([l, v, u, y])=>{ T(l, WW / 2, y - 36, 10, 800, '#fff', 'center', 1.8); g.font = '900 ' + Math.round(38 * k) + 'px ' + FF; const vw = g.measureText(v).width / k, uw = u ? 22 : 0; T(v, WW / 2 - uw / 2, y, 38, 900, '#fff', 'center', -1); if(u) T(u, WW / 2 - uw / 2 + vw / 2 + 3, y, 14, 700, '#fff', 'left'); }); }
    else { T('WORKOUT COMPLETE', WW / 2, HH / 2 - 34, 11, 800, '#fff', 'center', 2.4); T('오운완!', WW / 2, HH / 2 + 14, 48, 900, '#fff', 'center'); if(infoL) T(infoL, WW / 2, HH / 2 + 42, 12, 800, AC, 'center', 0.5); }
    if(LOGO_IMG){ const h = 15, w = h * LOGO_IMG.width / LOGO_IMG.height; g.drawImage(LOGO_IMG, (WW / 2 - w / 2) * k, (HH - 52) * k, w * k, h * k); }
    T(dstr + ' · 오운완!', WW / 2, HH - 20, 10, 700, '#fff', 'center', 1.8); }
  else if(st === 7){ top(false); const h = has ? 128 : 90; RR(14, HH - 14 - h, WW - 28, h, 18, 'rgba(10,20,50,.55)', 'rgba(255,255,255,.2)');
    T('오운완!', 30, HH - 14 - h + 34, 19, 900, '#fff', 'left', 0, false); if(bName) T(bName + (r && r.prog ? ' · ' + r.prog : ''), WW - 30, HH - 14 - h + 33, 11, 700, AC2, 'right', 0, false);
    if(!has){ const gl = g.createLinearGradient(30 * k, 0, (WW - 30) * k, 0); gl.addColorStop(0, AC2); gl.addColorStop(1, has ? 'rgba(233,196,106,0)' : 'rgba(134,168,255,0)'); g.fillStyle = gl; g.fillRect(30 * k, (HH - 14 - h + 46) * k, (WW - 60) * k, k); T('WORKOUT COMPLETE', 30, HH - 30, 10.5, 800, '#fff', 'left', 2, false); if(nthL) T(nthL, WW - 30, HH - 30, 11, 700, 'rgba(255,255,255,.85)', 'right', 0, false); }
    if(has){ const gl = g.createLinearGradient(30 * k, 0, (WW - 30) * k, 0); gl.addColorStop(0, AC2); gl.addColorStop(1, has ? 'rgba(233,196,106,0)' : 'rgba(134,168,255,0)'); g.fillStyle = gl; g.fillRect(30 * k, (HH - 14 - h + 46) * k, (WW - 60) * k, k);
      const E = M.filter((m)=> m[0] !== '운동').slice(0, 3), gw = (WW - 60) / Math.max(E.length, 1); E.map((m, i)=> [m[1], m[2], m[4], 30 + i * gw]).forEach(([l, v, u, x], i)=>{ if(i) L(x - 12, HH - 82, x - 12, HH - 32, 'rgba(255,255,255,.15)'); T(l, x, HH - 72, 9.5, 800, '#fff', 'left', 1.5, false); T(v, x, HH - 40, 25, 900, '#fff', 'left', -0.5, false); g.font = '900 ' + Math.round(25 * k) + 'px ' + FF; const vw = g.measureText(v).width / k; if(u) T(u, x + vw + 3, HH - 40, 11, 700, '#fff', 'left', 0, false); }); } }
  else if(st === 8){ if(LOGO_IMG){ const h = 17, w = h * LOGO_IMG.width / LOGO_IMG.height; g.drawImage(LOGO_IMG, 16 * k, 16 * k, w * k, h * k); } L(WW - 16, 14, WW - 16, HH - 14, 'rgba(255,255,255,.4)');
    if(!has){ T('WORKOUT', WW - 28, HH - 52, 11, 800, '#fff', 'right', 2.2); T('COMPLETE', WW - 28, HH - 36, 11, 800, '#fff', 'right', 2.2); if(bName) T(bName, WW - 28, HH - 18, 11, 800, AC2, 'right'); }
    if(has){ const E = M.filter((m)=> m[0] !== '운동').slice(0, 3); E.map((m)=> [m[1], m[2], m[4]]).forEach(([l, v, u], i)=>{ const y = HH - 22 - (E.length - 1 - i) * 70; T(l, WW - 28, y - 30, 10, 800, '#fff', 'right', 1.6); T(v + (u ? ' ' + u : ''), WW - 28, y, 28, 900, '#fff', 'right', -0.5); }); }
    T('오운완!', 18, HH - 44, 34, 900); T(dstr + (tot ? ' · ' + tot + '번째' : ''), 18, HH - 24, 10.5, 700, '#fff', 'left', 1.4); g.fillStyle = AC2; g.fillRect(18 * k, (HH - 16) * k, 26 * k, 2 * k); }
  g.restore();
}
function startWrite(rec){
  if(!me.nickname){ askNickname(); return; }
  W8 = { img: null, style: 0, rec: rec || null };
  go('write');
}
async function renderWrite(){
  if(!W8) W8 = { img: null, style: 0, rec: null };
  await logoImg();
  $app.innerHTML = '<div class="top" style="padding-left:12px"><button class="back" type="button" data-go="community" aria-label="닫기" style="font-size:22px">✕</button><div class="ttl" style="font-size:17px">오운완 올리기</div><button type="button" class="btn" id="wGo" style="height:38px;border-radius:999px;font-size:14px">올리기</button></div>' +
    '<div style="margin:12px 30px 0;position:relative"><canvas id="wPrev" width="660" height="825" style="width:100%;display:block;border-radius:16px;background:#1C2433"></canvas>' +
    '</div><div style="text-align:center;margin-top:10px"><label style="display:inline-block;background:#fff;color:' + B + ';box-shadow:inset 0 0 0 2px ' + B + ';font-size:13px;font-weight:900;border-radius:999px;padding:8px 16px;cursor:pointer">📷 <span id="wPicLbl">' + (W8.img ? '사진 바꾸기' : '사진 고르기') + '</span><input type="file" id="wPic" accept="image/*" hidden></label></div>' +
    '<div style="padding:12px 22px 0;font-size:12.5px;color:#6B7280;font-weight:700">카드 고르기 <span style="font-weight:500">· 옆으로 넘겨 보세요</span></div>' +
    '<div id="wStrip" style="display:flex;gap:10px;padding:10px 22px 6px;overflow-x:auto;-webkit-overflow-scrolling:touch">' + cardOrder(W8.rec).map((i)=> [CARD_NAMES[i], i]).map(([n, i])=> '<button type="button" data-st="' + i + '" style="flex:none;width:76px;background:none;border:0;padding:0;font-family:inherit;cursor:pointer"><canvas width="152" height="190" style="width:76px;height:95px;border-radius:10px;display:block;' + (i === W8.style ? 'outline:3px solid ' + B + ';outline-offset:2px' : '') + '"></canvas><div style="font-size:11px;margin-top:6px;font-weight:' + (i === W8.style ? 900 : 500) + ';color:' + (i === W8.style ? B : '#6B7280') + '">' + n + '</div></button>').join('') + '</div>' +
    '<div class="m" id="wRec"></div>' +
    '<div class="m field"><textarea id="wText" maxlength="2000" placeholder="오늘 운동 어땠나요? 한 줄도 좋고, 길게 써도 좋아요" style="height:110px"></textarea></div>' +
    '<div class="m" style="font-size:12.5px;color:#6B7280">' + beltDot(me.total) + '<b style="color:' + B + '">' + esc(me.nickname) + '</b> 닉네임으로 올라가요</div><div style="height:20px"></div>';
  if(W8.text) document.getElementById('wText').value = W8.text;
  document.getElementById('wText').oninput = (e)=>{ W8.text = e.target.value; };
  const paint = ()=>{ drawCard(document.getElementById('wPrev').getContext('2d'), 660, 825, W8.img, W8.style, W8.rec);
    document.querySelectorAll('#wStrip [data-st]').forEach((b)=>{ const i = +b.dataset.st, c = b.querySelector('canvas'); drawCard(c.getContext('2d'), 152, 190, W8.img, i, W8.rec); c.style.outline = i === W8.style ? '3px solid ' + B : ''; c.style.outlineOffset = '2px'; const t = b.querySelector('div'); t.style.fontWeight = i === W8.style ? 900 : 500; t.style.color = i === W8.style ? B : '#6B7280'; }); };
  const recUi = ()=>{ const el = document.getElementById('wRec');
    el.innerHTML = W8.rec ? '<div style="background:#fff;border-radius:12px;padding:10px 12px;box-shadow:inset 0 0 0 1.5px #D5DCE8"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13.5px;color:' + B + '">' + esc(W8.rec.beltName ? W8.rec.beltName + (W8.rec.prog ? ' ' + W8.rec.prog : '') + ' WOD' : '오늘의 운동') + ' 추가됨 ✓</b><button type="button" id="wRecX" style="background:none;border:0;color:#8A94A8;font-size:12.5px;cursor:pointer;font-family:inherit">빼기</button></div><div style="font-size:12.5px;color:#374151;margin-top:3px">' + [W8.rec.runKm ? '러닝 ' + W8.rec.runKm + 'km' : '', W8.rec.runMin ? W8.rec.runMin + '분' : '', W8.rec.sets ? W8.rec.sets + '세트' : '', W8.rec.kg ? Number(W8.rec.kg).toLocaleString() + 'kg' : '', W8.rec.minutes ? '웨이트 ' + W8.rec.minutes + '분' : ''].filter(Boolean).join(' · ') + '</div></div>'
      : '<button type="button" id="wRecAdd" style="width:100%;height:48px;border:1.5px dashed #9FB0D8;border-radius:12px;background:#fff;color:' + B + ';font-weight:900;font-size:14.5px;cursor:pointer;font-family:inherit">＋ 운동 기록 추가</button>';
    if(W8.rec) document.getElementById('wRecX').onclick = ()=>{ W8.rec = null; if(!cardOrder(null).includes(W8.style)) W8.style = 0; renderWrite(); };
    else document.getElementById('wRecAdd').onclick = addRec; };
  const addRec = async ()=>{
    const logs = await loadMyLogs(); const t = logs.find((l)=> l.date === today());
    if(t){ W8.rec = recFromLog(t); if(!W8.style) W8.style = 5; renderWrite(); toast('오늘 한 WOD 기록을 불러왔어요'); return; }
    const fld = (id, lb, ph, dec)=> '<div class="field" style="margin-top:8px"><label for="' + id + '">' + lb + '</label><input id="' + id + '" type="number" inputmode="' + (dec ? 'decimal' : 'numeric') + '" step="' + (dec ? '0.01' : '1') + '" placeholder="' + ph + '"></div>';
    const bg = sheet('<div class="ttl">오늘 운동 기록</div><div class="muted" style="font-size:13px;margin-top:4px">한 것만 적으면 돼요. 적은 것만 카드에 나와요.</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px"><button type="button" data-mk="run" class="cmchip on" style="flex:1;height:44px;font-size:14.5px">🏃 러닝</button><button type="button" data-mk="wt" class="cmchip" style="flex:1;height:44px;font-size:14.5px">🏋️ 웨이트</button></div>' +
      '<div id="mRunBox">' + fld('mKm', '거리 (km)', '5', true) + fld('mRun', '러닝 시간 (분)', '30') + '<div id="mPace" style="font-size:13px;font-weight:900;color:' + B + ';margin-top:8px;min-height:18px"></div></div>' +
      '<div id="mWtBox" style="display:none">' + fld('mMin', '운동 시간 (분)', '60') + fld('mSet', '세트 수', '15') + fld('mKg', '총 무게 (kg)', '2000') + '</div>' +
      '<button type="button" class="btn" id="mOk" style="width:100%;margin-top:14px">추가하기</button>');
    let mk = 'run';
    bg.querySelectorAll('[data-mk]').forEach((b)=> b.onclick = ()=>{ mk = b.dataset.mk; bg.querySelectorAll('[data-mk]').forEach((x)=> x.classList.toggle('on', x === b)); bg.querySelector('#mRunBox').style.display = mk === 'run' ? '' : 'none'; bg.querySelector('#mWtBox').style.display = mk === 'wt' ? '' : 'none'; });
    const num = (id)=> Math.max(0, Number(bg.querySelector(id).value) || 0);
    const pc = ()=>{ const km = num('#mKm'), mn = num('#mRun'); if(!(km && mn)){ bg.querySelector('#mPace').textContent = ''; return; } const sec = Math.round(mn * 60 / km); bg.querySelector('#mPace').textContent = '페이스 ' + Math.floor(sec / 60) + "'" + String(sec % 60).padStart(2, '0') + '" /km'; };
    bg.querySelector('#mKm').oninput = pc; bg.querySelector('#mRun').oninput = pc;
    bg.querySelector('#mOk').onclick = ()=>{ const R = mk === 'run'; const rr = { beltName: '', prog: '', total: Number(me.total) || 0, exDone: 0, exTotal: 0, runKm: R ? Math.round(num('#mKm') * 100) / 100 : 0, runMin: R ? Math.round(num('#mRun')) : 0, sets: R ? 0 : Math.round(num('#mSet')), kg: R ? 0 : Math.round(num('#mKg')), minutes: R ? 0 : Math.round(num('#mMin')), items: [] };
      if(!rr.sets && !rr.kg && !rr.minutes && !rr.runKm && !rr.runMin){ toast('하나 이상 적어 주세요'); return; } W8.rec = rr; if(!W8.style) W8.style = 5; bg.remove(); renderWrite(); };

  };
  document.querySelectorAll('#wStrip [data-st]').forEach((b)=> b.onclick = ()=>{ W8.style = +b.dataset.st; paint(); });
  document.getElementById('wPic').onchange = (e)=>{ const f = e.target.files && e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f), im = new Image();
    im.onload = ()=>{ W8.img = im; document.getElementById('wPicLbl').textContent = '사진 바꾸기'; paint(); }; im.onerror = ()=> toast('이 사진은 열 수 없어요. 다른 사진을 골라 주세요.'); im.src = url; };
  document.getElementById('wGo').onclick = submitPost;
  recUi(); paint();
  if(!W8.img) setTimeout(()=>{ const i = document.getElementById('wPic'); if(i && !W8.img && !W8.asked){ W8.asked = true; i.click(); } }, 250);
}
async function submitPost(){
  const btn = document.getElementById('wGo'); const text = (document.getElementById('wText').value || '').trim();
  if(!W8.img && !text && !W8.rec){ toast('사진이나 글을 올려 주세요'); return; }
  btn.disabled = true; btn.textContent = '올리는 중…';
  const c = document.createElement('canvas'); c.width = 640; c.height = 800; drawCard(c.getContext('2d'), 640, 800, W8.img, W8.style, W8.rec);
  let img = c.toDataURL('image/jpeg', .74); if(img.length > 360000) img = c.toDataURL('image/jpeg', .6);
  const p = { uid: auth.currentUser.uid, mid: me.id, nick: me.nickname, belt: Number(me.total) || 0, role: myRole(), text, img, style: W8.style, rec: W8.rec || null, date: today(), claps: 0, cmts: 0, ts: serverTimestamp() };
  try{ const ref = await addDoc(collection(db, 'posts'), p); posts.unshift(Object.assign({ id: ref.id }, p, { ts: { seconds: Date.now() / 1000 } })); W8 = null; toast('오운완을 올렸어요! 👏'); go('community'); }
  catch(e){ console.warn(e); btn.disabled = false; btn.textContent = '올리기'; const c = (e && e.code) || ''; toast(c.includes('permission') ? '올릴 권한이 없어요 (서버 규칙 확인 필요)' : c.includes('invalid') || c.includes('size') ? '사진이 너무 커요. 다른 사진으로 해주세요' : '올리지 못했어요 (' + (c || '연결') + ')'); }
}

// ---------- 시작 ----------
onAuthStateChanged(auth, (user)=>{
  if(user && user.phoneNumber){ loadMe(user).catch((e)=>{ console.error(e); renderLogin('회원 정보를 불러오지 못했어요. 잠시 후 다시 해주세요.'); }); }
  else { me = null; renderLogin(); }
});
