// ボランティアホーム
initPage('volunteer');
render();

function render() {
  if (state.skillDone) {
    const badge = document.getElementById('skillBadge');
    badge.textContent = '登録済み';
    badge.className = 'badge badge-on';
  }

  // 学校からの依頼
  const box = document.getElementById('incomingBox');
  if (state.asked && !state.matched) {
    box.innerHTML = '<p><b>hal小学校</b>から依頼が届いています。<br>'
      + '<small>' + state.request.subject + '／' + state.request.grade + '／'
      + state.request.date + ' ' + state.request.time + '〜（回答期限：48時間）</small></p>'
      + '<button class="btn btn-small" onclick="answerRequest(true)">承諾する</button> '
      + '<button class="btn btn-small btn-gray" onclick="answerRequest(false)">辞退する</button>';
  } else if (state.matched) {
    box.innerHTML = '<p>6/24（水）16:00〜　hal小学校の算数指導<br><small>承諾済み。Meetの招待が届いています。</small></p>';
  } else {
    box.innerHTML = '<p>新しい依頼はありません。</p>';
  }

  // セッションのカード
  if (state.matched) {
    const sBadge = document.getElementById('sessionBadge');
    sBadge.textContent = '予定あり';
    sBadge.className = 'badge badge-on';
    document.getElementById('sessionText').textContent = '6/24（水）16:00〜　hal小学校／算数';
  }
}

function answerRequest(yes) {
  if (yes) {
    state.matched = true;
    toast('承諾しました。Meetの予定が自動で作成され、招待が届きます');
  } else {
    state.asked = '';
    toast('辞退しました。学校側には次の候補が案内されます');
  }
  saveState();
  render();
}
