import { useState } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { JuraChat, type ProgressSnapshot } from './components/JuraChat';
import Preview from './pages/Preview';

type ViewMode = 'home' | 'preview';

function App() {
  const [view, setView] = useState<ViewMode>('home');
  const [progress, setProgress] = useState<ProgressSnapshot>({ completed: 0, total: 1 });

  return (
    <div className="min-h-screen bg-[#030712] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_50%)] px-4 py-8 text-white lg:px-10 lg:py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        {view === 'preview' ? (
          <Preview onBack={() => setView('home')} />
        ) : (
          <HomeHero onPreview={() => setView('preview')} progress={progress} onProgressChange={setProgress} />
        )}
      </div>
    </div>
  );
}

type HomeHeroProps = {
  onPreview: () => void;
  progress: ProgressSnapshot;
  onProgressChange: (snapshot: ProgressSnapshot) => void;
};

function HomeHero({ onPreview, progress, onProgressChange }: HomeHeroProps) {
  return (
    <>
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="flex flex-col justify-center space-y-4 lg:min-h-[220px]">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">Jura DV-100</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Guided domestic violence restraining order 
          </h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Every answer stays on this device. Jura follows the official DV-100 order exactly no skipped pages, no AI
            improvisation.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner backdrop-blur">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Progress tracker</h2>
              <p className="text-sm text-slate-300">Complete every prompt in order Jura will save as you go.</p>
            </div>
            <ProgressBar completed={progress.completed} total={progress.total} />
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-300">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Completed</p>
                <p className="text-xl font-semibold text-white">{progress.completed}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Total steps</p>
                <p className="text-xl font-semibold text-white">{progress.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 backdrop-blur">
            <h3 className="mb-2 text-base font-semibold text-white">How Jura works</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>Questions mirror the official DV-100 sequence.</li>
              <li>Local storage autosave keeps your answers between visits.</li>
              <li>AI only drafts the next question it never stores or edits facts.</li>
            </ul>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="h-[520px] rounded-[36px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-teal-500/10 backdrop-blur">
          <JuraChat onProgressChange={onProgressChange} />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onPreview}
            className="rounded-full bg-[#f9f9f9] px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-105"
          >
            Preview DV-100
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
