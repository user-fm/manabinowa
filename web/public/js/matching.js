// マッチング候補
initPage('teacher');

// 依頼を作らずに直接開いたときはフォームに戻す
if (!state.request) {
  location.href = 'request.html';
}

// AIで探している風の待ち時間
setTimeout(function() {
  document.getElementById('loading').style.display = 'none';
  renderCandidates();
  if (state.asked) {
    document.getElementById('waitingNote').style.display = 'block';
  }
}, 1500);

function renderCandidates() {
  let html = '';
  volunteers.forEach(function(v, i) {
    html += `
      <div class="candidate">
        <div class="avatar">${v.name.charAt(0)}</div>
        <div class="cand-info">
          <b>${v.name}</b>
          <small>${v.subjects} ／ ${v.grades} ／ ${v.time}</small>
          <small>★${v.rating}（これまでの指導 ${v.count}回）</small>
        </div>
        <div class="cand-right">
          <div class="match-rate">適合度 ${v.match}%</div>
          <button class="btn btn-small" onclick="sendRequest(${i})">この人に依頼</button>
        </div>
      </div>`;
  });
  document.getElementById('candidates').innerHTML = html;
}

function sendRequest(i) {
  state.asked = volunteers[i].name;
  saveState();
  document.getElementById('waitingNote').style.display = 'block';
  toast(state.asked + 'さんに依頼を送りました');
}
