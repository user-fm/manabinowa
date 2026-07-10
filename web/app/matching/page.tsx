"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function MatchingPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/matching.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - マッチング候補</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
        <link rel="stylesheet" href="/css/matching.css" />
      </Head>

      <div className="header" id="header"></div>

      <div className="container">
        <div className="crumbs">
          <a href="/teacher">ホーム</a> ＞ <a href="/request">依頼の作成</a> ＞ マッチング候補
        </div>

        <button className="back" onClick={() => (window.location.href = "/teacher")}>
          ← もどる
        </button>

        <h2>マッチング候補</h2>

        <div className="loading" id="loading">
          <span className="spinner"></span>
          AIが条件の合うボランティアを探しています...
        </div>

        <div id="candidates"></div>

        <div className="waiting-note" id="waitingNote">
          依頼を送りました。相手の承諾を待っています（期限は48時間）。<br />
          <small>
            デモ：下のメニューでボランティア画面に切り替えると続きが見られます。
          </small>
        </div>
      </div>
    </>
  );
}
