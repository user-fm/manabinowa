// 地域からの依頼（教師の受信箱）
initPage('teacher');
renderInbox();

function renderInbox() {
  let html = '';
  state.community.forEach(function(c) {
    html += '<div class="list-item">'
      + '<span class="tag">' + c.cat + '</span>'
      + '<div class="item-body"><b>' + c.title + '</b>';
    if (c.status === 'ok') html += ' <span class="badge badge-on">受入済み</span>';
    if (c.status === 'no') html += ' <span class="badge">見送り</span>';
    html += '<br><small>' + c.from + '／締切 ' + c.due + '</small>'
      + '<p>' + c.text + '</p>';
    if (!c.status) {
      html += '<button class="btn btn-small" onclick="decideRequest(' + c.id + ', true)">受け入れる</button> '
        + '<button class="btn btn-small btn-gray" onclick="decideRequest(' + c.id + ', false)">見送る</button>';
    }
    html += '</div></div>';
  });
  document.getElementById('inboxList').innerHTML = html;
}

function decideRequest(id, ok) {
  const item = state.community.find(function(c) { return c.id === id; });
  if (!item) return;
  item.status = ok ? 'ok' : 'no';
  if (ok) {
    state.library.unshift({ title: item.title, cat: item.cat, from: item.from });
    toast('受け入れました。教材ライブラリに追加されます');
  } else {
    toast('見送りました。相手の方には自動で連絡されます');
  }
  saveState();
  renderInbox();
}
