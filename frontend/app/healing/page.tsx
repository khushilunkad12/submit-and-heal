"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitPayload, SubmitResponse } from "../types";

const STEPS = [
  { id: 1, name: "Inspecting Repository", desc: "Cloning code and analyzing tech stack" },
  { id: 2, name: "Diagnosing Issue", desc: "AI Agent reading logs and source code" },
  { id: 3, name: "Generating Fix", desc: "AI Agent writing patch for the bug" },
  { id: 4, name: "Verifying Fix", desc: "Running patched code in isolated sandbox" },
  { id: 5, name: "Finalizing", desc: "Preparing results" },
];

export default function HealingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Guard against strict mode double-firing
  const fetchStarted = useRef(false);

  useEffect(() => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;

    // Load payload from session storage
    const payloadStr = sessionStorage.getItem("healingPayload");
    if (!payloadStr) {
      router.replace("/submit");
      return;
    }

    const payload = JSON.parse(payloadStr) as SubmitPayload;
    
    // Start simulation timer
    // We want it to reach step 4 (around 80-90%) slowly, but never finish until API does
    const timerId = setInterval(() => {
      setProgress((prev) => {
        // Slow down progression as it gets closer to 90
        const increment = prev < 50 ? 5 : prev < 80 ? 2 : prev < 95 ? 0.5 : 0;
        const newProgress = Math.min(prev + increment, 95);
        
        // Update current step based on progress
        if (newProgress > 80) setCurrentStep(4);
        else if (newProgress > 50) setCurrentStep(3);
        else if (newProgress > 20) setCurrentStep(2);
        
        return newProgress;
      });
    }, 1000);

    // Make the actual API call
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    
    fetch(`${apiUrl}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        clearInterval(timerId);
        const json = await res.json();
        
        if (!res.ok) {
          const detail = json?.detail;
          const msg = typeof detail === "string" ? detail : 
            Array.isArray(detail) ? detail.map((d: any) => d.msg).join(", ") : 
            `HTTP ${res.status}`;
          throw new Error(msg);
        }
        
        // Success
        setProgress(100);
        setCurrentStep(5);
        sessionStorage.setItem("healingResult", JSON.stringify(json));
        
        // Brief pause so user sees 100% before routing
        setTimeout(() => {
          router.push("/results");
        }, 800);
      })
      .catch((err) => {
        clearInterval(timerId);
        setError(err.message || "An unknown network error occurred.");
      });

    return () => clearInterval(timerId);
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-sans px-4 py-8">
      <div className="w-full max-w-xl">
        
        {/* Error State */}
        {error ? (
          <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-8 text-center shadow-xl">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Healing Failed</h1>
            <p className="text-red-300 mb-8 leading-relaxed">
              {error}
            </p>
            <Link 
              href="/submit"
              className="px-6 py-3 bg-red-900 hover:bg-red-800 text-white font-medium rounded-lg transition-colors inline-block"
            >
              Try again
            </Link>
          </div>
        ) : (
          /* Healing State */
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
                <span className="animate-pulse">🩺</span> Healing your app...
              </h1>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full mt-6 overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-6 mt-10">
              {STEPS.map((step) => {
                const isPast = step.id < currentStep || progress === 100;
                const isCurrent = step.id === currentStep && progress < 100;
                
                return (
                  <div key={step.id} className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="mt-1 flex-shrink-0">
                      {isPast ? (
                        <div className="w-6 h-6 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center border border-green-500/30">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/50">
                          <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    {/* Step Info */}
                    <div>
                      <h3 className={`text-sm font-semibold ${isPast ? 'text-gray-300' : isCurrent ? 'text-indigo-300' : 'text-gray-600'}`}>
                        {step.name}
                      </h3>
                      <p className={`text-xs mt-1 ${isPast ? 'text-gray-500' : isCurrent ? 'text-indigo-200/70' : 'text-gray-700'}`}>
                        {step.desc}
                      </p>
                    </div>
                    
                    {/* Status Text */}
                    <div className="ml-auto text-xs font-bold uppercase tracking-wider mt-1">
                      {isPast ? (
                        <span className="text-green-500">Done</span>
                      ) : isCurrent ? (
                        <span className="text-indigo-400 animate-pulse">Running...</span>
                      ) : (
                        <span className="text-gray-700">Waiting</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
