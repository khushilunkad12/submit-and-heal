/**
 * Submit and Heal — Main Page
 * --------------------------------
 * Renders the submission form and handles communication with the
 * FastAPI backend at /api/submit.
 *
 * This is Step 1: frontend ↔ backend connection only (no AI logic).
 * Later steps will replace the response display with richer diagnostic UI.
 */

"use client";

import { useState, FormEvent } from "react";

// ----- Types ----------------------------------------------------------------

/** Shape of the JSON body we POST to the backend */
interface SubmitPayload {
  repo_url: string;
  error_description: string;
}

/** Shape of the response the backend returns */
interface SubmitResponse {
  status: string;
  repo_url: string;
  error_description: string;
  message: string;
}

/** Wrapper for either a success response or an error */
type ApiResult =
  | { ok: true; data: SubmitResponse }
  | { ok: false; error: string };

// ----- Component ------------------------------------------------------------

export default function Home() {
  // Form field state
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [errorDescription, setErrorDescription] = useState<string>("");

  // Request lifecycle state
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  /**
   * Handle form submission:
   * 1. Basic client-side guard (non-empty fields)
   * 2. POST to the backend
   * 3. Store result for display
   */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side guard — the backend also validates these
    if (!repoUrl.trim() || !errorDescription.trim()) {
      setResult({ ok: false, error: "Please fill in both fields before submitting." });
      return;
    }

    setLoading(true);
    setResult(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const payload: SubmitPayload = {
      repo_url: repoUrl.trim(),
      error_description: errorDescription.trim(),
    };

    try {
      const response = await fetch(`${apiUrl}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        // FastAPI validation errors come back as { detail: string | [...] }
        const detail = json?.detail;
        const msg =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
            ? detail.map((d: { msg: string }) => d.msg).join(", ")
            : `HTTP ${response.status}`;
        setResult({ ok: false, error: msg });
      } else {
        setResult({ ok: true, data: json as SubmitResponse });
      }
    } catch (err) {
      // Network error — backend likely not running
      setResult({
        ok: false,
        error:
          err instanceof Error
            ? `Network error: ${err.message}`
            : "Unknown network error. Is the backend running on port 8000?",
      });
    } finally {
      setLoading(false);
    }
  }

  // ----- Render -------------------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Submit &amp; Heal 🩺
          </h1>
          <p className="mt-3 text-gray-400 text-base">
            Paste your broken app&apos;s GitHub repo and describe the error.
            <br />
            An AI agent will diagnose and fix it.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* GitHub Repo URL */}
            <div>
              <label
                htmlFor="repo-url"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                GitHub Repo URL
              </label>
              <input
                id="repo-url"
                type="url"
                placeholder="https://github.com/your-org/broken-repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={loading}
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              />
            </div>

            {/* Error Description / Logs */}
            <div>
              <label
                htmlFor="error-description"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Describe the error / paste error logs
              </label>
              <textarea
                id="error-description"
                rows={8}
                placeholder={`TypeError: Cannot read properties of undefined (reading 'map')\n    at Component (/app/src/components/List.tsx:14:23)\n    at renderWithHooks ...`}
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                disabled={loading}
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-white placeholder-gray-500
                  font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  resize-y
                  transition-colors
                "
              />
            </div>

            {/* Submit Button */}
            <button
              id="submit-button"
              type="submit"
              disabled={loading}
              className="
                w-full py-3 px-6 rounded-lg font-semibold text-white
                bg-indigo-600 hover:bg-indigo-500
                disabled:bg-indigo-800 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900
                transition-colors duration-150
              "
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  {/* Simple CSS spinner */}
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Submitting…
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </form>
        </div>

        {/* Response Box */}
        {result !== null && (
          <div
            id="response-box"
            className={`
              mt-6 rounded-2xl border p-6
              ${result.ok
                ? "bg-green-950 border-green-800"
                : "bg-red-950 border-red-800"
              }
            `}
          >
            <h2
              className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
                result.ok ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.ok ? "✅ Response from backend" : "❌ Error"}
            </h2>

            {result.ok ? (
              /* Pretty-print the raw JSON response */
              <pre
                id="response-json"
                className="text-sm text-green-200 font-mono whitespace-pre-wrap break-all"
              >
                {JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-red-300 font-mono">{result.error}</p>
            )}
          </div>
        )}

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Backend: <code className="text-gray-500">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code>
        </p>
      </div>
    </main>
  );
}
