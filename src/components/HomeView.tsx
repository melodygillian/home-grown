import { useState } from 'react';
import { ArrowRight, Compass, Droplets, Sprout, Sun } from 'lucide-react';

interface HomeViewProps {
  userEmail: string | null;
  onStartPlanning: () => void;
  onTrySampleGarden: () => void;
  onTrackGarden: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenCatalog: () => void;
}

const HERO_IMG = '/planner-images/hero_ma_meadow_1795296708076.jpg';
const SHADE_IMG = '/planner-images/woodland_shade_garden_1795296709359.jpg';
const RAIN_IMG = '/planner-images/rain_garden_wetland_1795296714768.jpg';

function ResilientPhoto({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white p-6 text-center ${className}`}
      >
        <Sprout className="w-8 h-8 mb-2 opacity-80" />
        <span className="font-display text-lg font-semibold">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function HomeView({
  userEmail,
  onStartPlanning,
  onTrySampleGarden,
  onTrackGarden,
  onOpenAuth,
  onOpenCatalog,
}: HomeViewProps) {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-16">
      {/* Editorial Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="text-xs font-medium text-[#4A5D52] tracking-normal">
            Massachusetts USDA Zones 5b–7a · Ecological Yard Design
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#14261C] leading-[1.12] [text-wrap:balance]">
            Restore Massachusetts biodiversity, one backyard grid at a time.
          </h1>

          <p className="text-base sm:text-lg text-[#3D4F44] leading-relaxed max-w-[60ch]">
            Conventional turfgrass offers little food or shelter to local wildlife. BayState Bloom
            turns your exact yard dimensions, sunlight pockets, and soil drainage into a conflict-free
            Massachusetts native planting plan with year-round ecological care.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onStartPlanning}
              className="group text-left p-5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-xl font-semibold">1 · Plan a new garden</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block mt-1.5 text-[15px] text-white/85 leading-snug">
                Map your yard’s sun and soil, then place native plants that fit.
              </span>
            </button>
            <button
              type="button"
              onClick={onTrackGarden}
              className="group text-left p-5 rounded-xl bg-white hover:bg-[#EEF4F0] border-2 border-[#1B4332] text-[#14261C] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-xl font-semibold text-[#1B4332]">2 · Track my garden</span>
                <ArrowRight className="w-5 h-5 text-[#1B4332] transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block mt-1.5 text-[15px] text-[#3D4F44] leading-snug">
                Mark what you planted, log check-ins by voice or photo, and get weather alerts.
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onTrySampleGarden}
              className="px-4 py-3 text-[15px] font-semibold text-[#1B4332] bg-white hover:bg-[#EEF4F0] border border-[#CBD6CE] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Sample 12 × 8 ft Garden
            </button>

            {!userEmail && (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="text-[15px] font-medium text-[#4A5D52] hover:text-[#14261C] underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                Log in to saved gardens
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-[#E3E8E4] grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-mono tabular-nums text-xl font-semibold text-[#14261C]">
                2,200+
              </div>
              <div className="text-xs text-[#4A5D52] mt-0.5">Live MA Native Species</div>
            </div>
            <div>
              <div className="font-mono tabular-nums text-xl font-semibold text-[#14261C]">
                1 ft²
              </div>
              <div className="text-xs text-[#4A5D52] mt-0.5">Precision Grid Resolution</div>
            </div>
            <div>
              <div className="font-mono tabular-nums text-xl font-semibold text-[#14261C]">
                Apr–Oct
              </div>
              <div className="text-xs text-[#4A5D52] mt-0.5">Pollinator Bloom Coverage</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-full min-h-[340px] lg:min-h-[460px] rounded-xl overflow-hidden border border-[#E3E8E4]">
            <ResilientPhoto
              src={HERO_IMG}
              alt="Massachusetts native backyard meadow with butterfly weed, New England aster, and little bluestem grass alongside a fieldstone wall"
              fallbackTitle="Massachusetts Pollinator Meadow"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0D1B14]/85 via-[#0D1B14]/40 to-transparent p-6 text-white">
              <div className="text-xs text-white/80">Featured Sunny Meadow Palette</div>
              <div className="font-display text-lg font-semibold mt-0.5">
                Butterfly Weed · New England Aster · Little Bluestem
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Workflow Strip */}
      <section className="border-y border-[#E3E8E4] py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#14261C]">
              From bare lawn to thriving habitat in four steps
            </h2>
            <p className="text-sm text-[#4A5D52] mt-1">
              Powered by live Massachusetts native botanical taxonomy, sun/moisture matching, and
              Zone 5b–7a ecological care schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="text-sm font-semibold text-[#1B4332] hover:text-[#2D6A4F] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Browse live MA native plants</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="font-mono text-xs font-semibold text-[#2D6A4F] tabular-nums">01</div>
            <h3 className="font-display text-lg font-semibold text-[#14261C]">
              Map Your Yard Grid
            </h3>
            <p className="text-sm text-[#4A5D52] leading-relaxed">
              Enter your garden dimensions in feet and paint Full Sun, Part Shade, Full Shade, and
              Dry, Average, or Wet soil zones square by square.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-xs font-semibold text-[#2D6A4F] tabular-nums">02</div>
            <h3 className="font-display text-lg font-semibold text-[#14261C]">
              Microclimate Matching
            </h3>
            <p className="text-sm text-[#4A5D52] leading-relaxed">
              Click any square to filter Massachusetts wildflowers, sedges, shrubs, and ferns
              evolved for that exact sunlight and soil moisture pairing.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-xs font-semibold text-[#2D6A4F] tabular-nums">03</div>
            <h3 className="font-display text-lg font-semibold text-[#14261C]">
              Mature Spread Checks
            </h3>
            <p className="text-sm text-[#4A5D52] leading-relaxed">
              Drag botanical silhouettes onto your map at true mature spread. Overlapping or
              out-of-bounds canopies highlight in crimson before you dig.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-xs font-semibold text-[#2D6A4F] tabular-nums">04</div>
            <h3 className="font-display text-lg font-semibold text-[#14261C]">
              Zone 5b–7a Care Log
            </h3>
            <p className="text-sm text-[#4A5D52] leading-relaxed">
              Transition your finished plan into a seasonal maintenance schedule for Year-1
              establishment watering, overwintering stem heights, and wildlife logs.
            </p>
          </div>
        </div>
      </section>

      {/* Massachusetts Microclimate Showcase */}
      <section className="space-y-8">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#14261C]">
            Built for real New England microclimates
          </h2>
          <p className="text-sm text-[#4A5D52] mt-1 max-w-[65ch]">
            Massachusetts yards rarely have uniform soil or light. Map dry shade under mature oaks
            alongside wet downspout swales in the same garden grid.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article className="bg-white border border-[#E3E8E4] rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[16/10] w-full overflow-hidden">
              <ResilientPhoto
                src={SHADE_IMG}
                alt="Massachusetts woodland shade garden with cinnamon ferns, Christmas ferns, and white wood asters"
                fallbackTitle="Woodland Dry & Average Shade"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#4A5D52]">
                  Full Shade · Dry to Average Soil · Tree-Root Resilient
                </div>
                <h3 className="font-display text-xl font-semibold text-[#14261C]">
                  Oak &amp; Maple Woodland Understory
                </h3>
                <p className="text-sm text-[#4A5D52] leading-relaxed">
                  Replace patchy shaded grass with evergreen Christmas Fern, billowing Pennsylvania
                  Sedge, and autumn-blooming White Wood Aster that thrive in root competition.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E3E8E4] text-xs text-[#2D6A4F] font-medium">
                Key Species: Christmas Fern · Pennsylvania Sedge · White Wood Aster · Wild Geranium
              </div>
            </div>
          </article>

          <article className="bg-white border border-[#E3E8E4] rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[16/10] w-full overflow-hidden">
              <ResilientPhoto
                src={RAIN_IMG}
                alt="Massachusetts rain garden border with red cardinal flower, pink swamp milkweed, tussock sedge, and highbush blueberry"
                fallbackTitle="Stormwater Rain Garden Border"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#4A5D52]">
                  Full Sun to Part Shade · Wet Soil · Stormwater Capture
                </div>
                <h3 className="font-display text-xl font-semibold text-[#14261C]">
                  Downspout Rain Garden Swale
                </h3>
                <p className="text-sm text-[#4A5D52] leading-relaxed">
                  Turn soggy low spots into hummingbird and monarch corridors using deep-rooted
                  Tussock Sedge, Swamp Milkweed, scarlet Cardinal Flower, and Highbush Blueberry.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E3E8E4] text-xs text-[#2D6A4F] font-medium">
                Key Species: Cardinal Flower · Swamp Milkweed · Tussock Sedge · Highbush Blueberry
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Why Native Massachusetts Plants Matter */}
      <section className="bg-white border border-[#E3E8E4] rounded-xl p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-3">
            <h2 className="font-display text-2xl font-semibold text-[#14261C]">
              Why native flora matters in Massachusetts
            </h2>
            <p className="text-sm text-[#4A5D52] leading-relaxed">
              Native species coevolved over millennia with New England soils, winters, and wildlife.
              Even a compact 8 × 10 ft native border measurably expands urban pollinator corridors.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Sun className="w-5 h-5 text-[#1B4332]" />
              <h3 className="text-base font-semibold text-[#14261C]">Specialist Pollinators</h3>
              <p className="text-sm text-[#4A5D52] leading-relaxed">
                Over 350 native bee species live in Massachusetts; many specialist bees can only
                raise young on pollen from native asters, goldenrods, and blueberries.
              </p>
            </div>
            <div className="space-y-2">
              <Compass className="w-5 h-5 text-[#1B4332]" />
              <h3 className="text-base font-semibold text-[#14261C]">Songbird Food Webs</h3>
              <p className="text-sm text-[#4A5D52] leading-relaxed">
                Nesting chickadees need thousands of soft caterpillars per clutch—insects that feed
                almost exclusively on native host plants rather than ornamental imports.
              </p>
            </div>
            <div className="space-y-2">
              <Droplets className="w-5 h-5 text-[#1B4332]" />
              <h3 className="text-base font-semibold text-[#14261C]">Climate &amp; Water Calm</h3>
              <p className="text-sm text-[#4A5D52] leading-relaxed">
                Deep fibrous root systems absorb heavy New England storm runoff, tolerate summer
                dry spells once established, and require zero synthetic fertilizers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
