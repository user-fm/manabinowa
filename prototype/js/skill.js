// スキル登録
initPage('volunteer');

function submitSkill() {
  state.skillDone = true;
  saveState();
  toast('スキルを登録しました。条件の合う依頼が届くとお知らせします');
  // トーストを見せてから戻る
  setTimeout(function() { location.href = 'volunteer.html'; }, 900);
}
