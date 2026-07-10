"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitPayload } from "../types";

export default function SubmitPage() {
  const router = useRouter();
  
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [errorDescription, setErrorDescription] = useState<string>("");
  const [githubToken, setGithubToken] = useState<string>("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!repoUrl.trim() || !errorDescription.trim()) {
      return;
    }

    const payload: SubmitPayload = {
      repo_url: repoUrl.trim(),
      error_description: errorDescription.trim(),
      github_token: githubToken.trim() || undefined,
    };

    // Save payload to session storage so /healing can access it
    sessionStorage.setItem("healingPayload", JSON.stringify(payload));
    
    // Navigate to healing progress page
    router.push("/healing");
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col font-sans px-4 py-8">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col pt-10">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors mb-8 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Submit your broken app
          </h1>
          <p className="mt-2 text-gray-400 text-sm">
            Supports Python, Java, and JavaScript repos
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
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
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
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-white placeholder-gray-500
                  font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  resize-y
                  transition-colors
                "
              />
            </div>

            {/* GitHub Token (Optional) */}
            <div>
              <label
                htmlFor="github-token"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                GitHub Personal Access Token (optional)
              </label>
              <input
                id="github-token"
                type="password"
                placeholder="ghp_... (required to open a PR)"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-colors
                "
              />
              <p className="mt-2 text-xs text-gray-500">
                Create a token at github.com/settings/tokens with 'repo' scope. We never store your token.
              </p>
            </div>

            {/* Submit Button */}
            <button
              id="submit-button"
              type="submit"
              className="
                w-full py-3 px-6 rounded-lg font-bold text-white
                bg-indigo-600 hover:bg-indigo-500
                focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900
                transition-colors duration-150
              "
            >
              Start healing &rarr;
            </button>
          </form>
        </div>

        {/* Privacy Note */}
        <p className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
          <span>🔒</span> Your code runs in an isolated sandbox. We never store your source code.
        </p>

      </div>
    </main>
  );
}
