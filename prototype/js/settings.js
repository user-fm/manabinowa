// 設定ページ（アカウント情報＋通知設定）
initPage();

const accountNames = {
  teacher: '田中先生',
  student: '春 太郎',
  volunteer: '山本 さくら',
  community: '鈴木 大輔',
  admin: '学校管理者',
  board: '教育委員会 ご担当者',
  operator: 'まなびのわ事務局'
};

document.getElementById('acctName').textContent = accountNames[state.role] || '-';
document.getElementById('acctRole').textContent = roleNames[state.role] || '-';

// 保存済みの通知設定を反映
document.getElementById('prefMail').checked = state.notifPrefs.mail;
document.getElementById('prefPush').checked = state.notifPrefs.push;

function saveSettings() {
  state.notifPrefs.mail = document.getElementById('prefMail').checked;
  state.notifPrefs.push = document.getElementById('prefPush').checked;
  saveState();
  toast('設定を保存しました');
  setTimeout(goHome, 900);
}
