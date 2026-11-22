import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CloudSun,
  Droplet,
  Droplets,
  Eye,
  Moon,
  PaintBucket,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  X,
} from 'lucide-react';
import {
  DEFAULT_LIGHT_CATEGORIES,
  DEFAULT_MOISTURE_CATEGORIES,
  fetchMassachusettsNativePlants,
  getRegisteredPlant,
  isZoneWithinRange,
} from '../data/maPlants';
import type {
  DesignStep,
  GardenProject,
  MoistureLevel,
  NativePlant,
  PlantCategory,
  SunLevel,
} from '../types/garden';
import { checkMicroclimateFit, getConflictDetails, snapCoord } from '../utils/spatial';
import { PlantAvatar } from './PlantAvatar';

interface DesignerViewProps {
  project: GardenProject;
  onUpdateProject: (updater: (proj: GardenProject) => GardenProject) => void;
  onCompleteGarden: () => void;
  onBackToDashboard: () => void;
}

const CELL_PX = 48;

const CATEGORY_TABS: { key: 'all' | PlantCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'perennial', label: 'Wildflowers' },
  { key: 'grass', label: 'Grasses' },
  { key: 'shrub', label: 'Shrubs' },
  { key: 'fern', label: 'Ferns' },
];

function getLightOverlayClass(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'sun' || lower === 'full sun') return 'overlay-light-sun';
  if (lower === 'part shade' || lower === 'partial shade') return 'overlay-light-part-shade';
  if (lower === 'shade' || lower === 'full shade') return 'overlay-light-shade';
  return 'overlay-light-other';
}

function getMoistureOverlayClass(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'dry') return 'overlay-moist-dry';
  if (lower === 'moist' || lower === 'average' || lower === 'medium') return 'overlay-moist-moist';
  if (lower === 'wet') return 'overlay-moist-wet';
  return 'overlay-moist-other';
}

function getLightShortCode(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'sun') return 'S';
  if (lower === 'part shade') return 'PS';
  if (lower === 'shade') return 'Sh';
  return val.slice(0, 2);
}

function getMoistureShortCode(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'dry') return 'D';
  if (lower === 'moist') return 'M';
  if (lower === 'wet') return 'W';
  return val.slice(0, 1).toUpperCase();
}

function getLightGuidance(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'sun') return '6+ hours of direct summer sunlight across open yard spaces.';
  if (lower === 'part shade') return '3–6 hours of sun or filtered canopy light along woodland edges.';
  if (lower === 'shade') return 'Under 3 hours of direct sun beneath mature trees or north walls.';
  return `FloraAPI light requirement category: ${val}.`;
}

function getMoistureGuidance(val: string): string {
  const lower = val.trim().toLowerCase();
  if (lower === 'dry') return 'Sandy, rocky, or sloped soils where rainfall drains away rapidly.';
  if (lower === 'moist') return 'Balanced mesic garden loam that retains moisture without pooling.';
  if (lower === 'wet') return 'Low spots, swales, or downspout outlets that stay damp after storms.';
  return `FloraAPI soil moisture category: ${val}.`;
}

function LightIcon({ value, className }: { value: string; className?: string }) {
  const lower = value.trim().toLowerCase();
  if (lower === 'sun') return <Sun className={className} />;
  if (lower === 'part shade') return <CloudSun className={className} />;
  return <Moon className={className} />;
}

function MoistureIcon({ value, className }: { value: string; className?: string }) {
  const lower = value.trim().toLowerCase();
  if (lower === 'dry') return <Sun className={className} />;
  if (lower === 'wet') return <Waves className={className} />;
  return <Droplet className={className} />;
}

