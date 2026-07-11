// オンライン指導セッション
// 教師とボランティアの両方から開くので、役割はそのまま引き継ぐ
initPage();

if (state.asked) {
  document.getElementById('volMember').textContent = state.asked + 'さん';
}

// AI検知のデモ用ワード。実際はAIが文脈ごと判定する想定
// 緊急はセッションを一時停止、高・中は管理者への通知どまり
const urgentWords = ['会おう', '会いに', '家に来', '二人だけ', 'ないしょ'];
const highWords = ['住所', '電話番号'];
const midWords = ['LINE', 'ライン', '連絡先', 'れんらく先', 'インスタ', 'メアド'];
const replies = ['わかりました！', 'ありがとうございます。', 'はい、大丈夫です！'];

function checkLevel(text) {
  function hit(words) {
    return words.some(function(w) { return text.indexOf(w) !== -1; });
  }
  if (hit(urgentWords)) return '緊急';
  if (hit(highWords)) return '高';
  if (hit(midWords)) return '中';
  return '';
}

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

  const level = checkLevel(text);

  if (level) {
    setTimeout(function() {
      if (level === '緊急') {
        addMessage('warn', '⚠ AIが緊急性の高い内容を検知したため、セッションを一時停止しました。学校管理者に通知しています。');
        pauseSession();
      } else {
        addMessage('warn', '⚠ AIがこのメッセージを検知しました。記録のうえ学校管理者に通知されます。');
      }
    }, 700);
    state.alerts.unshift({
      level: level,
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

// 緊急検知のときはチャットを止めて確認待ちにする
function pauseSession() {
  document.getElementById('chatInput').disabled = true;
  document.querySelector('.chat-input .btn').disabled = true;
  document.getElementById('pauseCover').style.display = 'flex';
}

function endSession() {
  // 振り返り＋AI要約の画面へ（E-13〜E-16）
  location.href = 'reflection.html';
}

// ホワイトボード（画面共有・書き込みのモック）
const wb = document.getElementById('wb');
const wbCtx = wb.getContext('2d');
let penColor = '#333333';
let drawing = false;

wb.width = wb.clientWidth; // 見た目の幅と描く幅を合わせる

wb.addEventListener('pointerdown', function(e) {
  drawing = true;
  wbCtx.beginPath();
  wbCtx.moveTo(e.offsetX, e.offsetY);
});
wb.addEventListener('pointermove', function(e) {
  if (!drawing) return;
  wbCtx.strokeStyle = penColor;
  wbCtx.lineWidth = 2;
  wbCtx.lineCap = 'round';
  wbCtx.lineTo(e.offsetX, e.offsetY);
  wbCtx.stroke();
});
window.addEventListener('pointerup', function() { drawing = false; });

function setPen(btn) {
  penColor = btn.dataset.color;
  const btns = document.querySelectorAll('.wb-tools button[data-color]');
  btns.forEach(function(b) { b.classList.toggle('on', b === btn); });
}

function clearBoard() {
  wbCtx.clearRect(0, 0, wb.width, wb.height);
}
