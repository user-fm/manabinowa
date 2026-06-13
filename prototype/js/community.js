// 地域住民・団体
initPage('community');
renderMyRequests();

function submitCommunity() {
  const title = document.getElementById('comTitle').value.trim();
  const detail = document.getElementById('comDetail').value.trim();
  if (!title || !detail) {
    alert('タイトルと依頼内容を入力してください');
    return;
  }
  const item = {
    id: Date.now(),
    from: '地域の方',
    cat: document.getElementById('comCat').value,
    title: title,
    due: document.getElementById('comDue').value,
    text: detail,
    status: ''
  };
  // 教師の受信箱と同じ一覧に入れて、idで自分の依頼を覚えておく
  state.community.unshift(item);
  state.myRequestIds.unshift(item.id);
  saveState();
  document.getElementById('comTitle').value = '';
  document.getElementById('comDetail').value = '';
  renderMyRequests();
  toast('依頼を送信しました。学校の先生に届きます');
}

function renderMyRequests() {
  const box = document.getElementById('myComList');
  if (state.myRequestIds.length === 0) {
    box.innerHTML = '<p class="none-text">まだありません。</p>';
    return;
  }
  let html = '';
  state.myRequestIds.forEach(function(id) {
    const c = state.community.find(function(x) { return x.id === id; });
    if (!c) return;
    let st = '学校が確認中';
    if (c.status === 'ok') st = '受入決定';
    if (c.status === 'no') st = '今回は見送り';
    html += '<div class="list-item"><span class="tag">' + c.cat + '</span>'
      + '<div class="item-body"><b>' + c.title + '</b><br><small>締切 ' + c.due + '／' + st + '</small></div></div>';
  });
  box.innerHTML = html;
}
