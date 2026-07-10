"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function InquiryPage() {
  useEffect(() => {

    const loadScript = (src: string) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript("/js/data.js");
    loadScript("/js/common.js");
    loadScript("/js/inquiry.js");
  }, []);

  return (
    <>
      <Head>
        <title>まなびのわ - お問い合わせ</title>
        <link rel="icon" href="/img/logo_32.png" />
        <link rel="stylesheet" href="/css/common.css" />
      </Head>

      <div className="header" id="header"></div>

      <div className="container">
        <div className="crumbs">お問い合わせ</div>

        <h2>お問い合わせ</h2>

        <p className="lead">
          運営へのご質問・ご相談はこちらから。3営業日以内にお返事します。
        </p>

        <div id="inquiryBody"></div>
      </div>
    </>
  );
}
