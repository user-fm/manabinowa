// 生徒ホーム
// 保護者の同意が終わるまでは機能制限の表示にする
initPage('student');

const box = document.getElementById('studentBody');

if (!state.consent) {
  box.innerHTML = '<div class="restrict">'
    + '<h3>保護者の方の同意を待っています</h3>'
    + '<p>保護者の方あてに、同意のお願いメールをお送りしています。同意が完了すると、オンライン指導などの機能が使えるようになります。</p>'
    + '<button class="btn btn-small" onclick="location.href=\'consent.html\'">（デモ）保護者メールのリンクを開く</button>'
    + '</div>';
} else {
  let ses = 'まだ予定はありません。';
  if (state.matched) {
    ses = '6/24（水）16:00〜　算数の個別指導<br><small>Meetの招待が届いています。</small>';
  }
  box.innerHTML = '<div class="cards">'
    + '<div class="card" onclick="openSession()">'
    + '<h3>次のセッション</h3><p>' + ses + '</p>'
    + '<span class="badge ' + (state.matched ? 'badge-on' : '') + '">' + (state.matched ? '予定あり' : '予定なし') + '</span>'
    + '</div>'
    + '<div class="card"><h3>見守りについて</h3>'
    + '<p>チャットの内容はAIが安全を確認します。学校の環境によっては初回の指導を録画します。困ったことがあったら、いつでも先生に相談してください。</p>'
    + '</div>'
    + '</div>';
}
