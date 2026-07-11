// 教育委員会ホーム
initPage('board');

let openCount = 0;
state.alerts.forEach(function(a) {
  if (!a.done) openCount++;
});

document.getElementById('statSessions').textContent = state.matched ? 1 : 0;
document.getElementById('statAlerts').textContent = state.alerts.length;
document.getElementById('alertNote').textContent = '未対応 ' + openCount + ' 件';
document.getElementById('statMatch').textContent = state.matched ? '100%' : '—';

function printReport() {
  const done = state.alerts.length - openCount;
  let accepted = 0;
  state.community.forEach(function(c) {
    if (c.status === 'ok') accepted++;
  });
  document.getElementById('reportList').innerHTML =
    '<li>利用校数：1校（hal小学校）</li>'
    + '<li>指導セッション：' + (state.matched ? 1 : 0) + ' 件</li>'
    + '<li>AIアラート：' + state.alerts.length + ' 件（対応済み ' + done + ' 件）</li>'
    + '<li>マッチング成立率：' + (state.matched ? '100%' : '—') + '</li>'
    + '<li>地域からの依頼：' + state.community.length + ' 件（受入 ' + accepted + ' 件）</li>';
  document.getElementById('reportBox').style.display = 'block';
}
