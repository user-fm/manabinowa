"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function LibraryPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/library.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - 教材ライブラリ</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
      </Head>

      <div className="header" id="header"></div>

      <div className="container">
        <div className="crumbs">
          <a href="/teacher">ホーム</a> ＞ 教材ライブラリ
        </div>

        <button className="back" onClick={() => (window.location.href = "/teacher")}>
          ← もどる
        </button>

        <h2>教材ライブラリ</h2>

        <input
          type="text"
          className="search"
          id="libSearch"
          placeholder="キーワードで検索"
          onInput={() => {
            // gọi hàm JS cũ
            // @ts-ignore
            if (typeof renderLibrary === "function") renderLibrary();
          }}
        />

        <div id="libList"></div>
      </div>
    </>
  );
}
