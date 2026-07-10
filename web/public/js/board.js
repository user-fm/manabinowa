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
  toast('月次レポートを出力しました（モック）');
}
