// ロール間メッセージ（F-MSG）
// 大人ロールのみ。生徒は対象外。AI監視なし。
initPage();

// 生徒が直接来た場合はガード
if (state.role === 'student') {
  document.querySelector('.container').innerHTML =
    '<h2>メッセージ</h2><p class="lead">この機能は大人の関係者どうしの連絡用です。</p>';
  throw new Error('student is not allowed');
}

// 役割ごとの連絡相手（モック用の固定リスト）
const contactsByRole = {
  teacher: ['山本 さくら（ボランティア）', 'みなと商店街振興組合（地域）', 'まなびのわ運営'],
  volunteer: ['田中先生（教師）', 'まなびのわ運営'],
  community: ['田中先生（教師）', 'まなびのわ運営'],
  admin: ['田中先生（教師）', 'まなびのわ運営'],
  board: ['学校管理者', 'まなびのわ運営'],
  operator: ['田中先生（教師）', '山本 さくら（ボランティア）', '学校管理者']
};

const replies = ['承知しました。', 'ありがとうございます、確認します。', 'では、その方向で進めましょう。'];
const contacts = contactsByRole[state.role] || ['まなびのわ運営'];
let current = null;

function renderContacts() {
  let html = '';
  contacts.forEach(function(name) {
    const on = name === current ? ' on' : '';
    html += '<button class="contact' + on + '" onclick="openThread(\'' + name + '\')">' + name + '</button>';
  });
  document.getElementById('contactList').innerHTML = html;
}

function openThread(name) {
  current = name;
  if (!state.threads[name]) state.threads[name] = [];
  document.getElementById('threadHead').textContent = name;
  renderContacts();
  renderLog();
}

function renderLog() {
  const log = document.getElementById('threadLog');
  const list = state.threads[current] || [];
  log.innerHTML = list.map(function(m) {
    return '<div class="bubble ' + (m.me ? 'me' : 'other') + '">' + m.text + '</div>';
  }).join('');
  log.scrollTop = log.scrollHeight;
}

function sendMsg() {
  if (!current) { alert('先に相手を選んでください'); return; }
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  state.threads[current].push({ me: true, text: text });
  saveState();
  renderLog();
  // 相手からの返信（モック）
  setTimeout(function() {
    state.threads[current].push({ me: false, text: replies[Math.floor(Math.random() * replies.length)] });
    saveState();
    renderLog();
  }, 1000);
}

renderContacts();
openThread(contacts[0]); // 最初の相手を開いておく
