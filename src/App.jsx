import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/common/Navbar';
import { Hero } from './components/sections/Hero';
import { Problem } from './components/sections/Problem';
import { Solution } from './components/sections/Solution';
import { How3D } from './components/sections/How3D';
import { Features } from './components/sections/Features';
import { USP } from './components/sections/USP';
import { Dashboard } from './components/sections/Dashboard';
import { Footer } from './components/common/Footer';

export default function App() {
  const initStore = useStore((s) => s.initStore);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);

  useEffect(() => {
    // Initialize schema, metrics, samples, and initial clinical prediction
    initStore();

    // Check if URL has hash (e.g. #demo) and switch to dashboard mode
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'demo' || hash === 'dashboard') {
        setViewMode('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === 'story') {
        setViewMode('story');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [initStore, setViewMode]);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Fixed Navigation Header */}
      <Navbar />

      {/* Main View Area */}
      <main className="flex-1 w-full flex flex-col pt-16">
        {viewMode === 'dashboard' ? (
          /* Dedicated Instant Dashboard View */
          <div className="w-full flex-1">
            <Dashboard />
          </div>
        ) : (
          /* Full Scrollytelling Story Mode */
          <>
            {/* 1. HERO */}
            <Hero />

            {/* 2. PROBLEM STATEMENT */}
            <Problem />

            {/* 3. PROPOSED SOLUTION (4-step pipeline) */}
            <Solution />

            {/* 4. HOW IT WORKS IN 3D */}
            <How3D />

            {/* 5. FEATURES GRID */}
            <Features />

            {/* 6. USP SECTION */}
            <USP />

            {/* 7. LIVE INTERACTIVE 3D DASHBOARD */}
            <Dashboard />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
