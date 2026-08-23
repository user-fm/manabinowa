// ボランティア・地域の利用登録（個人アカウントは運営の審査を挟む）
initPage();

const regRole = state.signupRole || 'volunteer';
document.getElementById('regLead').textContent =
  roleNames[regRole] + 'としての利用登録です。運営の審査が終わると利用を開始できます。';

function submitRegister() {
  const name = document.getElementById('regName').value.trim();
  const intro = document.getElementById('regIntro').value.trim();
  if (!name || !intro) {
    alert('お名前と自己紹介を入力してください');
    return;
  }
  const idType = document.getElementById('regIdType').value;
  // 運営の審査待ちの列に加える
  state.applications.unshift({
    name: name,
    role: regRole,
    note: intro + '／本人確認資料：' + idType,
    status: ''
  });
  saveState();
  document.getElementById('regForm').style.display = 'none';
  document.getElementById('regDone').style.display = 'block';
}

function demoApprove() {
  login(regRole);
}
