import { useMemo, useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { DesignerView } from './components/DesignerView';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { MaintenanceView } from './components/MaintenanceView';
import { TrackerView } from './components/TrackerView';
import { AuthModal, NewProjectModal } from './components/Modals';
import { PlantGuideView } from './components/PlantGuideView';
import {
  createStarterGarden,
  fetchMassachusettsNativePlants,
  generateTasksForProject,
} from './data/maPlants';
import type { AppView, GardenProject, GridCell, MAZone } from './types/garden';
import {
  loadSessionEmail,
  loadUsers,
  persistUserProjects,
  saveSessionEmail,
  saveUsers,
} from './utils/storage';

const DEMO_EMAIL = 'gardener@massachusetts.org';

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => loadSessionEmail());
  const [projects, setProjects] = useState<GardenProject[]>(() => {
    const email = loadSessionEmail();
    if (!email) return [];
    const users = loadUsers();
    return users[email]?.projects ?? [];
  });

  const [view, setView] = useState<AppView>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const syncProjects = (email: string, nextProjects: GardenProject[]) => {
    setProjects(nextProjects);
    persistUserProjects(email, nextProjects);
  };

  const handleAuthSubmit = (
    email: string,
    password: string,
    mode: 'login' | 'signup'
  ): string | null => {
    if (!email || !password) return 'Please enter both an email address and password.';
    const users = loadUsers();

    if (mode === 'signup') {
      if (users[email]) {
        if (users[email].password !== password) {
          return 'An account with this email already exists, and the password does not match.';
        }
      } else {
        users[email] = {
          email,
          password,
          displayName: email.split('@')[0],
          projects: [],
        };
        saveUsers(users);
      }
    } else {
      if (!users[email]) {
        users[email] = {
          email,
          password,
          displayName: email.split('@')[0],
          projects: [],
        };
        saveUsers(users);
      } else if (users[email].password !== password) {
        return 'Incorrect password for this account.';
      }
    }

    setUserEmail(email);
    saveSessionEmail(email);
    setProjects(users[email].projects);
    setAuthModalMode(null);
    setView('dashboard');
    return null;
  };

  const handleOpenSampleGarden = async () => {
    const users = loadUsers();
    const targetEmail = userEmail ?? DEMO_EMAIL;

    if (!users[targetEmail]) {
      users[targetEmail] = {
        email: targetEmail,
        password: 'demo',
        displayName: 'Massachusetts Gardener',
        projects: [],
      };
    }

    let starterPlants: Awaited<ReturnType<typeof fetchMassachusettsNativePlants>>['plants'] = [];
    try {
      const res = await fetchMassachusettsNativePlants({ limit: 8 });
      starterPlants = res.plants;
    } catch {
      starterPlants = [];
    }

    const starter = createStarterGarden('6a', starterPlants);
    const nextProjects = [starter, ...users[targetEmail].projects];
    users[targetEmail].projects = nextProjects;
    saveUsers(users);

    setUserEmail(targetEmail);
    saveSessionEmail(targetEmail);
    setProjects(nextProjects);
    setActiveProjectId(starter.id);
    setAuthModalMode(null);
    setView('designer');
  };

  const handleLogout = () => {
    setUserEmail(null);
    setProjects([]);
    setActiveProjectId(null);
    saveSessionEmail(null);
    setView('home');
  };

  const handleCreateProject = (
    name: string,
    width: number,
    height: number,
    zone: MAZone,
    zip: string,
    place: { city: string; state: string } | null
  ) => {
    if (!userEmail) return;
    const cells: GridCell[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ sun: 'Sun', moisture: 'Moist' }))
    );

    const newProj: GardenProject = {
      id: 'g_' + Date.now(),
      name,
      zone,
      width,
      height,
      cells,
      placements: [],
      completed: false,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      tasks: generateTasksForProject([]),
      logs: [],
      // ZIP is asked up front (team design), so weather is ready in Track My Garden
      tracking: { zip, place, plants: {}, empty: [], journal: [] },
    };

    const next = [newProj, ...projects];
    syncProjects(userEmail, next);
    setActiveProjectId(newProj.id);
    setShowNewProjectModal(false);
    setView('designer');
  };

  const handleUpdateActiveProject = (updater: (proj: GardenProject) => GardenProject) => {
    if (!userEmail || !activeProjectId) return;
    const next = projects.map((p) => (p.id === activeProjectId ? updater(p) : p));
    syncProjects(userEmail, next);
  };

  const handleCompleteGarden = () => {
    if (!userEmail || !activeProjectId) return;
    const next = projects.map((p) => {
      if (p.id !== activeProjectId) return p;
      // Merge newly relevant plant-specific tasks without losing existing task completion states
      const existingIds = new Set(p.tasks.map((t) => t.id));
      const generated = generateTasksForProject(p.placements);
      const added = generated.filter((g) => !existingIds.has(g.id));
      return {
        ...p,
        completed: true,
        tasks: [...p.tasks, ...added],
      };
    });
    syncProjects(userEmail, next);
    setView('tracker');
  };

  // "Track My Garden": open the garden you're working on, else your most recent finished garden.
  const handleTrackGarden = () => {
    if (!userEmail) {
      setAuthModalMode('login');
      return;
    }
    const target = activeProject ?? projects.find((p) => p.completed) ?? projects[0];
    if (!target) {
      setShowNewProjectModal(true);
      return;
    }
    setActiveProjectId(target.id);
    setView('tracker');
  };

  const handleDeleteProject = (id: string) => {
    if (!userEmail) return;
    const next = projects.filter((p) => p.id !== id);
    syncProjects(userEmail, next);
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  };

  const handleStartPlanning = () => {
    if (!userEmail) {
      setAuthModalMode('signup');
    } else {
      setShowNewProjectModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF3] text-[#22392A]">
      <Header
        currentView={view}
        userEmail={userEmail}
        hasActiveProject={Boolean(activeProject)}
        onNavigate={(nextView) => {
          if ((nextView === 'dashboard' || nextView === 'designer' || nextView === 'maintenance' || nextView === 'tracker') && !userEmail) {
            setAuthModalMode('login');
            return;
          }
          setView(nextView);
        }}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onLogout={handleLogout}
        onPrimaryAction={handleStartPlanning}
        onTrackGarden={handleTrackGarden}
      />

      <main className="flex-1">
        {view === 'home' && (
          <HomeView
            userEmail={userEmail}
            onStartPlanning={handleStartPlanning}
            onTrySampleGarden={handleOpenSampleGarden}
            onTrackGarden={handleTrackGarden}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            onOpenCatalog={() => setView('catalog')}
          />
        )}

        {view === 'catalog' && <PlantGuideView />}

        {view === 'dashboard' && userEmail && (
          <DashboardView
            userEmail={userEmail}
            projects={projects}
            onCreateNew={() => setShowNewProjectModal(true)}
            onLoadStarter={handleOpenSampleGarden}
            onOpenProject={(id, targetView) => {
              setActiveProjectId(id);
              setView(targetView);
            }}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {view === 'designer' && activeProject && (
          <DesignerView
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onCompleteGarden={handleCompleteGarden}
            onBackToDashboard={() => setView('dashboard')}
          />
        )}

        {view === 'maintenance' && activeProject && (
          <MaintenanceView
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onBackToDesigner={() => setView('designer')}
            onBackToDashboard={() => setView('dashboard')}
            onOpenTracker={() => setView('tracker')}
          />
        )}

        {view === 'tracker' && activeProject && (
          <TrackerView
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onEditMap={() => setView('designer')}
            onOpenChecklist={() => setView('maintenance')}
            onBackToDashboard={() => setView('dashboard')}
          />
        )}
      </main>

      <footer className="border-t border-[#E6E2CC] bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4E6656]">
          <div>home grown · Massachusetts native garden planner (USDA Zones 5b–7a)</div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setView('home')}
              className="hover:text-[#22392A] cursor-pointer"
            >
              Mission
            </button>
            <button
              type="button"
              onClick={() => setView('catalog')}
              className="hover:text-[#22392A] cursor-pointer"
            >
              Native Plant Guide
            </button>
            <button
              type="button"
              onClick={handleStartPlanning}
              className="hover:text-[#22392A] cursor-pointer"
            >
              Start a Garden
            </button>
          </div>
        </div>
      </footer>

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSwitchMode={(m) => setAuthModalMode(m)}
          onSubmit={handleAuthSubmit}
          onQuickDemo={handleOpenSampleGarden}
        />
      )}

      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
