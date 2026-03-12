"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [productTitle, setProductTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (!sessionId || !orderId) { setStatus("error"); return; }

    const check = () =>
      fetch(`/api/checkout/session?session_id=${sessionId}&order_id=${orderId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.paid) {
            setStatus("paid");
            setProductTitle(d.productTitle);
            setFileUrl(d.fileUrl);
          } else {
            setStatus("pending");
          }
        })
        .catch(() => setStatus("error"));

    check();
  }, [sessionId, orderId]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <svg className="animate-spin text-black/30 dark:text-white/30" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  if (status === "error" || status === "pending") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black p-8">
        <div className="text-center max-w-xs">
          <p className="text-sm text-black/50 dark:text-white/50">
            {status === "pending"
              ? "Your payment is processing. You'll receive a download link by email shortly."
              : "Something went wrong. If you were charged, please contact support."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black p-8">
      <div className="text-center max-w-xs flex flex-col items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-black dark:text-white">Payment successful!</h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-1">
            Thanks for purchasing <strong>{productTitle}</strong>
          </p>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-2 rounded-lg bg-black dark:bg-white px-5 text-sm font-semibold text-white dark:text-black transition-opacity hover:opacity-80"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {productTitle}
          </a>
        )}
        <p className="text-xs text-black/30 dark:text-white/30">
          A copy has also been emailed to you.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
