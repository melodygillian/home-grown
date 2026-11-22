import { ArrowRight } from 'lucide-react';

interface HomeViewProps {
  userEmail: string | null;
  onStartPlanning: () => void;
  onTrySampleGarden: () => void;
  onTrackGarden: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenCatalog: () => void;
}

const DIY = Array.from({ length: 40 }, () => 'DIY').join(' ');

/**
 * Home page from the team Figma ("home grown"):
 * full-screen blurred wildflower photo, giant see-through "native garden" title,
 * two big pill buttons, then the cream "our mission" panel with pink highlights.
 * The hero is exactly one screen tall, so everything important fits on a laptop without scrolling.
 */
export function HomeView({
  userEmail,
  onStartPlanning,
  onTrySampleGarden,
  onTrackGarden,
  onOpenAuth,
  onOpenCatalog,
}: HomeViewProps) {
  return (
    <div>
      {/* Hero: one screen tall */}
      <section className="relative h-[100svh] min-h-[560px] max-h-[1100px] overflow-hidden flex flex-col">
        <div className="absolute inset-0 hg-photo hg-drift" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

        <div className="relative flex-1 flex flex-col items-center justify-center pt-[76px] pb-8 px-4">
          <h1 className="hg-hero-title hg-rise text-center text-[min(22vw,29vh)] select-none">
            native
            <br />
            garden
          </h1>
          <p className="sr-only">
            Plan a Massachusetts native garden for your real yard, then track it as it grows.
          </p>

          <div className="hg-rise-2 mt-[3vh] flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <button
              type="button"
              onClick={onStartPlanning}
              className="hg-pill-light px-8 h-16 text-[clamp(20px,2.3vw,32px)] whitespace-nowrap cursor-pointer backdrop-blur-[2px]"
            >
              plan a new garden
            </button>
            <button
              type="button"
              onClick={onTrackGarden}
              className="hg-pill-light px-8 h-16 text-[clamp(20px,2.3vw,32px)] whitespace-nowrap cursor-pointer backdrop-blur-[2px]"
            >
              track my garden
            </button>
          </div>

          <div className="hg-rise-3 mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white text-[17px] font-medium drop-shadow">
            <button
              type="button"
              onClick={onTrySampleGarden}
              className="underline underline-offset-4 decoration-white/60 hover:decoration-white cursor-pointer"
            >
              or try a sample 12 × 8 ft garden
            </button>
            {!userEmail && (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="underline underline-offset-4 decoration-white/60 hover:decoration-white cursor-pointer"
              >
                log in to your saved gardens
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="relative overflow-hidden hg-photo">
        <div
          className="absolute left-0 top-0 bottom-0 w-[17%] overflow-hidden text-white/90 text-[40px] leading-[60px] select-none hidden lg:block"
          aria-hidden="true"
        >
          <div className="hg-diy-track px-3 break-words">
            {DIY} {DIY}
          </div>
        </div>

        <div className="relative ml-auto w-full lg:w-[83%] bg-[#FFFDF3] px-6 sm:px-10 lg:px-14 py-12">
          <h2 className="text-[#30573C] text-[clamp(36px,4.2vw,60px)] leading-none font-normal">
            our mission:
          </h2>
          <p className="mt-5 text-[#30573C] text-[clamp(19px,1.8vw,26px)] leading-[1.6] max-w-[62ch]">
            <span className="hg-mark">life.</span> specifically biodiversity. every year our native
            pollinator populations dwindle. the average native pollinator can only fly about 500
            meters. as <span className="hg-mark">native plant life</span> struggles against climate
            change, pollinators rarely find the <span className="hg-mark">flora</span> they evolved
            to survive on. native gardens are <span className="hg-mark">essential</span>: they
            rebuild habitats, <span className="hg-mark">restore ecosystems</span>, build
            biodiversity, and anchor the ground all life depends on. join us in protecting{' '}
            <span className="hg-mark">our</span> future.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1000px]">
            {[
              ['1', 'map your yard', 'draw it in feet, then paint where the sun shines and where the soil stays wet.'],
              ['2', 'place native plants', 'we suggest Massachusetts natives that fit each spot and leave room to grow.'],
              ['3', 'watch it grow', 'check in by typing, talking, or a photo. we warn you before frost or a heat wave.'],
            ].map(([n, h, b]) => (
              <div
                key={n}
                className="rounded-[32px] border-[2.5px] border-[#30573C] p-5 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#30573C] text-white font-bold grid place-items-center">
                    {n}
                  </span>
                  <span className="text-[22px] font-medium text-[#30573C]">{h}</span>
                </div>
                <p className="mt-2 text-[16px] leading-snug text-[#3F5747]">{b}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={onStartPlanning}
              className="inline-flex items-center gap-2 h-14 px-7 rounded-full bg-[#30573C] text-white text-[19px] font-bold hover:bg-[#3E6E4D] transition-colors cursor-pointer"
            >
              plan a new garden <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenCatalog}
              className="inline-flex items-center gap-2 h-14 px-7 rounded-full border-[2.5px] border-[#30573C] text-[#30573C] text-[19px] font-bold hover:bg-[#F3F1DC] transition-colors cursor-pointer"
            >
              browse native plants
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
