import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col font-sans text-gray-200">
      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Submit & Heal 🩺
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
            How it works
          </a>
          <Link
            href="/submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Start healing &rarr;
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 mt-10">
        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-900/30 border border-indigo-500/30 rounded-full mb-6 shadow-sm">
          Multi-agent AI &bull; Autonomous debugging
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight">
          Your broken app, <span className="text-indigo-400 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">fixed in minutes</span>
        </h1>
        <p className="mt-6 text-lg text-gray-400 max-w-2xl leading-relaxed">
          Paste a GitHub repo and describe the error. AI agents diagnose, fix, test, and deploy — no manual debugging needed.
        </p>
        <Link
          href="/submit"
          className="mt-10 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
        >
          Heal my app &rarr;
        </Link>
      </section>

      {/* Stats Row */}
      <section className="w-full max-w-4xl mx-auto px-6 py-10 border-y border-gray-800/50 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-24">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">5</div>
          <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide font-medium">AI agents</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">&lt;60s</div>
          <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide font-medium">Avg fix time</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">3</div>
          <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide font-medium">Languages supported</div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-center text-sm font-bold text-gray-500 uppercase tracking-widest mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { step: "1", name: "Submit", desc: "Paste repo", icon: "📥" },
            { step: "2", name: "Diagnose", desc: "Find root cause", icon: "🔍" },
            { step: "3", name: "Fix", desc: "Patch code", icon: "🛠️" },
            { step: "4", name: "Verify", desc: "Run sandbox", icon: "✅" },
            { step: "5", name: "Deploy", desc: "Open PR", icon: "🚀" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-900/50 border border-gray-800 relative">
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-sm font-bold text-gray-200 mb-1">{item.name}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
              {i < 4 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-8 border-t border-gray-900 mt-auto">
        <p className="text-xs text-gray-600 font-medium">
          Built with Next.js, FastAPI, Gemini AI, E2B
        </p>
      </footer>
    </main>
  );
}
