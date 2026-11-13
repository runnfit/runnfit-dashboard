// 런앤핏 직원용 출석 대시보드 불러오기
// 북마크를 누르면 이 파일이 실행되어, 지금 열려 있는 다짐매니저 화면 위에 최신 대시보드를 띄운다.
// (회원 정보는 그 사람의 다짐 로그인으로만 읽고, 어디에도 저장하지 않는다)
(function () {
  var BASE = 'https://runnfit.github.io/runnfit-dashboard/';
  if (!/(^|\.)dagym-manager\.com$/.test(location.hostname)) {
    alert('다짐매니저 화면을 켠 상태에서 눌러주세요.');
    return;
  }
  var old = document.getElementById('__rfdash');
  if (old) { old.remove(); return; }            // 열려 있으면 한 번 더 눌러서 닫기
  var PAGE = window.__RF_PAGE === 'kpi' ? 'kpi.html' : 'dashboard.html';   // 마케팅 KPI 창이면 KPI 화면
  fetch(BASE + PAGE + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (page) {
      var f = document.createElement('iframe');
      f.id = '__rfdash';
      f.title = '런앤핏 직원용 출석 대시보드';
      f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:#f3f5f9';
      f.srcdoc = page;
      document.body.appendChild(f);
    })
    .catch(function () { alert('대시보드를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요.'); });
})();
