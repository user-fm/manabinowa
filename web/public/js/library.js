// 教材ライブラリ
initPage('teacher');
renderLibrary();

function renderLibrary() {
  const q = document.getElementById('libSearch').value.trim();
  let html = '';
  state.library.forEach(function(item) {
    if (q && (item.title + item.cat + item.from).indexOf(q) === -1) return;
    html += '<div class="list-item"><span class="tag">' + item.cat + '</span>'
      + '<div class="item-body"><b>' + item.title + '</b><br><small>提供：' + item.from + '</small></div></div>';
  });
  document.getElementById('libList').innerHTML = html || '<p class="none-text">見つかりませんでした。</p>';
}
