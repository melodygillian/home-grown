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

/**
 * "home grown" header from the team Figma: a strip of the blurred wildflower photo,
 * the two-line white wordmark, and white outlined pill buttons.
 * On the home page it floats transparently over the full-screen hero photo.
 */
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
  const onHome = currentView === 'home';

  const navLink = (active: boolean) =>
    `text-[16px] font-medium whitespace-nowrap shrink-0 cursor-pointer pb-0.5 transition-opacity ${
      active ? 'text-white border-b-2 border-white' : 'text-white/85 hover:text-white'
    }`;

  return (
    <header
      className={
        onHome
          ? 'absolute inset-x-0 top-0 z-40'
          : 'sticky top-0 z-40 hg-photo shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
      }
    >
      <div className={onHome ? '' : 'bg-black/15'}>
        <div className="max-w-[1440px] mx-auto px-5 lg:px-8 h-[76px] flex items-center justify-between gap-5">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-left text-white font-bold text-[26px] leading-[0.9] tracking-tight drop-shadow-sm shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="home grown, go to home page"
          >
            home
            <br />
            grown
          </button>

          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6 drop-shadow-sm">
            <button type="button" onClick={() => onNavigate('home')} className={navLink(onHome)}>
              mission
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className={navLink(currentView === 'catalog')}
            >
              plant guide
            </button>
            <button
              type="button"
              onClick={() => (userEmail ? onNavigate('dashboard') : onOpenAuth('login'))}
              className={navLink(currentView === 'dashboard')}
            >
              my gardens
            </button>
            {hasActiveProject && userEmail && (
              <button
                type="button"
                onClick={() => onNavigate('designer')}
                className={navLink(currentView === 'designer' || currentView === 'maintenance')}
              >
                workspace
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {!onHome && (
              <>
                <button
                  type="button"
                  onClick={onTrackGarden}
                  aria-current={currentView === 'tracker' ? 'page' : undefined}
                  className="hg-pill-light inline-flex items-center gap-2 px-4 sm:px-5 h-11 text-[16px] whitespace-nowrap cursor-pointer"
                >
                  <Sprout className="w-5 h-5" />
                  <span className="sm:hidden">track</span>
                  <span className="hidden sm:inline">track my garden</span>
                </button>
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 h-11 text-[16px] font-bold rounded-full bg-white text-[#30573C] hover:bg-[#FFFDF3] border-2 border-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="sm:hidden">new</span>
                  <span className="hidden sm:inline">new garden</span>
                </button>
              </>
            )}
            {userEmail ? (
              <button
                type="button"
                onClick={onLogout}
                className="hg-pill-light px-4 h-11 text-[16px] whitespace-nowrap cursor-pointer"
              >
                sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="hg-pill-light px-5 h-11 text-[16px] whitespace-nowrap cursor-pointer"
              >
                log in
              </button>
            )}
          </div>
        </div>

        {/* Small-screen navigation row */}
        <div className="lg:hidden px-5 pb-2 flex items-center gap-5 overflow-x-auto text-sm font-medium text-white/90">
          <button type="button" onClick={() => onNavigate('home')} className="whitespace-nowrap shrink-0">
            mission
          </button>
          <button type="button" onClick={() => onNavigate('catalog')} className="whitespace-nowrap shrink-0">
            plant guide
          </button>
          <button
            type="button"
            onClick={() => (userEmail ? onNavigate('dashboard') : onOpenAuth('login'))}
            className="whitespace-nowrap shrink-0"
          >
            my gardens
          </button>
        </div>
      </div>
    </header>
  );
}
