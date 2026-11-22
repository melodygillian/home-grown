import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Map, Plus, Sprout, Trash2 } from 'lucide-react';
import type { GardenProject } from '../types/garden';
import { getConflictDetails } from '../utils/spatial';

interface DashboardViewProps {
  userEmail: string;
  projects: GardenProject[];
  onCreateNew: () => void;
  onLoadStarter: () => void;
  onOpenProject: (id: string, targetView: 'designer' | 'maintenance' | 'tracker') => void;
  onDeleteProject: (id: string) => void;
}

export function DashboardView({
  userEmail,
  projects,
  onCreateNew,
  onLoadStarter,
  onOpenProject,
  onDeleteProject,
}: DashboardViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E6E2CC] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-medium text-[#4E6656]">
            Signed in as {userEmail} · Saved locally
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#30573C]">
            My Massachusetts Gardens
          </h1>
          <p className="text-sm text-[#4E6656]">
            Open a saved planting map to refine spacing, or launch your Zone 5b–7a care tracker.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLoadStarter}
            className="px-4 py-2 text-sm font-semibold text-[#30573C] bg-white hover:bg-[#F3F1DC] border border-[#CCC8A8] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Sample Garden
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Garden</span>
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-[#E6E2CC] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-3xl bg-[#F3F1DC] text-[#30573C] flex items-center justify-center mx-auto">
            <Sprout className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-[#22392A]">
              No gardens mapped yet
            </h2>
            <p className="text-sm text-[#4E6656]">
              Start by entering your backyard bed dimensions in feet, or load our 12 × 8 ft sample
              Massachusetts pollinator and rain-garden border to explore immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCreateNew}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full cursor-pointer"
            >
              Create First Garden
            </button>
            <button
              type="button"
              onClick={onLoadStarter}
              className="px-4 py-2.5 text-sm font-semibold text-[#30573C] bg-[#F5F8F5] hover:bg-[#EEEBD2] border border-[#CCC8A8] rounded-full cursor-pointer"
            >
              Try Sample 12 × 8 ft Garden
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const conflicts = getConflictDetails(project.placements, project.width, project.height);
            const completedTasks = project.tasks.filter((t) => t.done).length;
            const uniqueSpecies = new Set(project.placements.map((p) => p.plantId)).size;

            return (
              <article
                key={project.id}
                className="bg-white border border-[#E6E2CC] rounded-3xl p-5 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#4E6656]">
                      <span>
                        Zone {project.zone} · Created {project.createdAt}
                      </span>
                      <span
                        className={`font-semibold ${
                          project.completed ? 'text-[#30573C]' : 'text-[#92400E]'
                        }`}
                      >
                        {project.completed ? 'Active Maintenance' : 'Draft Plan'}
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-semibold text-[#22392A] truncate">
                      {project.name}
                    </h2>
                  </div>

                  {/* Unboxed Tabular Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#F6F2DF] text-xs">
                    <div>
                      <div className="text-[#5A705F]">Dimensions</div>
                      <div className="font-mono tabular-nums font-semibold text-[#22392A] mt-0.5">
                        {project.width} × {project.height} ft
                      </div>
                    </div>
                    <div>
                      <div className="text-[#5A705F]">Planted</div>
                      <div className="font-mono tabular-nums font-semibold text-[#22392A] mt-0.5">
                        {project.placements.length} ({uniqueSpecies} sp.)
                      </div>
                    </div>
                    <div>
                      <div className="text-[#5A705F]">Care Tasks</div>
                      <div className="font-mono tabular-nums font-semibold text-[#22392A] mt-0.5">
                        {completedTasks} / {project.tasks.length}
                      </div>
                    </div>
                  </div>

                  {/* Spacing Conflict Status */}
                  <div className="text-xs flex items-center gap-1.5">
                    {conflicts.size > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                        <span className="font-medium text-[#991B1B]">
                          {conflicts.size} mature spread conflict{conflicts.size > 1 ? 's' : ''} to
                          resolve
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                        <span className="text-[#34503D]">
                          {project.placements.length > 0
                            ? 'Zero mature spread conflicts'
                            : 'Ready for environmental mapping'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id, 'tracker')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-lg transition-colors cursor-pointer"
                  >
                    <Sprout className="w-5 h-5" />
                    <span>Track this garden</span>
                  </button>
                  <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id, 'designer')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#30573C] bg-white hover:bg-[#F3F1DC] border border-[#CCC8A8] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Map className="w-4 h-4" />
                      <span>Edit Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id, 'maintenance')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#30573C] bg-[#F7F5E5] hover:bg-[#E4EFE8] border border-[#CFE0D5] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Checklist
                    </button>
                  </div>

                  {confirmDeleteId === project.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProject(project.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-md cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 text-xs text-[#4E6656] hover:text-[#22392A] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(project.id)}
                      aria-label={`Delete ${project.name}`}
                      className="p-2 text-[#6A7E6C] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
