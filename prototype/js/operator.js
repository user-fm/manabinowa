// サービス運営者（登録審査・ブロック審査・問い合わせ対応）
initPage('operator');
renderApps();
renderBlocks();
renderInquiries();

// 新規登録の審査
function renderApps() {
  const box = document.getElementById('appList');
  if (state.applications.length === 0) {
    box.innerHTML = '<p class="none-text">審査待ちはありません。</p>';
    return;
  }
  let html = '';
  state.applications.forEach(function(a, i) {
    html += '<div class="list-item"><span class="tag">' + roleNames[a.role] + '</span>'
      + '<div class="item-body"><b>' + a.name + '</b>';
    if (a.status === 'ok') html += ' <span class="badge badge-on">承認済み</span>';
    if (a.status === 'no') html += ' <span class="badge">見送り</span>';
    html += '<p>' + a.note + '</p>';
    if (!a.status) {
      html += '<button class="btn btn-small" onclick="judgeApp(' + i + ', true)">承認する</button> '
        + '<button class="btn btn-small btn-gray" onclick="judgeApp(' + i + ', false)">見送る</button>';
    }
    html += '</div></div>';
  });
  box.innerHTML = html;
}

function judgeApp(i, ok) {
  state.applications[i].status = ok ? 'ok' : 'no';
  saveState();
  renderApps();
  if (ok) toast('承認しました。ご本人に開始のご案内メールが届きます');
  else toast('見送りました。ご本人にはメールでお知らせします');
}

// ブロック申請の審査
function renderBlocks() {
  const box = document.getElementById('blockList');
  if (state.blockReqs.length === 0) {
    box.innerHTML = '<p class="none-text">申請はありません。</p>';
    return;
  }
  let html = '';
  state.blockReqs.forEach(function(b, i) {
    html += '<div class="list-item"><span class="tag">ブロック申請</span>'
      + '<div class="item-body"><b>' + b.target + 'さん</b> <small>hal小学校の管理者より</small>'
      + '<p>理由：' + b.reason + '</p>';
    if (b.status === '審査中') {
      html += '<button class="btn btn-small btn-red" onclick="judgeBlock(' + i + ', true)">ブロックを実施</button> '
        + '<button class="btn btn-small btn-gray" onclick="judgeBlock(' + i + ', false)">申請を取り消す</button>';
    } else if (b.status === '実施') {
      html += '<span class="badge">実施済み（本人には理由を伏せた文面で通知）</span>';
    } else {
      html += '<span class="badge">取消（学校管理者に連絡済み）</span>';
    }
    html += '</div></div>';
  });
  box.innerHTML = html;
}

function judgeBlock(i, ok) {
  state.blockReqs[i].status = ok ? '実施' : '取消';
  saveState();
  renderBlocks();
  if (ok) toast('ブロックリストに追加しました。今後のマッチング対象から外れます');
  else toast('申請を取り消しました。学校管理者に連絡します');
}

// お問い合わせ対応
function renderInquiries() {
  const box = document.getElementById('inqList');
  if (state.inquiries.length === 0) {
    box.innerHTML = '<p class="none-text">お問い合わせはありません。</p>';
    return;
  }
  let html = '';
  state.inquiries.forEach(function(q, i) {
    html += '<div class="list-item"><span class="tag">' + q.cat + '</span>'
      + '<div class="item-body"><b>' + q.title + '</b><br><small>' + q.from + '</small>'
      + '<p>' + q.text + '</p>';
    if (q.status) {
      html += '<span class="badge badge-on">対応済み</span>';
    } else if (q.cat.indexOf('削除') !== -1) {
      // 削除要求は本人確認をしてから削除する決まり
      html += '<button class="btn btn-small btn-red" onclick="handleInq(' + i + ', true)">本人確認して削除を実行</button>';
    } else {
      html += '<button class="btn btn-small" onclick="handleInq(' + i + ', false)">回答済みにする</button>';
    }
    html += '</div></div>';
  });
  box.innerHTML = html;
}

function handleInq(i, isDelete) {
  state.inquiries[i].status = 'done';
  saveState();
  renderInquiries();
  if (isDelete) toast('本人確認のうえ登録情報を削除しました。完了のメールをお送りします');
  else toast('回答メールを送信しました。対応の記録を残します');
}
