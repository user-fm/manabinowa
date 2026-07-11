// ボランティア依頼の作成
initPage('teacher');

function submitRequest() {
  const subject = document.getElementById('reqSubject').value;
  const grade = document.getElementById('reqGrade').value;
  const detail = document.getElementById('reqDetail').value.trim();
  if (!subject || !grade) {
    alert('教科と対象学年を選んでください');
    return;
  }
  if (!detail) {
    alert('依頼内容を入力してください');
    return;
  }
  state.request = {
    subject: subject,
    grade: grade,
    date: document.getElementById('reqDate').value,
    time: document.getElementById('reqTime').value,
    detail: detail
  };
  // 依頼を出し直したときは前の状態をリセット
  state.asked = '';
  state.matched = false;
  saveState();
  location.href = 'matching.html';
}
