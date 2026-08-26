"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { logDaliliError } from "@/lib/error-log";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logDaliliError("Global page error", error, error.digest ? `Digest: ${error.digest}` : undefined);
  }, [error]);

  return (
    <html>
      <body>
        <main className="min-h-screen bg-[#f2f4f7] px-6 py-10 text-[#102033]">
          <section className="mx-auto max-w-2xl rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">Something went wrong</p>
                <h1 className="mt-2 text-2xl font-black text-[#102033]">This page could not load.</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Dalili saved a local error note so you can share it during testing. Try reloading the page. If it happens again, open Help & Testing and copy the error log.
                </p>
                <button
                  onClick={reset}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#073B2A] px-4 py-2 text-sm font-bold text-white"
                >
                  <RefreshCcw className="h-4 w-4" /> Try again
                </button>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
