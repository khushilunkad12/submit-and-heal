/**
 * Submit and Heal — Main Page
 * --------------------------------
 * Renders the submission form and handles communication with the
 * FastAPI backend at /api/submit.
 */

"use client";

import { useState, FormEvent } from "react";

// ----- Types ----------------------------------------------------------------

/** Shape of the JSON body we POST to the backend */
interface SubmitPayload {
  repo_url: string;
  error_description: string;
}

/** Shape of the AI Diagnosis */
interface DiagnosisResult {
  root_cause: string;
  affected_files: string[];
  confidence: string;
  fix_direction: string;
  error_category: string;
}

interface PatchedFile {
  file_path: string;
  original_content: string;
  patched_content: string;
  explanation: string;
}

interface FixResult {
  patched_files: PatchedFile[];
  patch_summary: string;
  confidence: string;
}

/** Shape of the response the backend returns */
interface SubmitResponse {
  status: string;
  repo_url?: string;
  error_description?: string;
  message: string;
  detected_stack?: string;
  file_list?: string[];
  readme_preview?: string;
  diagnosis?: DiagnosisResult;
  fix?: FixResult;
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
        console.log("Raw response json:", json);
        console.log("Raw file_list:", json.file_list);
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
    <main className="min-h-screen bg-gray-950 flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-2xl flex-1">

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
                  Cloning &amp; Inspecting…
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
                ? "bg-gray-900 border-gray-800"
                : "bg-red-950/50 border-red-900/50"
              }
            `}
          >
            <h2
              className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
                result.ok ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.ok ? "✅ Repository Inspected" : "❌ Error"}
            </h2>

            {result.ok ? (
              <div className="space-y-5">
                {/* Detected Stack Badge */}
                {result.data.detected_stack && (
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 text-sm font-medium">Detected Stack:</span>
                    <span className="px-3 py-1 bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 rounded-full text-xs font-semibold uppercase tracking-wide">
                      {result.data.detected_stack}
                    </span>
                  </div>
                )}

                {/* File List */}
                {result.data.file_list && result.data.file_list.length > 0 && (
                  <details className="group border border-gray-800 rounded-lg bg-gray-950/50 overflow-hidden">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 flex justify-between items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      <span>Repository Files ({result.data.file_list.length})</span>
                      <span className="text-gray-500 group-open:rotate-180 transition-transform duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-gray-800 bg-gray-900">
                      <ul className="text-xs font-mono text-gray-400 space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {result.data.file_list.slice(0, 100).map((file, i) => (
                          <li key={i} className="break-all" title={file}>
                            {file}
                          </li>
                        ))}
                        {result.data.file_list.length > 100 && (
                          <li className="text-indigo-400 italic mt-2">
                            Showing 100 of {result.data.file_list.length} files
                          </li>
                        )}
                      </ul>
                    </div>
                  </details>
                )}

                {/* README Preview */}
                {result.data.readme_preview && (
                  <div className="border border-gray-800 rounded-lg overflow-hidden flex flex-col bg-gray-950/50">
                    <div className="bg-gray-800/50 px-4 py-2.5 border-b border-gray-800 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      README Preview
                    </div>
                    <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {result.data.readme_preview}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Diagnosis Section */}
                {result.data.diagnosis && (
                  <div className="border border-indigo-900/50 rounded-lg overflow-hidden flex flex-col bg-indigo-950/20 mt-6">
                    <div className="bg-indigo-900/40 px-4 py-3 border-b border-indigo-900/50 flex justify-between items-center">
                      <span className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        AI Diagnosis
                      </span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          result.data.diagnosis.error_category.includes('runtime') ? 'bg-red-900/50 text-red-300' :
                          result.data.diagnosis.error_category.includes('config') ? 'bg-yellow-900/50 text-yellow-300' :
                          result.data.diagnosis.error_category.includes('dependency') ? 'bg-orange-900/50 text-orange-300' :
                          'bg-gray-800 text-gray-300'
                        }`}>
                          {result.data.diagnosis.error_category.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          result.data.diagnosis.confidence === 'high' ? 'bg-green-900/50 text-green-300' :
                          result.data.diagnosis.confidence === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {result.data.diagnosis.confidence} confidence
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      {/* Root Cause */}
                      <div>
                        <h3 className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider mb-2">Root Cause</h3>
                        <p className="text-base text-gray-200 leading-relaxed">
                          {result.data.diagnosis.root_cause}
                        </p>
                      </div>
                      
                      {/* Fix Direction */}
                      <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-md p-4">
                        <h3 className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider mb-2">Recommended Fix</h3>
                        <p className="text-sm text-indigo-200/90 leading-relaxed">
                          {result.data.diagnosis.fix_direction}
                        </p>
                      </div>

                      {/* Affected Files */}
                      {result.data.diagnosis.affected_files && result.data.diagnosis.affected_files.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Likely Affected Files</h3>
                          <ul className="flex flex-wrap gap-2">
                            {result.data.diagnosis.affected_files.map((f, i) => (
                              <li key={i} className="px-2 py-1 bg-gray-900 border border-gray-800 rounded text-xs font-mono text-gray-400">
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fix Section */}
                {result.data.diagnosis && !result.data.fix && (
                  <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-900/50">
                    <p className="text-sm text-yellow-300 leading-relaxed">
                      ⚠️ Confidence too low for auto-fix — please review the diagnosis manually
                    </p>
                  </div>
                )}
                
                {result.data.fix && (
                  <div className="border border-green-900/50 rounded-lg overflow-hidden flex flex-col bg-green-950/20 mt-6">
                    <div className="bg-green-900/40 px-4 py-3 border-b border-green-900/50 flex justify-between items-center">
                      <span className="text-sm font-bold text-green-300 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        Generated Fix
                      </span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          result.data.fix.confidence === 'high' ? 'bg-green-900/50 text-green-300' :
                          result.data.fix.confidence === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {result.data.fix.confidence} confidence
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 space-y-6">
                      <div className="bg-green-900/20 border border-green-500/20 rounded-md p-4">
                        <p className="text-sm text-green-200/90 leading-relaxed font-semibold">
                          {result.data.fix.patch_summary}
                        </p>
                      </div>

                      {result.data.fix.patched_files && result.data.fix.patched_files.length === 0 && (
                        <div className="text-sm text-red-300">Fix agent could not generate file patches.</div>
                      )}

                      {result.data.fix.patched_files && result.data.fix.patched_files.map((file, i) => (
                        <div key={i} className="space-y-3">
                          <h4 className="text-sm font-bold text-gray-300 border-b border-gray-800 pb-2">{file.file_path}</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="border border-red-900/30 rounded flex flex-col overflow-hidden">
                              <div className="bg-red-900/20 px-3 py-1.5 border-b border-red-900/30 text-xs font-semibold text-red-400">Original</div>
                              <pre className="p-3 bg-gray-950/50 text-xs text-gray-300 overflow-x-auto max-h-96 custom-scrollbar whitespace-pre-wrap">{file.original_content}</pre>
                            </div>
                            <div className="border border-green-900/30 rounded flex flex-col overflow-hidden">
                              <div className="bg-green-900/20 px-3 py-1.5 border-b border-green-900/30 text-xs font-semibold text-green-400">Fixed</div>
                              <pre className="p-3 bg-gray-950/50 text-xs text-gray-300 overflow-x-auto max-h-96 custom-scrollbar whitespace-pre-wrap">{file.patched_content}</pre>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 italic bg-gray-900/50 p-2 rounded">{file.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-900/50">
                <p className="text-sm text-red-300 leading-relaxed">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
        
      {/* Footer hint */}
      <p className="mt-8 text-center text-xs text-gray-600">
        Backend: <code className="text-gray-500">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code>
      </p>
    </main>
  );
}
