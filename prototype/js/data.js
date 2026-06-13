// ダミーデータと初期状態

// マッチング候補のボランティア
const volunteers = [
  { name: '山本 さくら', subjects: '算数・数学、英語', grades: '小4〜中3', time: '土日 13:00〜17:00', rating: 4.8, count: 32, match: 92 },
  { name: '佐々木 健', subjects: '算数、理科', grades: '小4〜小6', time: '平日 19:00〜21:00', rating: 4.6, count: 21, match: 84 },
  { name: '中村 ゆい', subjects: '国語、算数', grades: '小1〜小6', time: '水・金 16:00〜18:00', rating: 4.9, count: 45, match: 77 }
];

// 初回アクセス時の状態。これをコピーしてsessionStorageに持つ
const INITIAL_DATA = {
  role: '',
  skillDone: false,    // ボランティアのスキル登録済みか
  request: null,       // 教師が作った依頼
  asked: '',           // 依頼を送った相手の名前
  matched: false,      // 承諾済みかどうか
  consent: false,      // 保護者の同意が済んでいるか

  // 地域からの依頼（教師の受信箱）
  community: [
    { id: 1, from: 'みなと商店街振興組合', cat: 'ポスター制作', title: '夏祭りポスターの制作', due: '7/10',
      text: '8月に開催する夏祭りの告知ポスターを、図工の時間などで作っていただけないでしょうか。', status: '' },
    { id: 2, from: '和菓子処 つきの屋', cat: '講師派遣', title: '和菓子づくり体験の講師', due: '9/18',
      text: '総合学習の時間に、職人が和菓子づくりの実演と指導にうかがいます。', status: '' }
  ],
  myRequestIds: [],    // 地域住民が送った依頼のid

  // 教材ライブラリ
  library: [
    { title: '地域の歴史かるた素材', cat: 'その他', from: 'みなと郷土史の会' },
    { title: '防災マップづくり資料', cat: '行事参加', from: '港区防災協議会' }
  ],

  // AI監視のアラート
  alerts: [
    { level: '中', text: 'れんらく先を教えてほしい、という発言を検知', time: '6/10 16:42', done: false },
    { level: '低', text: '軽い言葉づかいの乱れ（記録のみ）', time: '6/9 17:05', done: true }
  ]
};
