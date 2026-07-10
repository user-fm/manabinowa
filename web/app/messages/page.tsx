"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function MessagesPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/messages.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - メッセージ</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
        <link rel="stylesheet" href="/css/messages.css" />
      </Head>

      <div className="header" id="header"></div>

      <div className="container">
        <div className="crumbs">
          <a href="#" onClick={(e) => { e.preventDefault(); 
            // gọi hàm JS cũ
            // @ts-ignore
            if (typeof goHome === "function") goHome();
          }}>
            ホーム
          </a>
          ＞ メッセージ
        </div>

        <h2>メッセージ</h2>

        <p className="lead">
          関係する大人どうしの連絡用です。日程の相談などにお使いください。
        </p>

        <div className="msg-layout">
          <div className="contact-list" id="contactList"></div>

          <div className="thread">
            <div className="thread-head" id="threadHead">
              相手を選んでください
            </div>

            <div className="thread-log" id="threadLog"></div>

            <div className="thread-input">
              <input
                type="text"
                id="msgInput"
                placeholder="メッセージを入力"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // @ts-ignore
                    if (typeof sendMsg === "function") sendMsg();
                  }
                }}
              />
              <button
                className="btn btn-small"
                onClick={() => {
                  // @ts-ignore
                  if (typeof sendMsg === "function") sendMsg();
                }}
              >
                送信
              </button>
            </div>
          </div>
        </div>

        <p className="hint">
          このやり取りはAIによる監視の対象外です（児童は参加しないため）。
        </p>
      </div>
    </>
  );
}
