// 全ページ共通の処理
// 状態はsessionStorageに入れて、ページをまたいで引き継ぐ

const roleNames = {
  teacher: '教師',
  student: '生徒',
  volunteer: 'ボランティア',
  community: '地域住民・団体',
  admin: '学校管理者',
  board: '教育委員会'
};

function loadState() {
  const saved = sessionStorage.getItem('manabinowa');
  if (saved) return JSON.parse(saved);
  return JSON.parse(JSON.stringify(INITIAL_DATA)); // 初回はコピーを作る
}

function saveState() {
  sessionStorage.setItem('manabinowa', JSON.stringify(state));
}

let state = loadState();

// ヘッダーとデモ用バーは全ページ共通なのでここで組み立てる。
// roleを渡すと、その役割でログインした扱いになる
function initPage(role) {
  if (role) {
    state.role = role;
    saveState();
  }

  const header = document.getElementById('header');
  if (header && state.role) {
    header.innerHTML = '<a class="header-brand" href="' + homeUrl() + '">'
      + '<img src="img/logo_48.png" alt="" class="header-logo">'
      + '<span class="header-title">まなびのわ</span></a>'
      + '<span class="header-role">' + roleNames[state.role] + '</span>'
      + '<button class="logout-btn" onclick="logout()">ログアウト</button>';
    header.style.display = 'flex';
  }

  // フッター（全ページ共通。リンク先はまだないのでダミー）
  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerHTML = '<a href="#">利用規約</a><a href="#">プライバシーポリシー</a>'
    + '<a href="#">ヘルプ</a><a href="#">お問い合わせ</a>'
    + '<small>© 2026 まなびのわ</small>';
  document.body.appendChild(footer);

  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.innerHTML = '<span>役割切り替えメニュー</span>'
    + '<select onchange="if(this.value)location.href=this.value">'
    + '<option value="">画面を切り替え...</option>'
    + '<option value="teacher.html">教師</option>'
    + '<option value="student.html">生徒</option>'
    + '<option value="volunteer.html">ボランティア</option>'
    + '<option value="community.html">地域住民・団体</option>'
    + '<option value="admin.html">学校管理者</option>'
    + '<option value="board.html">教育委員会</option>'
    + '<option value="consent.html">保護者（同意画面）</option>'
    + '</select>'
    + '<span class="demo-note">画面プロトタイプです。入力内容は保存されません。</span>';
  document.body.appendChild(bar);
}

function login(role) {
  state.role = role;
  saveState();
  goHome();
}

function logout() {
  sessionStorage.removeItem('manabinowa');
  location.href = 'index.html';
}

// 役割ごとのホーム。未ログインならログイン画面
function homeUrl() {
  const pages = {
    teacher: 'teacher.html',
    student: 'student.html',
    volunteer: 'volunteer.html',
    community: 'community.html',
    admin: 'admin.html',
    board: 'board.html'
  };
  return pages[state.role] || 'index.html';
}

function goHome() {
  location.href = homeUrl();
}

// セッションは教師とボランティアの両方から開くのでここに置いている
function openSession() {
  if (!state.matched) {
    alert('予定されているセッションはありません。\nマッチングが成立すると参加できます。');
    return;
  }
  location.href = 'session.html';
}

function toast(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(function() { div.remove(); }, 3500);
}
