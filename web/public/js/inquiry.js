// お問い合わせ（F-INQ）
// フォームは全ロール共通。カテゴリの選択肢だけ役割で変える。
// 生徒は対象外。未ログイン（保護者など）はメールアドレスを入力。
initPage();

const senderNames = {
  teacher: '田中先生',
  volunteer: '山本 さくら',
  community: '鈴木 大輔',
  admin: '学校管理者',
  board: '教育委員会 ご担当者'
};

// 共通カテゴリに、役割ごとの項目を足す
function categoriesFor(role) {
  const common = ['不具合の報告', '使い方について', 'その他'];
  if (role === 'volunteer') return ['ブロック解除の相談'].concat(common);
  if (role === 'community') return ['依頼について'].concat(common);
  if (!role) return ['同意手続きについて', '登録情報の削除（削除要求）'].concat(common); // 未ログイン（保護者想定）
  return common; // 教師・管理者・教育委員会
}

const body = document.getElementById('inquiryBody');

if (state.role === 'student') {
  // 児童は運営と直接やり取りしない方針（§10.4）
  body.innerHTML = '<div class="form-box">'
    + '<p>お問い合わせは、担任の先生にご相談ください。</p>'
    + '<p class="hint">こまったことや聞きたいことは、まず学校の先生に伝えてもらう仕組みになっています。</p>'
    + '</div>';
} else {
  const cats = categoriesFor(state.role);
  let html = '<div class="form-box">';

  if (state.role) {
    html += '<p class="hint">' + roleNames[state.role] + '（' + (senderNames[state.role] || '') + '）として送信します。</p>';
  } else {
    html += '<label>メールアドレス</label>'
      + '<input type="text" id="inqMail" placeholder="例）guardian@example.com">';
  }

  html += '<label>カテゴリ</label><select id="inqCat">';
  cats.forEach(function(c) { html += '<option>' + c + '</option>'; });
  html += '</select>';

  html += '<label>件名</label><input type="text" id="inqTitle" placeholder="例）ログインできない">'
    + '<label>お問い合わせ内容</label><textarea id="inqBody" placeholder="状況をできるだけ具体的にご記入ください"></textarea>'
    + '<button class="btn" onclick="submitInquiry()">送信する</button>'
    + '</div>';

  body.innerHTML = html;
}

function submitInquiry() {
  const title = document.getElementById('inqTitle').value.trim();
  const content = document.getElementById('inqBody').value.trim();
  if (!state.role) {
    const mail = document.getElementById('inqMail').value.trim();
    if (!mail) { alert('メールアドレスを入力してください'); return; }
  }
  if (!title || !content) {
    alert('件名と内容を入力してください');
    return;
  }
  const cat = document.getElementById('inqCat').value;
  if (cat.indexOf('削除') !== -1) {
    toast('削除のお手続きについて、本人確認のうえご連絡します');
  } else {
    toast('お問い合わせを受け付けました。受付メールをお送りします');
  }
  document.getElementById('inqTitle').value = '';
  document.getElementById('inqBody').value = '';
}
