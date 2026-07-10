"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function SessionPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/session.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - オンライン指導</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
        <link rel="stylesheet" href="/css/session.css" />
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
          ＞ オンライン指導
        </div>

        <button
          className="back"
          onClick={() => {
            // @ts-ignore
            if (typeof goHome === "function") goHome();
          }}
        >
          ← もどる
        </button>

        <h2>オンライン指導セッション</h2>

        <div className="session-area">
          <div className="meet-box">
            <p>Google Meet の画面（モック）</p>
            <div className="members">
              <span>田中先生</span>
              <span>ひかりさん</span>
              <span id="volMember">山本さん</span>
            </div>
          </div>

          <div className="chat-box">
            <div className="chat-title">チャット</div>

            <div className="chat-log" id="chatLog">
              <div className="msg system">
                チャットの内容はAIが自動でチェックしています
              </div>
            </div>

            <div className="chat-input">
              <input
                type="text"
                id="chatInput"
                placeholder="メッセージを入力"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // @ts-ignore
                    if (typeof sendChat === "function") sendChat();
                  }
                }}
              />

              <button
                className="btn btn-small"
                onClick={() => {
                  // @ts-ignore
                  if (typeof sendChat === "function") sendChat();
                }}
              >
                送信
              </button>
            </div>
          </div>
        </div>

        <p className="hint">
          デモ：「連絡先」「住所」などの言葉を含むメッセージを送ると、AI検知の動きが確認できます。
        </p>

        <button
          className="btn btn-gray"
          onClick={() => {
            // @ts-ignore
            if (typeof endSession === "function") endSession();
          }}
        >
          セッションを終了
        </button>
      </div>
    </>
  );
}
