// 保護者の同意ページ
// メールのリンクから開く想定なので、ヘッダーは出していない
initPage();

function submitConsent() {
  const name = document.getElementById('parentName').value.trim();
  const agree = document.getElementById('agreeCheck').checked;
  if (!name || !agree) {
    alert('氏名の入力と、同意のチェックが必要です');
    return;
  }
  state.consent = true;
  saveState();
  document.getElementById('consentForm').style.display = 'none';
  document.getElementById('consentDone').style.display = 'block';
}
