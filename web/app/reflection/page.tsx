"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function ReflectionPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/reflection.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - 指導の振り返り</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
        <link rel="stylesheet" href="/css/reflection.css" />
      </Head>

      <div className="header" id="header"></div>

      <div className="container">
        <div className="crumbs">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // @ts-ignore
              if (typeof goHome === "function") goHome();
            }}
          >
            ホーム
          </a>
          ＞ 指導の振り返り
        </div>

        <h2>指導の振り返り</h2>

        <p className="lead">
          教師・ボランティアそれぞれが入力します。内容をもとにAIが要約をつくります。
        </p>

        <div className="form-box">
          <label>教師の振り返り</label>
          <textarea
            id="teacherNote"
            placeholder="児童の様子や理解度など"
            defaultValue="分数の通分でつまずいていた児童が、図を使った説明で自分で解けるようになった。"
          />

          <label>ボランティアの振り返り</label>
          <textarea
            id="volNote"
            placeholder="指導した内容や、次回への引き継ぎなど"
            defaultValue="図解を中心に進めた。次回は文章題への応用に入れそう。"
          />

          <button
            className="btn btn-gray"
            onClick={() => {
              // @ts-ignore
              if (typeof makeSummary === "function") makeSummary();
            }}
          >
            AIで要約をつくる
          </button>

          <div className="summary" id="summaryBox" style={{ display: "none" }}>
            <div className="summary-label">AIによる要約</div>
            <p id="summaryText"></p>
          </div>

          <label className="rate-label">ボランティアの評価</label>
          <div className="stars" id="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => {
                  // @ts-ignore
                  if (typeof setStar === "function") setStar(n);
                }}
              >
                ★
              </span>
            ))}
          </div>

          <label>録画リンク（任意）</label>
          <input
            type="text"
            id="recLink"
            placeholder="録画した場合はリンクを貼り付け"
          />

          <button
            className="btn"
            onClick={() => {
              // @ts-ignore
              if (typeof saveReflection === "function") saveReflection();
            }}
          >
            保存して終了
          </button>
        </div>
      </div>
    </>
  );
}
