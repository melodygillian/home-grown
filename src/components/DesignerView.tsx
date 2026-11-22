import { useFitCell } from '../utils/useFitCell';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CloudRain,
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


const LIGHT_LABEL: Record<string, string> = {
  Sun: 'sun (6+ hrs)',
  'Part Shade': 'part shade (3–6 hrs)',
  Shade: 'shade (under 3 hrs)',
};
const MOISTURE_LABEL: Record<string, string> = {
  Dry: 'dry (sandy)',
  Moist: 'moist (loam)',
  Wet: 'wet (damp)',
};

/** "1 · 2 · 3" step indicator at the top of the side panel. */
function StepDots({ step, onStep }: { step: DesignStep; onStep: (s: DesignStep) => void }) {
  const steps: [DesignStep, string][] = [
    ['sun', 'light'],
    ['moisture', 'moisture'],
    ['plants', 'plants'],
  ];
  return (
    <ol className="flex items-center gap-1.5 text-[14px]" aria-label="Planning steps">
      {steps.map(([id, label], i) => {
        const active = step === id;
        return (
          <li key={id} className="flex items-center gap-1.5">
            {i > 0 && <span className="w-4 h-[2px] bg-[#30573C]/30" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => onStep(id)}
              aria-current={active ? 'step' : undefined}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer ${
                active ? 'bg-[#30573C] text-white' : 'text-[#30573C] hover:bg-[#F3F1DC]'
              }`}
            >
              <span className="font-bold">{i + 1}</span> {label}
            </button>
          </li>
        );
      })}
    </ol>
  );
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
  const frameRef = useRef<HTMLDivElement | null>(null);
  const CELL_PX = useFitCell(frameRef, project.width, project.height, { min: 24, max: 56, bottomGap: 80 });
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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E6E2CC] pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-[#4E6656]">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 hover:text-[#22392A] cursor-pointer"
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
          <h1 className="text-[clamp(28px,3vw,42px)] leading-tight font-medium text-[#30573C]">
            {project.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white border border-[#E6E2CC] rounded-lg text-xs text-[#4E6656]">
            <span className="font-medium text-[#22392A]">Nectar:</span>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-full cursor-pointer"
            >
              Continue Anyway
            </button>
            <button
              type="button"
              onClick={() => setConfirmProceedWithConflicts(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#22392A] bg-white border border-[#D8D4B8] rounded-md cursor-pointer"
            >
              Keep Editing
            </button>
          </div>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        {/* Left: Backyard Grid Canvas */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step !== 'plants' && (
              <>
        {/* Layer visibility */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-[#5A705F] mr-0.5" />
          <span className="text-xs font-medium text-[#5A705F] mr-1">Layers:</span>
          <button
            type="button"
            onClick={() => setShowSun((v) => !v)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
              showSun
                ? 'bg-[#FEF9C3] border-[#EAB308] text-[#713F12]'
                : 'bg-[#FFFDF3] border-[#E6E2CC] text-[#6A7E6C]'
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
                : 'bg-[#FFFDF3] border-[#E6E2CC] text-[#6A7E6C]'
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
                : 'bg-[#FFFDF3] border-[#E6E2CC] text-[#6A7E6C]'
            }`}
          >
            Plants
          </button>
        </div>
                <button
                  type="button"
                  onClick={fillAllCells}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-[#30573C] border-2 border-[#30573C] hover:bg-[#F3F1DC] rounded-full cursor-pointer whitespace-nowrap"
                >
                  <PaintBucket className="w-4 h-4" />
                  <span>fill whole garden</span>
                </button>
              </>
            )}

            {step === 'plants' && (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <div className="text-xs text-[#34503D]">
                  <span className="font-semibold text-[#22392A]">Placement Mode:</span> Click any
                  square to match FloraAPI light &amp; soil moisture conditions, select from the
                  photo dropdown, or drag onto the grid.
                </div>
                {clickPlacePlant && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#30573C] bg-[#E7F4EC] px-2.5 py-1 rounded-md">
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

          {/* Garden grid canvas (Figma: sage squares in a green-outlined frame) */}
          <div ref={frameRef} className="rounded-3xl bg-[#FFFDF3] p-4 border-[3px] border-[#30573C] overflow-x-auto">
            <div className="inline-block mx-auto">
              <div className="flex items-center pl-7 mb-1.5">
                {Array.from({ length: project.width }, (_, c) => (
                  <div
                    key={c}
                    style={{ width: CELL_PX }}
                    className="text-center font-mono text-[10px] text-[#30573C] tabular-nums select-none"
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
                      className="w-5 flex items-center justify-end font-mono text-[10px] text-[#30573C] tabular-nums select-none"
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
                                : 'z-15 bg-[#F9D3E2]/55 border-2 border-dashed border-white/90 hover:bg-[#F9D3E2]/78'
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
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#22392A] hover:bg-[#DC2626] text-white flex items-center justify-center shadow transition-opacity cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[#22392A] text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap shadow z-30">
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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#4E6656] pt-1">
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
        <aside className="bg-[#FFFDF3] border-[3px] border-[#30573C] rounded-[32px] p-5 flex flex-col lg:sticky lg:top-[92px] max-h-[calc(100vh-108px)] overflow-hidden">
          <StepDots step={step} onStep={switchStep} />

          {step === 'sun' && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[34px] leading-none font-normal text-[#30573C]">map light</h2>
                <Sun className="w-10 h-10 text-[#F2B705]" aria-hidden="true" />
              </div>
              <p className="text-[18px] leading-snug text-[#30573C]">
                click or drag across your grid where there is:
              </p>
              <div className="space-y-3">
                {lightCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={paintSun === cat}
                    onClick={() => setPaintSun(cat)}
                    title={getLightGuidance(cat)}
                    className={`w-full h-14 px-5 rounded-full border-[2.5px] border-[#30573C] text-[20px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      paintSun === cat ? 'bg-[#30573C] text-white' : 'text-[#30573C] hover:bg-[#F3F1DC]'
                    }`}
                  >
                    <LightIcon value={cat} className="w-5 h-5" />
                    {LIGHT_LABEL[cat] ?? cat.toLowerCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => switchStep('moisture')}
                className="w-full h-14 mt-4 rounded-full bg-[#30573C] hover:bg-[#3E6E4D] text-white text-[20px] font-bold cursor-pointer"
              >
                next (moisture) →
              </button>
            </div>
          )}

          {step === 'moisture' && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[34px] leading-none font-normal text-[#30573C]">map soil moisture</h2>
                <CloudRain className="w-10 h-10 text-[#2F8FE0] shrink-0" aria-hidden="true" />
              </div>
              <p className="text-[18px] leading-snug text-[#30573C]">
                click or drag across your grid where the soil is:
              </p>
              <div className="space-y-3">
                {moistureCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={paintMoisture === cat}
                    onClick={() => setPaintMoisture(cat)}
                    title={getMoistureGuidance(cat)}
                    className={`w-full h-14 px-5 rounded-full border-[2.5px] border-[#30573C] text-[20px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      paintMoisture === cat ? 'bg-[#30573C] text-white' : 'text-[#30573C] hover:bg-[#F3F1DC]'
                    }`}
                  >
                    <MoistureIcon value={cat} className="w-5 h-5" />
                    {MOISTURE_LABEL[cat] ?? cat.toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => switchStep('sun')}
                  className="h-14 rounded-full border-[2.5px] border-[#30573C] text-[#30573C] text-[18px] font-bold hover:bg-[#F3F1DC] cursor-pointer"
                >
                  ← back
                </button>
                <button
                  type="button"
                  onClick={() => switchStep('plants')}
                  className="h-14 rounded-full bg-[#30573C] hover:bg-[#3E6E4D] text-white text-[18px] font-bold cursor-pointer"
                >
                  next (plants) →
                </button>
              </div>
            </div>
          )}

          {step === 'plants' && (
            <div className="flex flex-col h-full min-h-0 space-y-3">
              {/* Cell Context Header */}
              <div className="space-y-1 shrink-0">
                <div className="flex items-center justify-between text-xs text-[#4E6656]">
                  <span className="font-mono font-semibold text-[#30573C] tabular-nums">
                    Square ({safeCol + 1}, {safeRow + 1})
                  </span>
                  <span>
                    {activeCell.sun} · {activeCell.moisture}
                  </span>
                </div>
                <h2 className="text-[34px] leading-none font-normal text-[#30573C]">native to MA:</h2>
                <div className="flex items-center justify-between text-[11px] text-[#5A705F]">
                  <span>{activeCell.sun.toLowerCase()} · {activeCell.moisture.toLowerCase()} square</span>
                  <button
                    type="button"
                    onClick={() => setMatchCellConditions((v) => !v)}
                    className="font-semibold text-[#30573C] hover:underline cursor-pointer"
                  >
                    {matchCellConditions ? 'Matched to cell (Show all MA)' : 'All MA (Match cell)'}
                  </button>
                </div>
              </div>

              {/* Live Search + Category Tabs */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-5 h-5 text-[#22392A] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="search for plants"
                    className="w-full pl-11 pr-4 h-12 text-[18px] text-[#30573C] placeholder:text-[#73A384]/70 bg-[#FFFDF3] border-[2.5px] border-[#30573C] rounded-full focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#F8F5E6] rounded-lg overflow-x-auto">
                  {CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCategory === tab.key
                          ? 'bg-white text-[#22392A] shadow-xs'
                          : 'text-[#4E6656] hover:text-[#22392A]'
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#30573C] bg-white border border-[#D8D4B8] rounded-md cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Rich Photo Dropdown Selector */}
              <div ref={dropdownRef} className="relative shrink-0">
                <label className="block text-[11px] font-semibold text-[#22392A] mb-1">
                  Select Massachusetts Native Species ({totalAvailable.toLocaleString()} matching)
                </label>
                <button
                  type="button"
                  disabled={loadingPlants || apiPlants.length === 0}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  className="w-full flex items-center justify-between gap-2.5 p-2 bg-[#FFFDF3] hover:bg-white border border-[#CCC8A8] rounded-lg text-left transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {selectedPlant ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlantAvatar plant={selectedPlant} size={38} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#22392A] truncate">
                          {selectedPlant.name}
                        </div>
                        <div className="text-[11px] italic text-[#5A705F] truncate">
                          {selectedPlant.sci} · {selectedPlant.hardinessRange}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#5A705F] py-2 px-1">
                      {loadingPlants
                        ? 'Loading native MA plants & growing conditions...'
                        : 'No plants available for this filter'}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-[#4E6656] shrink-0 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options Menu with Representative Photos & Growing Conditions */}
                {dropdownOpen && apiPlants.length > 0 && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 mt-1 z-30 bg-white border border-[#CCC8A8] rounded-3xl shadow-lg max-h-72 overflow-y-auto divide-y divide-[#F6F2DF]"
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
                              <span className="text-xs font-semibold text-[#22392A] truncate">
                                {plant.name}
                              </span>
                              <span className="font-mono text-[10px] text-[#3E6E4D] shrink-0">
                                {plant.hardinessRange}
                              </span>
                            </div>
                            <div className="text-[11px] italic text-[#5A705F] truncate">
                              {plant.sci}
                            </div>
                            <div className="text-[10px] text-[#4E6656] truncate">
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
                  className="p-3 bg-[#F5F9F6] border border-[#CFE0D5] rounded-3xl space-y-2 shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3">
                    <PlantAvatar plant={selectedPlant} size={56} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-semibold text-[#22392A] leading-snug">
                        {selectedPlant.name}
                      </div>
                      <div className="text-xs italic text-[#4E6656]">{selectedPlant.sci}</div>
                      <div className="text-[11px] text-[#34503D]">
                        <strong>Family:</strong> {selectedPlant.family} · <strong>Genus:</strong>{' '}
                        <span className="italic">{selectedPlant.genus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Growing Conditions from GET /v1/species/{id} */}
                  <div className="text-[11px] text-[#34503D] space-y-1 pt-1.5 border-t border-[#DCE8E0]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        <strong className="text-[#22392A]">Light:</strong>{' '}
                        {selectedPlant.lightRequirements.length > 0
                          ? selectedPlant.lightRequirements.join(', ')
                          : 'Not listed'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-[#22392A]">Soil Moisture:</strong>{' '}
                        {selectedPlant.soilMoisture.length > 0
                          ? selectedPlant.soilMoisture.join(', ')
                          : 'Not listed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-[#30573C] shrink-0" />
                      <span>
                        <strong className="text-[#22392A]">Hardiness:</strong>{' '}
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
                      <div className="text-[11px] text-[#4E6656]">
                        <strong className="text-[#22392A]">Common names:</strong>{' '}
                        {selectedPlant.commonNames.join(', ')}
                      </div>
                    )}

                    {/* Description explicitly containing Water Use */}
                    <p className="text-[11px] text-[#34503D] leading-relaxed pt-0.5">
                      {selectedPlant.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => placePlant(selectedPlant, safeCol + 0.5, safeRow + 0.5)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-lg cursor-pointer"
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
                          ? 'bg-[#30573C] text-white border-[#30573C]'
                          : 'bg-white text-[#30573C] border-[#CCC8A8] hover:bg-[#F3F1DC]'
                      }`}
                    >
                      {clickPlacePlant?.id === selectedPlant.id ? 'Click Grid…' : 'Click-Place'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Draggable List Below Dropdown */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1 border-t border-[#F6F2DF]">
                <div className="text-[11px] font-medium text-[#5A705F]">
                  Or drag any Massachusetts native species onto your map:
                </div>

                {loadingPlants ? (
                  <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 bg-[#F8F5E6] rounded-lg" />
                    ))}
                  </div>
                ) : apiPlants.length === 0 && !floraError ? (
                  <div className="p-5 text-center bg-[#FFFDF3] border border-[#E6E2CC] rounded-lg space-y-2">
                    <Sprout className="w-5 h-5 text-[#6A7E6C] mx-auto" />
                    <p className="text-xs text-[#4E6656]">
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
                      className="text-xs font-semibold text-[#30573C] underline cursor-pointer"
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
                            ? 'bg-[#EEF6F0] border-[#30573C] ring-1 ring-[#30573C]'
                            : 'bg-[#FFFDF3] border-[#E6E2CC] hover:border-[#52B788] hover:bg-white'
                        }`}
                      >
                        <PlantAvatar plant={plant} size={42} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold text-[#22392A] truncate">
                              {plant.name}
                            </h3>
                            <span className="font-mono text-[10px] font-semibold text-[#3E6E4D] tabular-nums shrink-0">
                              {plant.hardinessRange}
                            </span>
                          </div>
                          <div className="text-[11px] italic text-[#5A705F] truncate">
                            {plant.sci}
                          </div>
                          <div className="text-[10px] text-[#4E6656] truncate">
                            {plant.family} · <span className="italic">{plant.genus}</span> ·{' '}
                            {plant.spreadFt} ft spread
                          </div>
                          <p className="text-[10px] text-[#34503D] line-clamp-2 leading-snug">
                            {plant.description}
                          </p>
                          {isSelectedToPlace && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#30573C]">
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
