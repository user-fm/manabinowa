// 教師ホーム
initPage('teacher');

// 受信箱の未対応件数
let count = 0;
state.community.forEach(function(c) {
  if (!c.status) count++;
});
document.getElementById('inboxCount').textContent = count;

// 依頼の状態バッジ
const reqBadge = document.getElementById('reqBadge');
if (state.matched) {
  reqBadge.textContent = 'マッチング成立';
  reqBadge.className = 'badge badge-on';
} else if (state.asked) {
  reqBadge.textContent = '回答待ち';
  reqBadge.className = 'badge badge-wait';
}

// セッションのカード
if (state.matched) {
  const sBadge = document.getElementById('sessionBadge');
  sBadge.textContent = '予定あり';
  sBadge.className = 'badge badge-on';
  document.getElementById('sessionText').textContent =
    '6/24（水）16:00〜　' + state.asked + 'さんと算数の個別指導';
}
