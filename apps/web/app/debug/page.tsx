'use client';

import React, { useEffect, useState } from 'react';

export default function DebugPage() {
  const [mounted, setMounted] = useState(false);

  // Ensure we only render on the client to see the browser's environment
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-blue-600 p-4">
          <h1 className="text-white text-xl font-bold">GymGuard Connection Debugger</h1>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Target API Address</h2>
            <div className={`mt-2 p-3 rounded border ${apiUrl?.includes('railway.app') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <code className="text-lg font-mono break-all text-gray-800">
                {apiUrl || "UNDEFINED (Likely falling back to localhost)"}
              </code>
            </div>
          </section>

          <section className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
            <h3 className="text-yellow-800 font-bold mb-1">What this means:</h3>
            <ul className="list-disc ml-5 text-sm text-yellow-700 space-y-1">
              <li><strong>If it shows "localhost":</strong> The website is still "frozen" with old settings. You must clear the build cache and redeploy.</li>
              <li><strong>If it shows "railway.app":</strong> The address is correct, and any remaining failure is likely a CORS or networking port issue.</li>
            </ul>
          </section>

          <div className="text-xs text-gray-400 italic">
            Detected at: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}