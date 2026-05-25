"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center font-sans">
        <div className="text-4xl">⚠</div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Critical error</h1>
          <p className="mt-1 text-sm text-gray-500">
            The application crashed unexpectedly.
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-gray-400">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Reload app
        </button>
      </body>
    </html>
  );
}
