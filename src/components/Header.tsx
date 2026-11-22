import { Plus, Sprout } from 'lucide-react';
import type { AppView } from '../types/garden';

interface HeaderProps {
  currentView: AppView;
  userEmail: string | null;
  hasActiveProject: boolean;
  onNavigate: (view: AppView) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
  onPrimaryAction: () => void;
  onTrackGarden: () => void;
}

export function Header({
  currentView,
  userEmail,
  hasActiveProject,
  onNavigate,
  onOpenAuth,
  onLogout,
  onPrimaryAction,
  onTrackGarden,
}: HeaderProps) {
  const navLinkClass = (active: boolean) =>
    `text-[15px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
      active
        ? 'text-[#14261C] border-b-2 border-[#1B4332]'
        : 'text-[#4A5D52] hover:text-[#14261C]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#F9FAF8]/95 backdrop-blur-sm border-b border-[#E3E8E4]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-xl font-bold tracking-tight text-[#1B4332] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332]"
        >
          BayState Bloom
        </button>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-7">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={navLinkClass(currentView === 'home')}
          >
            Mission
          </button>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className={navLinkClass(currentView === 'catalog')}
          >
            Plant Guide
          </button>
          <button
            type="button"
            onClick={() => (userEmail ? onNavigate('dashboard') : onOpenAuth('login'))}
            className={navLinkClass(currentView === 'dashboard')}
          >
            My Gardens
          </button>
          {hasActiveProject && userEmail && (
            <button
              type="button"
              onClick={() => onNavigate('designer')}
              className={navLinkClass(currentView === 'designer' || currentView === 'maintenance')}
            >
              Workspace
            </button>
          )}
          {userEmail ? (
            <button
              type="button"
              onClick={onLogout}
              className="text-sm font-medium text-[#4A5D52] hover:text-[#14261C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="text-sm font-medium text-[#4A5D52] hover:text-[#14261C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In
            </button>
          )}
        </nav>

        {/* Zone 3: The two main actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onTrackGarden}
            aria-current={currentView === 'tracker' ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-base font-semibold rounded-lg border-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              currentView === 'tracker'
                ? 'bg-[#E7F0EA] border-[#1B4332] text-[#14261C]'
                : 'bg-white border-[#1B4332] text-[#1B4332] hover:bg-[#EEF4F0]'
            }`}
          >
            <Sprout className="w-5 h-5" />
            <span className="sm:hidden">Track</span>
            <span className="hidden sm:inline">Track My Garden</span>
          </button>
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-base font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] border-2 border-[#1B4332] rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            <Plus className="w-5 h-5" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">{userEmail ? 'New Garden' : 'Start a Garden'}</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="lg:hidden border-t border-[#E3E8E4] px-4 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-[#4A5D52]">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`whitespace-nowrap shrink-0 ${currentView === 'home' ? 'text-[#1B4332] font-semibold' : ''}`}
        >
          Mission
        </button>
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className={`whitespace-nowrap shrink-0 ${currentView === 'catalog' ? 'text-[#1B4332] font-semibold' : ''}`}
        >
          Plant Guide
        </button>
        <button
          type="button"
          onClick={() => (userEmail ? onNavigate('dashboard') : onOpenAuth('login'))}
          className={`whitespace-nowrap shrink-0 ${currentView === 'dashboard' ? 'text-[#1B4332] font-semibold' : ''}`}
        >
          My Gardens
        </button>
        {userEmail ? (
          <button type="button" onClick={onLogout} className="whitespace-nowrap shrink-0">
            Sign Out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="whitespace-nowrap shrink-0"
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
}
