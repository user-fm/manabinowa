// 学校管理者
initPage('admin');
renderAlerts();

function renderAlerts() {
  const box = document.getElementById('alertArea');
  if (state.alerts.length === 0) {
    box.innerHTML = '<p class="none-text">アラートはありません。</p>';
    return;
  }
  let html = '';
  state.alerts.forEach(function(a, i) {
    html += '<div class="list-item">'
      + '<span class="level level-' + a.level + '">' + a.level + '</span>'
      + '<div class="item-body"><b>セッション内チャット</b> <small>' + a.time + '</small>'
      + '<p>検知内容：「' + a.text + '」</p>';
    if (a.done) {
      html += '<small class="done-text">対応済み（記録に保存されています）</small>';
    } else {
      html += '<button class="btn btn-small" onclick="resolveAlert(' + i + ')">対応済みにする</button> '
        + '<button class="btn btn-small btn-red" onclick="applyBlock()">ブロック申請</button>';
    }
    html += '</div></div>';
  });
  box.innerHTML = html;
}

function resolveAlert(i) {
  state.alerts[i].done = true;
  saveState();
  renderAlerts();
  toast('対応を記録しました');
}

function applyBlock() {
  if (confirm('このボランティアのブロックを運営に申請しますか？')) {
    toast('ブロックを申請しました。運営が内容を確認します');
  }
}
