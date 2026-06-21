// 指導の振り返り＋AI要約（E-13〜E-16）
initPage();

let star = 0;

function makeSummary() {
  const t = document.getElementById('teacherNote').value.trim();
  const v = document.getElementById('volNote').value.trim();
  const subject = state.request ? state.request.subject : '算数';

  // それっぽい要約をその場で組み立てる（実際はAIが生成する想定）
  let text = '今回は「' + subject + '」の個別指導を行いました。';
  if (t) text += '担当教師は、' + t.replace(/。$/, '') + 'と振り返っています。';
  if (v) text += 'ボランティアは、' + v.replace(/。$/, '') + 'としています。';
  text += '次回は理解の定着と応用への接続が期待されます。';

  document.getElementById('summaryText').textContent = text;
  document.getElementById('summaryBox').style.display = 'block';
}

function setStar(n) {
  star = n;
  const items = document.getElementById('stars').children;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('on', i < n);
  }
}

function saveReflection() {
  toast('振り返りを保存しました。おつかれさまでした');
  setTimeout(goHome, 900);
}
