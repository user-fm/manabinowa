// オンライン指導セッション
// 教師とボランティアの両方から開くので、役割はそのまま引き継ぐ
initPage();

if (state.asked) {
  document.getElementById('volMember').textContent = state.asked + 'さん';
}

const ngWords = ['LINE', 'ライン', '電話番号', '連絡先', 'れんらく先', '住所', 'インスタ', 'メアド'];
const replies = ['わかりました！', 'ありがとうございます。', 'はい、大丈夫です！'];

function addMessage(type, text) {
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('me', text);

  let hit = false;
  ngWords.forEach(function(w) {
    if (text.indexOf(w) !== -1) hit = true;
  });

  if (hit) {
    setTimeout(function() {
      addMessage('warn', '⚠ AIがこのメッセージを検知しました。記録のうえ学校管理者に通知されます。');
    }, 700);
    state.alerts.unshift({
      level: text.indexOf('住所') !== -1 ? '高' : '中',
      text: text,
      time: 'たった今',
      done: false
    });
    saveState();
    toast('学校管理者にアラートを送信しました');
  } else {
    setTimeout(function() {
      addMessage('other', replies[Math.floor(Math.random() * replies.length)]);
    }, 900);
  }
}

function endSession() {
  // 振り返り＋AI要約の画面へ（E-13〜E-16）
  location.href = 'reflection.html';
}
