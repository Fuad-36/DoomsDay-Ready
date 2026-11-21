import { useState } from 'react';
import { EmptyState } from './components/EmptyState';
import { MoviesTab } from './features/movies/MoviesTab';

const TABS = [
  {
    id: 'movies',
    label: 'Movies',
    title: 'Movies',
    description: 'Add and manage the MCU movies you plan to rewatch.',
  },
  {
    id: 'rewatch',
    label: 'Rewatch Plan',
    title: 'Rewatch Plan',
    description:
      'Pick a target movie and see the order to watch everything before it.',
  },
  {
    id: 'booking',
    label: 'Booking',
    title: 'Booking',
    description:
      'Find a cinema and build an opening-night bundle quote for your group.',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('movies');
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-slate-800 pb-6">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
            Blinto Talent Accelerator 2027
          </p> */}
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-amber-400">
            Doomsday Ready
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Plan your MCU rewatch before Avengers: Doomsday and book an
            opening-night watch party.
          </p>
        </header>

        <nav aria-label="Sections" className="mt-6">
          <div
            role="tablist"
            aria-label="Doomsday Ready sections"
            className="flex flex-wrap gap-2"
          >
            {TABS.map((tab) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    selected
                      ? 'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
                      : 'rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="mt-6 flex-1">
          <section
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            {activeTab === 'movies' ? (
              <MoviesTab />
            ) : (
              <EmptyState
                title={active.title}
                description={active.description}
              />
            )}
          </section>
        </main>

        <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
          Movies are live — rewatch plans and booking are wired next.
        </footer>
      </div>
    </div>
  );
}
