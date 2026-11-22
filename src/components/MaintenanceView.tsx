import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Calendar, Check, ChevronDown, Plus, Sprout, Trash2 } from 'lucide-react';
import { getRegisteredPlant } from '../data/maPlants';
import type { GardenProject, NativePlant, SeasonName } from '../types/garden';
import { PlantAvatar } from './PlantAvatar';

interface MaintenanceViewProps {
  project: GardenProject;
  onUpdateProject: (updater: (proj: GardenProject) => GardenProject) => void;
  onBackToDesigner: () => void;
  onBackToDashboard: () => void;
  onOpenTracker: () => void;
}

const SEASONS: ('All' | SeasonName)[] = ['All', 'Spring', 'Summer', 'Fall', 'Winter'];

const CARE_ACTIONS = [
  'Deep Watering (Establishment)',
  'Mulched with Shredded Leaf Compost',
  'Hand-Pulled Invasive Weeds',
  'Spring Stem Cutback (12–18")',
  'Observed Pollinators & Wildlife',
  'Checked Rain Garden Drainage',
];

export function MaintenanceView({
  project,
  onUpdateProject,
  onBackToDesigner,
  onBackToDashboard,
  onOpenTracker,
}: MaintenanceViewProps) {
  const [seasonFilter, setSeasonFilter] = useState<'All' | SeasonName>('All');
  const [logPlantName, setLogPlantName] = useState('Whole Garden');
  const [logPlantObj, setLogPlantObj] = useState<NativePlant | null>(null);
  const [logDropdownOpen, setLogDropdownOpen] = useState(false);
  const [logAction, setLogAction] = useState(CARE_ACTIONS[0]);
  const [logNotes, setLogNotes] = useState('');
  const [newTaskSeason, setNewTaskSeason] = useState<SeasonName>('Spring');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const logDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (logDropdownRef.current && !logDropdownRef.current.contains(e.target as Node)) {
        setLogDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const speciesCounts = useMemo(() => {
    const map = new Map<string, { plant: NativePlant; qty: number }>();
    project.placements.forEach((p) => {
      const resolved = getRegisteredPlant(p.plantId, p.plantSnapshot);
      if (!resolved) return;
      const existing = map.get(resolved.id);
      if (existing) {
        existing.qty += 1;
      } else {
        map.set(resolved.id, { plant: resolved, qty: 1 });
      }
    });
    return Array.from(map.values());
  }, [project.placements]);

  const filteredTasks = useMemo(() => {
    if (seasonFilter === 'All') return project.tasks;
    return project.tasks.filter((t) => t.season === seasonFilter);
  }, [project.tasks, seasonFilter]);

  const completedCount = project.tasks.filter((t) => t.done).length;
  const completionPct =
    project.tasks.length > 0 ? Math.round((completedCount / project.tasks.length) * 100) : 0;

  const toggleTask = (taskId: string) => {
    onUpdateProject((proj) => ({
      ...proj,
      tasks: proj.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    }));
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    const monthsBySeason: Record<SeasonName, string> = {
      Spring: 'Apr–May',
      Summer: 'Jun–Aug',
      Fall: 'Sep–Nov',
      Winter: 'Dec–Mar',
    };
    onUpdateProject((proj) => ({
      ...proj,
      tasks: [
        ...proj.tasks,
        {
          id: 'custom_' + Date.now(),
          season: newTaskSeason,
          months: monthsBySeason[newTaskSeason],
          title: trimmed,
          done: false,
        },
      ],
    }));
    setNewTaskTitle('');
  };

  const handleAddLog = (e: FormEvent) => {
    e.preventDefault();
    onUpdateProject((proj) => ({
      ...proj,
      logs: [
        {
          id: 'log_' + Date.now(),
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          plant: logPlantName,
          action: logAction,
          notes: logNotes.trim(),
        },
        ...proj.logs,
      ],
    }));
    setLogNotes('');
  };

  const deleteLog = (logId: string) => {
    onUpdateProject((proj) => ({
      ...proj,
      logs: proj.logs.filter((l) => l.id !== logId),
    }));
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E3E8E4] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#4A5D52]">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="hover:text-[#14261C] cursor-pointer"
            >
              My Gardens
            </button>
            <span aria-hidden="true">/</span>
            <span>Zone {project.zone} Ecological Care</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {project.width} × {project.height} ft
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#14261C]">
            {project.name} — Maintenance Tracker
          </h1>
          <p className="text-sm text-[#4A5D52]">
            Tailored Massachusetts seasonal checklist, planted native species inventory, and field
            care journal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBackToDesigner}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#1B4332] bg-white hover:bg-[#EEF4F0] border border-[#CBD6CE] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Edit Garden Map</span>
          </button>
          <button
            type="button"
            onClick={onOpenTracker}
            className="inline-flex items-center gap-2 px-5 py-3 text-base font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sprout className="w-5 h-5" />
            <span>Track My Garden</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seasonal Care Checklist */}
          <section className="bg-white border border-[#E3E8E4] rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#14261C]">
                  Seasonal Massachusetts Care Checklist
                </h2>
                <p className="text-xs text-[#4A5D52] mt-0.5">
                  Zero synthetic pesticides · Focus on Year-1 deep watering and winter pollinator
                  habitat.
                </p>
              </div>
              <div className="text-right font-mono tabular-nums text-xs text-[#1B4332] font-semibold">
                {completedCount} / {project.tasks.length} complete ({completionPct}%)
              </div>
            </div>

            <div className="h-1.5 w-full bg-[#EEF2EF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1B4332] transition-all duration-200"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F2F5F2] rounded-lg overflow-x-auto">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeasonFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    seasonFilter === s
                      ? 'bg-white text-[#14261C] shadow-xs'
                      : 'text-[#4A5D52] hover:text-[#14261C]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="divide-y divide-[#EEF2EF]">
              {filteredTasks.map((task) => (
                <label key={task.id} className="flex items-start gap-3 py-3.5 cursor-pointer group">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    onClick={() => toggleTask(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      task.done
                        ? 'bg-[#1B4332] border-[#1B4332] text-white'
                        : 'bg-white border-[#B9C6BD] group-hover:border-[#1B4332]'
                    }`}
                  >
                    {task.done && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-medium text-[#2D6A4F]">
                      {task.season} · {task.months}
                      {task.plantRelated ? ` · Tailored for ${task.plantRelated}` : ''}
                    </div>
                    <div
                      className={`text-sm leading-relaxed ${
                        task.done ? 'line-through text-[#7B8D82]' : 'text-[#14261C]'
                      }`}
                    >
                      {task.title}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <form
              onSubmit={handleAddTask}
              className="pt-4 border-t border-[#EEF2EF] flex flex-col sm:flex-row gap-2"
            >
              <select
                value={newTaskSeason}
                onChange={(e) => setNewTaskSeason(e.target.value as SeasonName)}
                aria-label="Season for new reminder"
                className="px-3 py-2 text-xs font-medium bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
              >
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
              </select>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a custom seasonal garden reminder..."
                className="flex-1 px-3 py-2 text-xs bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-semibold text-[#1B4332] bg-[#F2F7F4] hover:bg-[#E4EFE8] border border-[#CFE0D5] rounded-lg whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </form>
          </section>

          {/* Planted Species Inventory with FloraAPI Photos & Taxonomy */}
          <section className="bg-white border border-[#E3E8E4] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#14261C]">
                Planted Species Inventory
              </h2>
              <span className="font-mono text-xs text-[#4A5D52] tabular-nums">
                {project.placements.length} plants · {speciesCounts.length} species
              </span>
            </div>

            {speciesCounts.length === 0 ? (
              <p className="text-sm text-[#4A5D52]">
                No native plants placed yet. Return to the Garden Map to add species.
              </p>
            ) : (
              <div className="divide-y divide-[#EEF2EF]">
                {speciesCounts.map(({ plant, qty }) => (
                  <div key={plant.id} className="py-3.5 flex items-start gap-3.5">
                    <PlantAvatar plant={plant} size={48} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-semibold text-sm text-[#14261C]">
                          {plant.name}{' '}
                          <span className="font-normal italic text-xs text-[#5B6E62]">
                            ({plant.sci})
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#1B4332] tabular-nums shrink-0">
                          ×{qty}
                        </span>
                      </div>
                      <div className="text-xs text-[#4A5D52]">
                        Family: {plant.family} · Genus:{' '}
                        <span className="italic">{plant.genus}</span> ·{' '}
                        <span className="font-mono">{plant.hardinessRange}</span>
                      </div>
                      <div className="text-xs text-[#4A5D52]">
                        Light:{' '}
                        {plant.lightRequirements?.length
                          ? plant.lightRequirements.join(', ')
                          : 'Not listed'}{' '}
                        · Soil Moisture:{' '}
                        {plant.soilMoisture?.length
                          ? plant.soilMoisture.join(', ')
                          : 'Not listed'}
                      </div>
                      <p className="text-xs text-[#35473C] leading-relaxed pt-0.5">
                        {plant.description || plant.careTip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols: Activity Log Form with Photo Dropdown + History */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-[#E3E8E4] rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#14261C]">
              Log Care or Wildlife Observation
            </h2>

            <form onSubmit={handleAddLog} className="space-y-3.5">
              {/* Photo-enabled Plant / Bed Dropdown */}
              <div ref={logDropdownRef} className="space-y-1 relative">
                <label className="block text-xs font-semibold text-[#14261C]">
                  Plant or Bed Area
                </label>
                <button
                  type="button"
                  onClick={() => setLogDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={logDropdownOpen}
                  className="w-full px-3 py-2 bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {logPlantObj ? (
                      <PlantAvatar plant={logPlantObj} size={30} />
                    ) : (
                      <div className="w-[30px] h-[30px] rounded-lg bg-[#E9F3EC] text-[#1B4332] flex items-center justify-center shrink-0">
                        <Sprout className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#14261C] truncate">
                        {logPlantName}
                      </div>
                      {logPlantObj && (
                        <div className="text-[11px] italic text-[#5B6E62] truncate">
                          {logPlantObj.sci}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#4A5D52] shrink-0 transition-transform ${
                      logDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {logDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 mt-1 z-30 bg-white border border-[#CBD6CE] rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-[#EEF2EF]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLogPlantName('Whole Garden');
                        setLogPlantObj(null);
                        setLogDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-[#F5F9F6] cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#E9F3EC] text-[#1B4332] flex items-center justify-center shrink-0">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-[#14261C]">Whole Garden</span>
                    </button>

                    {speciesCounts.map(({ plant }) => (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => {
                          setLogPlantName(plant.name);
                          setLogPlantObj(plant);
                          setLogDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-[#F5F9F6] cursor-pointer"
                      >
                        <PlantAvatar plant={plant} size={34} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#14261C] truncate">
                            {plant.name}
                          </div>
                          <div className="text-[11px] italic text-[#5B6E62] truncate">
                            {plant.sci} · {plant.family}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="log-action-select"
                  className="block text-xs font-semibold text-[#14261C]"
                >
                  Care Action
                </label>
                <select
                  id="log-action-select"
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
                >
                  {CARE_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="log-notes-input"
                  className="block text-xs font-semibold text-[#14261C]"
                >
                  Field Notes
                </label>
                <textarea
                  id="log-notes-input"
                  rows={3}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g., Spotted bumblebees visiting blooms after rain."
                  className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors cursor-pointer"
              >
                Save Care Log
              </button>
            </form>
          </section>

          <section className="bg-white border border-[#E3E8E4] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#14261C]">
                Recent Care History
              </h2>
              <span className="font-mono text-xs text-[#4A5D52] tabular-nums">
                {project.logs.length} entr{project.logs.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {project.logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#4A5D52] space-y-1.5">
                <Calendar className="w-5 h-5 mx-auto text-[#8B9C91]" />
                <p>No field logs yet. Record your first watering or pollinator sighting above.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF2EF] max-h-[380px] overflow-y-auto pr-1">
                {project.logs.map((entry) => (
                  <div key={entry.id} className="py-3 space-y-1 group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#14261C]">{entry.plant}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#5B6E62] tabular-nums">
                          {entry.date}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteLog(entry.id)}
                          aria-label="Delete care log"
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7D72] hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-[#2D6A4F]">{entry.action}</div>
                    {entry.notes && (
                      <p className="text-xs text-[#4A5D52] leading-relaxed">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
