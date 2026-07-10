"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitResponse } from "../types";

const getCategoryTooltip = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes('runtime')) return "Bug that occurs while the program is running, not during compilation";
  if (c.includes('config')) return "Problem with settings, environment variables, or configuration files";
  if (c.includes('dependency')) return "Issue with a missing or incompatible library or package";
  if (c.includes('logic')) return "Code runs without crashing but produces wrong results";
  if (c.includes('network')) return "Problem with API calls, connections, or external services";
  return "Error category determined by AI analysis";
};

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    const dataStr = sessionStorage.getItem("healingResult");
    if (!dataStr) {
      router.replace("/submit");
      return;
    }
    
    try {
      const data = JSON.parse(dataStr) as SubmitResponse;
      setResult(data);
    } catch (e) {
      router.replace("/submit");
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const { diagnosis, fix, verify, deploy } = result;

  const handleDownloadPatch = () => {
    if (!result || !diagnosis || !fix) return;
    
    let content = `=== SUBMIT & HEAL PATCH ===\nGenerated: ${new Date().toISOString()}\nRepository: ${result.repo_url || 'Unknown'}\n\n`;
    content += `ROOT CAUSE:\n${diagnosis.root_cause}\n\n`;
    content += `WHY IT HAPPENED:\n${diagnosis.why_it_happened}\n\n`;
    content += `CONFIDENCE: ${diagnosis.confidence_percentage}%\n\n`;
    
    for (const f of fix.patched_files) {
      content += `=== FILE: ${f.file_path} ===\n--- ORIGINAL ---\n${f.original_content}\n\n+++ FIXED +++\n${f.patched_content}\n\nCHANGE EXPLANATION:\n${f.explanation}\n\n`;
    }
    
    content += `=== END PATCH ===`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submit-heal-patch-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-950 font-sans text-gray-200 px-4 py-10 pb-24">
      <div className="w-full max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight flex items-center justify-center gap-4">
            Your app has been healed <span className="text-green-500">✅</span>
          </h1>
          <p className="mt-4 text-gray-400">
            {result.repo_url}
          </p>
        </div>

        {/* Top Summary Cards (2x2 Grid) */}
        {diagnosis && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Root Cause */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md flex flex-col h-full">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Root Cause</h3>
              <p className="text-sm text-gray-200 leading-relaxed font-medium">
                {diagnosis.root_cause}
              </p>
            </div>

            {/* Card 2: Error Category */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md flex flex-col h-full">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                {diagnosis.bug_found === false ? 'Status' : 'Error Category'}
              </h3>
              <div className="mt-auto group relative inline-block w-fit">
                {diagnosis.bug_found === false ? (
                  <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">
                    BUG FREE
                  </span>
                ) : (
                  <>
                    <span 
                      title={getCategoryTooltip(diagnosis.error_category)}
                      className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider underline decoration-dotted underline-offset-4 cursor-help ${
                        diagnosis.error_category.includes('runtime') ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                        diagnosis.error_category.includes('config') ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30' :
                        'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {diagnosis.error_category.replace('_', ' ')}
                    </span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg text-center normal-case tracking-normal">
                      {getCategoryTooltip(diagnosis.error_category)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Card 3: Confidence */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md flex flex-col h-full">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                <div className="group relative inline-block">
                  <span 
                    className="underline decoration-dotted underline-offset-4 cursor-help" 
                    title="How certain the AI is about this diagnosis. Based on how clearly the error matches patterns in the code. Higher = more reliable fix."
                  >
                    AI Confidence
                  </span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg text-center normal-case tracking-normal font-normal">
                    How certain the AI is about this diagnosis. Based on how clearly the error matches patterns in the code. Higher = more reliable fix.
                  </div>
                </div>
                <span className={`${
                  diagnosis.confidence === 'high' ? 'text-green-400' :
                  diagnosis.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {diagnosis.confidence_percentage}%
                </span>
              </h3>
              <div className="mt-auto w-full h-2.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                <div 
                  className={`h-full rounded-full ${
                    diagnosis.confidence_percentage > 75 ? 'bg-green-500' :
                    diagnosis.confidence_percentage >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${diagnosis.confidence_percentage}%` }}
                />
              </div>
            </div>

            {/* Card 4: Files Changed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md flex flex-col h-full">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Files Changed</h3>
              <ul className="mt-auto flex flex-col gap-2">
                {fix?.patched_files && fix.patched_files.length > 0 ? (
                  fix.patched_files.map((f, i) => (
                    <li key={i} className="text-xs font-mono text-indigo-300 bg-indigo-950/30 border border-indigo-900/50 px-2 py-1.5 rounded truncate">
                      {f.file_path}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-gray-500 italic">No files modified</li>
                )}
              </ul>
            </div>
            
          </div>
        )}

        {/* Why this happened */}
        {diagnosis?.why_it_happened && (
          <div className="bg-gray-900/50 border-l-4 border-indigo-500 rounded-r-xl p-6 shadow-sm my-8">
            <h3 className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest mb-2">Why this happened</h3>
            <p className="text-gray-400 italic leading-relaxed text-sm">
              {diagnosis.why_it_happened}
            </p>
          </div>
        )}

        {/* Bug-Free Success State */}
        {diagnosis?.bug_found === false && (
          <section className="pb-8">
            <div className="w-full bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-10 text-center flex flex-col items-center shadow-lg">
              <div className="w-16 h-16 bg-emerald-900/40 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">
                All Clear! No bugs detected.
              </h2>
              <p className="text-gray-300 max-w-2xl text-lg leading-relaxed mb-8">
                We analyzed your repository and the code handles the reported issue correctly. It is completely bug-free and no fixes are required.
              </p>
              <Link 
                href="/submit"
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
              >
                Submit another repository
              </Link>
            </div>
          </section>
        )}

        {diagnosis?.bug_found !== false && (
          <>
            {/* Code Diffs Section */}
        {fix?.patched_files && fix.patched_files.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white tracking-tight mb-4">
              Code Fixes
            </h2>
            <div className="space-y-8">
              {fix.patched_files.map((file, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
                    <h4 className="text-sm font-bold text-gray-200">{file.file_path}</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Before */}
                    <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800">
                      <div className="bg-red-950/30 px-4 py-2 border-b border-red-900/30 text-xs font-bold text-red-400 uppercase tracking-widest flex justify-between items-center">
                        <span>Before</span>
                        <span className="text-[10px] bg-red-900/40 text-red-300 px-2 py-0.5 rounded">Buggy</span>
                      </div>
                      <pre className="p-4 bg-gray-950 text-xs text-gray-400 font-mono overflow-x-auto max-h-[400px] custom-scrollbar whitespace-pre-wrap flex-1">
                        {file.original_content}
                      </pre>
                    </div>
                    
                    {/* After */}
                    <div className="flex flex-col">
                      <div className="bg-green-950/30 px-4 py-2 border-b border-green-900/30 text-xs font-bold text-green-400 uppercase tracking-widest flex justify-between items-center">
                        <span>After</span>
                        <span className="text-[10px] bg-green-900/40 text-green-300 px-2 py-0.5 rounded">Fixed</span>
                      </div>
                      <pre className="p-4 bg-gray-950 text-xs text-gray-200 font-mono overflow-x-auto max-h-[400px] custom-scrollbar whitespace-pre-wrap flex-1">
                        {file.patched_content}
                      </pre>
                    </div>
                  </div>
                  
                  {file.explanation && (
                    <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-800 text-sm text-gray-400">
                      <span className="font-semibold text-gray-300">Explanation:</span> {file.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verification Box */}
        {verify && (
          <section>
            <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
              Verification <span className="text-gray-500 font-normal">| Sandbox Execution</span>
            </h2>
            <div className={`border rounded-2xl flex flex-col ${
              verify.verified ? 'border-emerald-900/50 bg-emerald-950/10' :
              verify.error ? 'border-red-900/50 bg-red-950/10' :
              'border-yellow-900/50 bg-yellow-950/10'
            }`}>
              <div className={`px-6 py-4 rounded-t-2xl border-b flex justify-between items-center ${
                verify.verified ? 'bg-emerald-900/20 border-emerald-900/50' :
                verify.error ? 'bg-red-900/20 border-red-900/50' :
                'bg-yellow-900/20 border-yellow-900/50'
              }`}>
                <span className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                  verify.verified ? 'text-emerald-400' :
                  verify.error ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {verify.verified ? (
                    <div className="group relative inline-block">
                      <span 
                        className="underline decoration-dotted underline-offset-4 cursor-help" 
                        title="We actually ran your fixed code in a secure isolated environment and confirmed it executes without errors"
                      >
                        ✅ Fix Verified — Your code runs successfully!
                      </span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-2 bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg text-center normal-case tracking-normal font-normal">
                        We actually ran your fixed code in a secure isolated environment and confirmed it executes without errors
                      </div>
                    </div>
                  ) : verify.error ? (
                    '❌ Fix needs review — code still has issues'
                  ) : (
                    '⚠️ Auto-verification skipped'
                  )}
                </span>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {verify.verified
                    ? "Our AI sandbox executed your fixed code and confirmed it runs without errors. The fix is safe to deploy."
                    : verify.error
                      ? "Our sandbox ran the fixed code but it still produced errors. The fix may be incomplete. Review the diagnosis and consider fixing manually."
                      : "Automatic code execution is not yet supported for this language. The fix looks correct based on AI analysis, but we recommend testing it manually before deploying."}
                </p>
                
                {/* Program Output Terminal */}
                {(verify.verified || (!verify.error && !verify.verified)) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">📤 Program Output</h4>
                    <div className="bg-[#0D1117] rounded-xl border border-gray-800 overflow-hidden shadow-inner">
                      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                      </div>
                      <pre className="p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {verify.output ? verify.output : "No output — code ran silently without errors"}
                      </pre>
                    </div>
                  </div>
                )}
                
                {verify.error && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider">⚠️ Error Output</h4>
                    <div className="bg-[#0D1117] rounded-xl border border-red-900/50 overflow-hidden shadow-inner">
                      <pre className="p-4 text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
                        {verify.error}
                      </pre>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 flex items-center gap-1.5 pt-4 border-t border-gray-800/50">
                  <span>🔒</span> 
                  <span className="group relative inline-block">
                    <span 
                      className="underline decoration-dotted underline-offset-4 cursor-help" 
                      title="Your code runs in a temporary container that is completely separate from your real repository. Nothing is changed until you approve the PR."
                    >
                      Your code runs in an isolated sandbox
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg text-center normal-case tracking-normal">
                      Your code runs in a temporary container that is completely separate from your real repository. Nothing is changed until you approve the PR.
                    </span>
                  </span>
                  <span>— nothing affects your real repository</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Deploy Section & Footer Action */}
        <section className="pt-8 border-t border-gray-800/50 flex flex-col items-center">
          
          {deploy?.success ? (
            <div className="w-full max-w-2xl bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 mb-8 text-center flex flex-col items-center">
              <span className="text-emerald-400 font-bold text-lg mb-2 flex items-center gap-2">
                ✅ Pull Request Created!
              </span>
              <p className="text-gray-300 text-sm mb-6">
                We've successfully opened a PR on your repository containing this fix.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a 
                  href={deploy.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  View PR on GitHub &rarr;
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-4 font-mono">Branch: {deploy.branch_name}</p>
            </div>
          ) : deploy?.success === false ? (
            <div className="w-full max-w-2xl bg-red-950/20 border border-red-900/50 rounded-2xl p-6 mb-8 text-center flex flex-col items-center">
              <span className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                ❌ Deployment Failed
              </span>
              <p className="text-red-300/80 text-sm mb-6">
                {deploy.message}
              </p>
              <Link 
                href="/submit"
                className="px-6 py-3 bg-red-900/50 hover:bg-red-800/50 text-red-200 font-medium rounded-lg border border-red-800 transition-colors"
              >
                Try again
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-8">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  disabled 
                  className="px-6 py-3 bg-indigo-600/50 text-white/50 font-medium rounded-lg cursor-not-allowed border border-indigo-500/20 flex items-center gap-2"
                  title="Coming soon!"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  Open PR on GitHub
                </button>
                <button onClick={handleDownloadPatch} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg border border-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download patch
                </button>
              </div>
              <p className="mt-4 text-xs text-indigo-400/80 bg-indigo-950/30 px-4 py-2 rounded-full border border-indigo-900/50">
                💡 Add your GitHub token on the submit page to auto-create a PR
              </p>
            </div>
          )}
          
          <Link href="/submit" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Start a new healing
          </Link>
        </section>
          </>
        )}

      </div>
    </main>
  );
}