export function DesignerView({
  project,
  onUpdateProject,
  onCompleteGarden,
  onBackToDashboard,
}: DesignerViewProps) {
  const [step, setStep] = useState<DesignStep>('sun');
  const [lightCategories, setLightCategories] = useState<SunLevel[]>(DEFAULT_LIGHT_CATEGORIES);
  const [moistureCategories, setMoistureCategories] = useState<MoistureLevel[]>(
    DEFAULT_MOISTURE_CATEGORIES
  );
  const [paintSun, setPaintSun] = useState<SunLevel>('Sun');
  const [paintMoisture, setPaintMoisture] = useState<MoistureLevel>('Moist');
  const [showSun, setShowSun] = useState(true);
  const [showMoisture, setShowMoisture] = useState(true);
  const [showCanopies, setShowCanopies] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number }>({
    col: 0,
    row: 0,
  });
  const [activeCategory, setActiveCategory] = useState<'all' | PlantCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [matchCellConditions, setMatchCellConditions] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Live FloraAPI plants state
  const [apiPlants, setApiPlants] = useState<NativePlant[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [floraConfigured, setFloraConfigured] = useState(true);
  const [floraError, setFloraError] = useState<string | null>(null);

  // Rich Plant Selector Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<NativePlant | null>(null);
  const [clickPlacePlant, setClickPlacePlant] = useState<NativePlant | null>(null);

  const [isPainting, setIsPainting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmProceedWithConflicts, setConfirmProceedWithConflicts] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stopPainting = () => setIsPainting(false);
    window.addEventListener('mouseup', stopPainting);
    return () => window.removeEventListener('mouseup', stopPainting);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 260);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const safeCol = Math.min(project.width - 1, selectedCell.col);
  const safeRow = Math.min(project.height - 1, selectedCell.row);
  const activeCell = project.cells[safeRow]?.[safeCol] ?? { sun: 'Sun', moisture: 'Moist' };

  // Fetch Massachusetts native plants enriched via GET /v1/species/{id}
  useEffect(() => {
    const controller = new AbortController();
    setLoadingPlants(true);
    setFloraError(null);

    fetchMassachusettsNativePlants({
      q: debouncedSearch,
      category: activeCategory,
      light: matchCellConditions ? activeCell.sun : 'all',
      moisture: matchCellConditions ? activeCell.moisture : 'all',
      limit: 18,
      offset: 0,
      signal: controller.signal,
    })
      .then((res) => {
        setFloraConfigured(res.configured);
        setApiPlants(res.plants);
        setTotalAvailable(res.totalCount);
        setFloraError(res.error ?? null);

        if (res.lightCategories.length > 0) {
          setLightCategories((prev) => {
            const seen = new Set(prev.map((x) => x.toLowerCase()));
            const merged = [...prev];
            for (const c of res.lightCategories) {
              if (!seen.has(c.toLowerCase())) {
                seen.add(c.toLowerCase());
                merged.push(c);
              }
            }
            return merged;
          });
        }
        if (res.moistureCategories.length > 0) {
          setMoistureCategories((prev) => {
            const seen = new Set(prev.map((x) => x.toLowerCase()));
            const merged = [...prev];
            for (const c of res.moistureCategories) {
              if (!seen.has(c.toLowerCase())) {
                seen.add(c.toLowerCase());
                merged.push(c);
              }
            }
            return merged;
          });
        }

        setSelectedPlant((prev) => {
          if (prev && res.plants.some((p) => p.id === prev.id)) return prev;
          return res.plants[0] ?? null;
        });
        setLoadingPlants(false);
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        setFloraError('Unable to load Massachusetts native plants.');
        setLoadingPlants(false);
      });

    return () => controller.abort();
  }, [
    debouncedSearch,
    activeCategory,
    activeCell.sun,
    activeCell.moisture,
    matchCellConditions,
    reloadNonce,
  ]);

  const conflictMap = useMemo(
    () => getConflictDetails(project.placements, project.width, project.height),
    [project.placements, project.width, project.height]
  );

  const overlapCount = useMemo(() => {
    let count = 0;
    conflictMap.forEach((c) => {
      if (c.overlapsWith.length > 0) count++;
    });
    return count;
  }, [conflictMap]);

  const boundaryCount = useMemo(() => {
    let count = 0;
    conflictMap.forEach((c) => {
      if (c.boundary) count++;
    });
    return count;
  }, [conflictMap]);

  const seasonCoverage = useMemo(() => {
    const months = new Set<number>();
    project.placements.forEach((p) => {
      const pl = getRegisteredPlant(p.plantId, p.plantSnapshot);
      pl?.bloomMonths.forEach((m) => months.add(m));
    });
    return {
      spring: months.has(4) || months.has(5),
      summer: months.has(6) || months.has(7) || months.has(8),
      fall: months.has(9) || months.has(10),
    };
  }, [project.placements]);

  const paintCell = (col: number, row: number) => {
    onUpdateProject((proj) => {
      const nextCells = proj.cells.map((rArr, rIdx) =>
        rIdx === row
          ? rArr.map((cell, cIdx) => {
              if (cIdx !== col) return cell;
              if (step === 'sun') return { ...cell, sun: paintSun };
              if (step === 'moisture') return { ...cell, moisture: paintMoisture };
              return cell;
            })
          : rArr
      );
      return { ...proj, cells: nextCells };
    });
  };

  const fillAllCells = () => {
    onUpdateProject((proj) => {
      const nextCells = proj.cells.map((rArr) =>
        rArr.map((cell) =>
          step === 'sun' ? { ...cell, sun: paintSun } : { ...cell, moisture: paintMoisture }
        )
      );
      return { ...proj, cells: nextCells };
    });
  };

  const placePlant = (plant: NativePlant, rawX: number, rawY: number) => {
    setNotice(null);
    setConfirmProceedWithConflicts(false);
    onUpdateProject((proj) => ({
      ...proj,
      placements: [
        ...proj.placements,
        {
          uid: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          plantId: plant.id,
          cx: snapCoord(rawX, plant.spreadFt),
          cy: snapCoord(rawY, plant.spreadFt),
          plantSnapshot: plant,
        },
      ],
    }));
  };

  const movePlant = (uid: string, rawX: number, rawY: number) => {
    setConfirmProceedWithConflicts(false);
    onUpdateProject((proj) => ({
      ...proj,
      placements: proj.placements.map((item) => {
        if (item.uid !== uid) return item;
        const resolved = getRegisteredPlant(item.plantId, item.plantSnapshot);
        const spread = resolved?.spreadFt ?? 2;
        return {
          ...item,
          cx: snapCoord(rawX, spread),
          cy: snapCoord(rawY, spread),
        };
      }),
    }));
  };

  const removePlant = (uid: string) => {
    setConfirmProceedWithConflicts(false);
    onUpdateProject((proj) => ({
      ...proj,
      placements: proj.placements.filter((p) => p.uid !== uid),
    }));
  };

  const handlePaletteDragStart = (e: DragEvent, plant: NativePlant) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new', plant }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlacedDragStart = (e: DragEvent, uid: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'move', uid }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGridDrop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw || !gridRef.current) return;
    try {
      const payload = JSON.parse(raw) as {
        type: 'new' | 'move';
        plant?: NativePlant;
        uid?: string;
      };
      const rect = gridRef.current.getBoundingClientRect();
      const dropX = (e.clientX - rect.left) / CELL_PX;
      const dropY = (e.clientY - rect.top) / CELL_PX;
      if (payload.type === 'new' && payload.plant) {
        placePlant(payload.plant, dropX, dropY);
      } else if (payload.type === 'move' && payload.uid) {
        movePlant(payload.uid, dropX, dropY);
      }
      setStep('plants');
    } catch {
      // Ignore malformed drop payloads
    }
  };

  const handleCellClick = (col: number, row: number) => {
    if (step !== 'plants') return;
    setSelectedCell({ col, row });
    if (clickPlacePlant) {
      placePlant(clickPlacePlant, col + 0.5, row + 0.5);
      setClickPlacePlant(null);
    }
  };

  const handleTryComplete = () => {
    if (project.placements.length === 0) {
      setNotice(
        'Place at least one Massachusetts native plant on your garden grid before transitioning to maintenance.'
      );
      setStep('plants');
      return;
    }
    if (conflictMap.size > 0 && !confirmProceedWithConflicts) {
      setConfirmProceedWithConflicts(true);
      return;
    }
    setConfirmProceedWithConflicts(false);
    onCompleteGarden();
  };

  const switchStep = (next: DesignStep) => {
    setStep(next);
    if (next === 'sun') setShowSun(true);
    if (next === 'moisture') setShowMoisture(true);
    if (next === 'plants') setShowCanopies(true);
    setNotice(null);
  };

  const selectedZoneSurvives = selectedPlant
    ? isZoneWithinRange(
        project.zone,
        selectedPlant.hardinessZoneMin,
        selectedPlant.hardinessZoneMax
      )
    : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E3E8E4] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-[#4A5D52]">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 hover:text-[#14261C] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Gardens</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-mono tabular-nums">
              {project.width} × {project.height} ft ({project.width * project.height} sq ft)
            </span>
            <span aria-hidden="true">·</span>
            <span>Zone {project.zone}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{project.placements.length} placed</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#14261C]">
            {project.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white border border-[#E3E8E4] rounded-lg text-xs text-[#4A5D52]">
            <span className="font-medium text-[#14261C]">Nectar:</span>
            <span
              className={seasonCoverage.spring ? 'text-[#15803D] font-semibold' : 'text-[#8B9C91]'}
            >
              {seasonCoverage.spring ? '✓ ' : ''}Spring
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={seasonCoverage.summer ? 'text-[#15803D] font-semibold' : 'text-[#8B9C91]'}
            >
              {seasonCoverage.summer ? '✓ ' : ''}Summer
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={seasonCoverage.fall ? 'text-[#15803D] font-semibold' : 'text-[#8B9C91]'}
            >
              {seasonCoverage.fall ? '✓ ' : ''}Fall
            </span>
          </div>

          <button
            type="button"
            onClick={handleTryComplete}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Complete &amp; Track Maintenance</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Notices & Conflict Override Confirmation */}
      {notice && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-[#FEF3C7] rounded cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {confirmProceedWithConflicts && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 text-sm text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              You still have {conflictMap.size} mature spread conflict
              {conflictMap.size > 1 ? 's' : ''} highlighted in crimson. Continue to maintenance
              anyway?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCompleteGarden}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-md cursor-pointer"
            >
              Continue Anyway
            </button>
            <button
              type="button"
              onClick={() => setConfirmProceedWithConflicts(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#14261C] bg-white border border-[#D4DDD7] rounded-md cursor-pointer"
            >
              Keep Editing
            </button>
          </div>
        </div>
      )}

      {/* 3-Step Workflow Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E3E8E4] rounded-xl p-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'sun' as DesignStep, num: '01', label: 'Light Requirements' },
            { id: 'moisture' as DesignStep, num: '02', label: 'Soil Moisture' },
            { id: 'plants' as DesignStep, num: '03', label: 'Click Grid & Place Native Plants' },
          ].map((item) => {
            const active = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchStep(item.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-[#1B4332] text-white'
                    : 'text-[#4A5D52] hover:bg-[#F2F5F2] hover:text-[#14261C]'
                }`}
              >
                <span
                  className={`font-mono text-xs ${active ? 'text-[#A7F3D0]' : 'text-[#6B7D72]'}`}
                >
                  {item.num}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Layer Visibility Controls */}
        <div className="flex items-center gap-1.5 px-2">
          <Eye className="w-3.5 h-3.5 text-[#5B6E62] mr-0.5" />
          <span className="text-xs font-medium text-[#5B6E62] mr-1">Layers:</span>
          <button
            type="button"
            onClick={() => setShowSun((v) => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
              showSun
                ? 'bg-[#FEF9C3] border-[#EAB308] text-[#713F12]'
                : 'bg-[#F9FAF8] border-[#E3E8E4] text-[#6B7D72]'
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setShowMoisture((v) => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
              showMoisture
                ? 'bg-[#E0F2FE] border-[#0284C7] text-[#0C4A6E]'
                : 'bg-[#F9FAF8] border-[#E3E8E4] text-[#6B7D72]'
            }`}
          >
            Soil Moisture
          </button>
          <button
            type="button"
            onClick={() => setShowCanopies((v) => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
              showCanopies
                ? 'bg-[#DCFCE7] border-[#16A34A] text-[#14532D]'
                : 'bg-[#F9FAF8] border-[#E3E8E4] text-[#6B7D72]'
            }`}
          >
            Plants
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Backyard Grid Canvas */}
        <div className="xl:col-span-8 bg-white border border-[#E3E8E4] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EEF2EF]">
            {step === 'sun' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#14261C] mr-1">
                    Light Requirement:
                  </span>
                  {lightCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPaintSun(cat)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                        paintSun === cat
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#F9FAF8] text-[#14261C] border-[#D4DDD7] hover:bg-[#EEF4F0]'
                      }`}
                    >
                      <LightIcon value={cat} className="w-3.5 h-3.5" />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fillAllCells}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#4A5D52] hover:text-[#14261C] bg-[#F2F5F2] rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <PaintBucket className="w-3.5 h-3.5" />
                    <span>Fill All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchStep('moisture')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#1B4332] rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Next: Soil Moisture →
                  </button>
                </div>
              </>
            )}

            {step === 'moisture' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#14261C] mr-1">Soil Moisture:</span>
                  {moistureCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPaintMoisture(cat)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                        paintMoisture === cat
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#F9FAF8] text-[#14261C] border-[#D4DDD7] hover:bg-[#EEF4F0]'
                      }`}
                    >
                      <MoistureIcon value={cat} className="w-3.5 h-3.5" />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fillAllCells}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#4A5D52] hover:text-[#14261C] bg-[#F2F5F2] rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <PaintBucket className="w-3.5 h-3.5" />
                    <span>Fill All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchStep('plants')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#1B4332] rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Next: Place Plants →
                  </button>
                </div>
              </>
            )}

            {step === 'plants' && (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <div className="text-xs text-[#35473C]">
                  <span className="font-semibold text-[#14261C]">Placement Mode:</span> Click any
                  square to match FloraAPI light &amp; soil moisture conditions, select from the
                  photo dropdown, or drag onto the grid.
                </div>
                {clickPlacePlant && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332] bg-[#E7F4EC] px-2.5 py-1 rounded-md">
                    <span>Click any square to place {clickPlacePlant.name}</span>
                    <button
                      type="button"
                      onClick={() => setClickPlacePlant(null)}
                      className="underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {conflictMap.size > 0 && (
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 text-xs bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <div>
                <span className="font-semibold">
                  Space Conflict Detected ({conflictMap.size} plant
                  {conflictMap.size > 1 ? 's' : ''}):
                </span>{' '}
                {overlapCount > 0 && (
                  <span>
                    {overlapCount} overlapping mature spread canop{overlapCount > 1 ? 'ies' : 'y'}.{' '}
                  </span>
                )}
                {boundaryCount > 0 && (
                  <span>{boundaryCount} extending past the garden border. </span>
                )}
                Drag red-highlighted plants to resolve spacing before planting.
              </div>
            </div>
          )}

          {/* Wooden-Framed Backyard Canvas */}
          <div className="rounded-xl bg-[#4E6E3A] p-4 border-[6px] border-[#6E513B] shadow-inner overflow-x-auto">
            <div className="inline-block mx-auto">
              <div className="flex items-center pl-7 mb-1.5">
                {Array.from({ length: project.width }, (_, c) => (
                  <div
                    key={c}
                    style={{ width: CELL_PX }}
                    className="text-center font-mono text-[10px] text-white/80 tabular-nums select-none"
                  >
                    {c + 1}ft
                  </div>
                ))}
              </div>

              <div className="flex items-start">
                <div className="flex flex-col pr-1.5">
                  {Array.from({ length: project.height }, (_, r) => (
                    <div
                      key={r}
                      style={{ height: CELL_PX }}
                      className="w-5 flex items-center justify-end font-mono text-[10px] text-white/80 tabular-nums select-none"
                    >
                      {r + 1}
                    </div>
                  ))}
                </div>

                <div
                  ref={gridRef}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleGridDrop}
                  style={{
                    width: project.width * CELL_PX,
                    height: project.height * CELL_PX,
                    gridTemplateColumns: `repeat(${project.width}, ${CELL_PX}px)`,
                    gridTemplateRows: `repeat(${project.height}, ${CELL_PX}px)`,
                  }}
                  className="relative grid backyard-turf border border-white/40 select-none"
                >
                  {project.cells.map((rowArr, r) =>
                    rowArr.map((cell, c) => {
                      const isSelected = step === 'plants' && safeCol === c && safeRow === r;
                      return (
                        <div
                          key={`${c}-${r}`}
                          onMouseDown={() => {
                            if (step === 'sun' || step === 'moisture') {
                              setIsPainting(true);
                              paintCell(c, r);
                            }
                          }}
                          onMouseEnter={() => {
                            if (isPainting && (step === 'sun' || step === 'moisture')) {
                              paintCell(c, r);
                            }
                          }}
                          onClick={() => handleCellClick(c, r)}
                          className={`relative border border-dashed border-white/25 cursor-pointer transition-shadow ${
                            isSelected
                              ? 'ring-2 ring-[#FEF08A] ring-inset z-10'
                              : 'hover:ring-1 hover:ring-white/80 hover:z-10'
                          }`}
                          title={`Square (${c + 1}, ${r + 1}) — Light: ${cell.sun}, Soil Moisture: ${cell.moisture}`}
                        >
                          {showSun && (
                            <div
                              className={`absolute inset-0 pointer-events-none ${getLightOverlayClass(cell.sun)}`}
                            />
                          )}
                          {showMoisture && (
                            <div
                              className={`absolute inset-0 pointer-events-none ${getMoistureOverlayClass(cell.moisture)}`}
                            />
                          )}

                          <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)] pointer-events-none leading-none">
                            {showSun ? getLightShortCode(cell.sun) : ''}
                            {showSun && showMoisture ? '·' : ''}
                            {showMoisture ? getMoistureShortCode(cell.moisture) : ''}
                          </span>
                        </div>
                      );
                    })
                  )}

                  {/* Placed Plants with True Mature Spread Canopy Circles */}
                  {showCanopies &&
                    project.placements.map((placement) => {
                      const plant = getRegisteredPlant(placement.plantId, placement.plantSnapshot);
                      if (!plant) return null;
                      const diaPx = plant.spreadFt * CELL_PX;
                      const leftPx = placement.cx * CELL_PX - diaPx / 2;
                      const topPx = placement.cy * CELL_PX - diaPx / 2;
                      const conflict = conflictMap.get(placement.uid);
                      const isConflict = Boolean(conflict);
                      const fit = checkMicroclimateFit(
                        placement,
                        project.cells,
                        project.width,
                        project.height
                      );
                      const mismatch = !fit.sunOk || !fit.moistureOk;

                      return (
                        <div
                          key={placement.uid}
                          draggable
                          onDragStart={(e) => handlePlacedDragStart(e, placement.uid)}
                          style={{
                            width: diaPx,
                            height: diaPx,
                            left: leftPx,
                            top: topPx,
                          }}
                          className={`group absolute rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
                            isConflict
                              ? 'z-20 bg-[#DC2626]/42 border-[3px] border-[#DC2626] shadow-[0_0_14px_rgba(220,38,38,0.65)]'
                              : mismatch
                                ? 'z-15 bg-[#FEF3C7]/60 border-2 border-dashed border-[#D97706]'
                                : 'z-15 bg-[#D8F3DC]/55 border-2 border-dashed border-white/90 hover:bg-[#D8F3DC]/78'
                          }`}
                          title={`${plant.name} (${plant.sci}) · ${plant.hardinessRange} · ${plant.spreadFt} ft spread`}
                        >
                          <PlantAvatar
                            plant={plant}
                            rounded="full"
                            size={Math.min(72, Math.max(32, Math.round(diaPx * 0.64)))}
                            className="border-2 border-white shadow-xs"
                          />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlant(placement.uid);
                            }}
                            aria-label={`Remove ${plant.name}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#14261C] hover:bg-[#DC2626] text-white flex items-center justify-center shadow transition-opacity cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[#14261C] text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap shadow z-30">
                            {plant.name} · <span className="italic">{plant.sci}</span> ·{' '}
                            {plant.spreadFt}ft
                            {isConflict ? ' · Conflict' : mismatch ? ' · Check light/moisture' : ''}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Legend using FloraAPI categories */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#4A5D52] pt-1">
            {lightCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3.5 h-3.5 rounded-xs border border-[#64748B] ${getLightOverlayClass(cat)}`}
                />
                {cat} ({getLightShortCode(cat)})
              </span>
            ))}
            {moistureCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5">
                <span
                  className={`w-3.5 h-3.5 rounded-xs bg-white ${getMoistureOverlayClass(cat)}`}
                />
                {cat} ({getMoistureShortCode(cat)})
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#DC2626]/40 border-2 border-[#DC2626]" />
              Space Conflict
            </span>
          </div>
        </div>

        {/* Right: Contextual Step Guide or FloraAPI Massachusetts Plant Selector */}
        <aside className="xl:col-span-4 bg-white border border-[#E3E8E4] rounded-xl p-5 flex flex-col max-h-[840px]">
          {step === 'sun' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#2D6A4F] font-semibold">STEP 01 OF 03</div>
              <h2 className="font-display text-xl font-semibold text-[#14261C]">
                Map Light Requirements
              </h2>
              <p className="text-sm text-[#4A5D52] leading-relaxed">
                Click or click-and-drag across your grid using the exact light requirement
                categories pulled from FloraAPI species data.
              </p>

              <div className="space-y-3 pt-2 border-t border-[#EEF2EF] text-sm">
                {lightCategories.map((cat) => (
                  <div key={cat} className="flex items-start gap-2.5">
                    <LightIcon
                      value={cat}
                      className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-[#14261C]">{cat}</div>
                      <p className="text-xs text-[#4A5D52]">{getLightGuidance(cat)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => switchStep('moisture')}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors cursor-pointer mt-2"
              >
                Continue to Soil Moisture →
              </button>
            </div>
          )}

          {step === 'moisture' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#2D6A4F] font-semibold">STEP 02 OF 03</div>
              <h2 className="font-display text-xl font-semibold text-[#14261C]">
                Map Soil Moisture
              </h2>
              <p className="text-sm text-[#4A5D52] leading-relaxed">
                Paint soil drainage across your yard using the exact soil moisture categories pulled
                from FloraAPI species data.
              </p>

              <div className="space-y-3 pt-2 border-t border-[#EEF2EF] text-sm">
                {moistureCategories.map((cat) => (
                  <div key={cat} className="flex items-start gap-2.5">
                    <MoistureIcon
                      value={cat}
                      className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-[#14261C]">{cat}</div>
                      <p className="text-xs text-[#4A5D52]">{getMoistureGuidance(cat)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => switchStep('plants')}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors cursor-pointer mt-2"
              >
                Continue to MA Native Plants →
              </button>
            </div>
          )}

          {step === 'plants' && (
            <div className="flex flex-col h-full min-h-0 space-y-3">
              {/* Cell Context Header */}
              <div className="space-y-1 shrink-0">
                <div className="flex items-center justify-between text-xs text-[#4A5D52]">
                  <span className="font-mono font-semibold text-[#1B4332] tabular-nums">
                    Square ({safeCol + 1}, {safeRow + 1})
                  </span>
                  <span>
                    {activeCell.sun} · {activeCell.moisture}
                  </span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#14261C]">
                  Native MA Plants (FloraAPI)
                </h2>
                <div className="flex items-center justify-between text-[11px] text-[#5B6E62]">
                  <span>state=MA · native_only=true</span>
                  <button
                    type="button"
                    onClick={() => setMatchCellConditions((v) => !v)}
                    className="font-semibold text-[#1B4332] hover:underline cursor-pointer"
                  >
                    {matchCellConditions ? 'Matched to cell (Show all MA)' : 'All MA (Match cell)'}
                  </button>
                </div>
              </div>

              {/* Live Search + Category Tabs */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6B7D72] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search MA native by common, scientific, family..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#F2F5F2] rounded-lg overflow-x-auto">
                  {CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCategory === tab.key
                          ? 'bg-white text-[#14261C] shadow-xs'
                          : 'text-[#4A5D52] hover:text-[#14261C]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error / Setup Notice */}
              {floraError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg space-y-2 shrink-0">
                  <div className="flex items-start gap-2 text-xs text-[#991B1B]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        {floraConfigured ? 'FloraAPI Error' : 'Configure FLORA_API_KEY'}
                      </div>
                      <p className="text-[11px] mt-0.5 text-[#7F1D1D]">{floraError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReloadNonce((n) => n + 1)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#1B4332] bg-white border border-[#D4DDD7] rounded-md cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Rich Photo Dropdown Selector */}
              <div ref={dropdownRef} className="relative shrink-0">
                <label className="block text-[11px] font-semibold text-[#14261C] mb-1">
                  Select Massachusetts Native Species ({totalAvailable.toLocaleString()} matching)
                </label>
                <button
                  type="button"
                  disabled={loadingPlants || apiPlants.length === 0}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  className="w-full flex items-center justify-between gap-2.5 p-2 bg-[#F9FAF8] hover:bg-white border border-[#CBD6CE] rounded-lg text-left transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {selectedPlant ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlantAvatar plant={selectedPlant} size={38} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#14261C] truncate">
                          {selectedPlant.name}
                        </div>
                        <div className="text-[11px] italic text-[#5B6E62] truncate">
                          {selectedPlant.sci} · {selectedPlant.hardinessRange}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#5B6E62] py-2 px-1">
                      {loadingPlants
                        ? 'Loading native MA plants & growing conditions...'
                        : 'No plants available for this filter'}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-[#4A5D52] shrink-0 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options Menu with Representative Photos & Growing Conditions */}
                {dropdownOpen && apiPlants.length > 0 && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 mt-1 z-30 bg-white border border-[#CBD6CE] rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-[#EEF2EF]"
                  >
                    {apiPlants.map((plant) => {
                      const isCurrent = selectedPlant?.id === plant.id;
                      return (
                        <button
                          key={plant.id}
                          type="button"
                          role="option"
                          aria-selected={isCurrent}
                          onClick={() => {
                            setSelectedPlant(plant);
                            setDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                            isCurrent ? 'bg-[#EEF6F0]' : 'hover:bg-[#F7FAF8]'
                          }`}
                        >
                          <PlantAvatar plant={plant} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#14261C] truncate">
                                {plant.name}
                              </span>
                              <span className="font-mono text-[10px] text-[#2D6A4F] shrink-0">
                                {plant.hardinessRange}
                              </span>
                            </div>
                            <div className="text-[11px] italic text-[#5B6E62] truncate">
                              {plant.sci}
                            </div>
                            <div className="text-[10px] text-[#4A5D52] truncate">
                              {plant.family} · {plant.genus} ·{' '}
                              {plant.waterUse.length > 0
                                ? `Water: ${plant.waterUse.join('/')}`
                                : 'Native (MA)'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Plant Detail Card with Growing Conditions & Water Use Description */}
              {selectedPlant && !loadingPlants && (
                <div
                  draggable
                  onDragStart={(e) => handlePaletteDragStart(e, selectedPlant)}
                  className="p-3 bg-[#F5F9F6] border border-[#CFE0D5] rounded-xl space-y-2 shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3">
                    <PlantAvatar plant={selectedPlant} size={56} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-semibold text-[#14261C] leading-snug">
                        {selectedPlant.name}
                      </div>
                      <div className="text-xs italic text-[#4A5D52]">{selectedPlant.sci}</div>
                      <div className="text-[11px] text-[#35473C]">
                        <strong>Family:</strong> {selectedPlant.family} · <strong>Genus:</strong>{' '}
                        <span className="italic">{selectedPlant.genus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Growing Conditions from GET /v1/species/{id} */}
                  <div className="text-[11px] text-[#35473C] space-y-1 pt-1.5 border-t border-[#DCE8E0]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        <strong className="text-[#14261C]">Light:</strong>{' '}
                        {selectedPlant.lightRequirements.length > 0
                          ? selectedPlant.lightRequirements.join(', ')
                          : 'Not listed'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-[#14261C]">Soil Moisture:</strong>{' '}
                        {selectedPlant.soilMoisture.length > 0
                          ? selectedPlant.soilMoisture.join(', ')
                          : 'Not listed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                      <span>
                        <strong className="text-[#14261C]">Hardiness:</strong>{' '}
                        <span className="font-mono">{selectedPlant.hardinessRange}</span>
                        {selectedZoneSurvives === true && (
                          <span className="text-[#15803D] font-semibold">
                            {' '}
                            · Survives Zone {project.zone}
                          </span>
                        )}
                        {selectedZoneSurvives === false && (
                          <span className="text-[#B45309] font-semibold">
                            {' '}
                            · Check Zone {project.zone} fit
                          </span>
                        )}
                      </span>
                    </div>

                    {selectedPlant.commonNames.length > 1 && (
                      <div className="text-[11px] text-[#4A5D52]">
                        <strong className="text-[#14261C]">Common names:</strong>{' '}
                        {selectedPlant.commonNames.join(', ')}
                      </div>
                    )}

                    {/* Description explicitly containing Water Use */}
                    <p className="text-[11px] text-[#35473C] leading-relaxed pt-0.5">
                      {selectedPlant.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => placePlant(selectedPlant, safeCol + 0.5, safeRow + 0.5)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Place at ({safeCol + 1}, {safeRow + 1})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setClickPlacePlant((prev) =>
                          prev?.id === selectedPlant.id ? null : selectedPlant
                        )
                      }
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        clickPlacePlant?.id === selectedPlant.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-white text-[#1B4332] border-[#CBD6CE] hover:bg-[#EEF4F0]'
                      }`}
                    >
                      {clickPlacePlant?.id === selectedPlant.id ? 'Click Grid…' : 'Click-Place'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Draggable List Below Dropdown */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1 border-t border-[#EEF2EF]">
                <div className="text-[11px] font-medium text-[#5B6E62]">
                  Or drag any Massachusetts native species onto your map:
                </div>

                {loadingPlants ? (
                  <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 bg-[#F2F5F2] rounded-lg" />
                    ))}
                  </div>
                ) : apiPlants.length === 0 && !floraError ? (
                  <div className="p-5 text-center bg-[#F9FAF8] border border-[#E3E8E4] rounded-lg space-y-2">
                    <Sprout className="w-5 h-5 text-[#6B7D72] mx-auto" />
                    <p className="text-xs text-[#4A5D52]">
                      No native MA plants matched{' '}
                      <strong>
                        {activeCell.sun} + {activeCell.moisture}
                      </strong>
                      . Switch to <strong>All MA</strong> or try another grid square.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMatchCellConditions(false);
                        setActiveCategory('all');
                        setSearchTerm('');
                      }}
                      className="text-xs font-semibold text-[#1B4332] underline cursor-pointer"
                    >
                      Show all native MA species
                    </button>
                  </div>
                ) : (
                  apiPlants.map((plant) => {
                    const isSelectedToPlace = clickPlacePlant?.id === plant.id;
                    return (
                      <div
                        key={plant.id}
                        draggable
                        onDragStart={(e) => handlePaletteDragStart(e, plant)}
                        onClick={() => {
                          setSelectedPlant(plant);
                          setClickPlacePlant((prev) => (prev?.id === plant.id ? null : plant));
                        }}
                        className={`p-2.5 rounded-lg border transition-colors cursor-grab active:cursor-grabbing flex items-start gap-2.5 ${
                          isSelectedToPlace
                            ? 'bg-[#EEF6F0] border-[#1B4332] ring-1 ring-[#1B4332]'
                            : 'bg-[#F9FAF8] border-[#E3E8E4] hover:border-[#52B788] hover:bg-white'
                        }`}
                      >
                        <PlantAvatar plant={plant} size={42} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold text-[#14261C] truncate">
                              {plant.name}
                            </h3>
                            <span className="font-mono text-[10px] font-semibold text-[#2D6A4F] tabular-nums shrink-0">
                              {plant.hardinessRange}
                            </span>
                          </div>
                          <div className="text-[11px] italic text-[#5B6E62] truncate">
                            {plant.sci}
                          </div>
                          <div className="text-[10px] text-[#4A5D52] truncate">
                            {plant.family} · <span className="italic">{plant.genus}</span> ·{' '}
                            {plant.spreadFt} ft spread
                          </div>
                          <p className="text-[10px] text-[#35473C] line-clamp-2 leading-snug">
                            {plant.description}
                          </p>
                          {isSelectedToPlace && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1B4332]">
                              <Check className="w-3 h-3" />
                              <span>Click any grid square to place</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
