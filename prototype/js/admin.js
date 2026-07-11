// 学校管理者
initPage('admin');
renderAlerts();
renderBlockReqs();

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
  const reason = prompt('ブロックを申請する理由を入力してください（必須）');
  if (reason === null) return;
  if (!reason.trim()) {
    alert('理由の入力が必要です');
    return;
  }
  state.blockReqs.unshift({
    target: state.asked || '山本 さくら',
    reason: reason.trim(),
    status: '審査中'
  });
  saveState();
  renderBlockReqs();
  toast('ブロックを申請しました。運営が内容を確認します');
}

function renderBlockReqs() {
  const box = document.getElementById('blockArea');
  if (state.blockReqs.length === 0) {
    box.innerHTML = '<p class="none-text">申請はありません。</p>';
    return;
  }
  let html = '';
  state.blockReqs.forEach(function(b) {
    let st = '運営が審査中です';
    if (b.status === '実施') st = 'ブロックが実施されました';
    if (b.status === '取消') st = '審査の結果、申請は取り消されました';
    html += '<div class="list-item"><span class="tag">ブロック申請</span>'
      + '<div class="item-body"><b>' + b.target + 'さん</b><br><small>' + st + '</small>'
      + '<p>理由：' + b.reason + '</p></div></div>';
  });
  box.innerHTML = html;
}
