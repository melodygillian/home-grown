import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { MAZone } from '../types/garden';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onSubmit: (email: string, password: string, mode: 'login' | 'signup') => string | null;
  onQuickDemo: () => void;
}

export function AuthModal({
  mode,
  onClose,
  onSwitchMode,
  onSubmit,
  onQuickDemo,
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = onSubmit(email.trim().toLowerCase(), password, mode);
    if (err) setError(err);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0D1B14]/55 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
    >
      <div className="bg-white border border-[#E6E2CC] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-heading" className="font-display text-xl font-semibold text-[#22392A]">
              {mode === 'login' ? 'Log In to Your Gardens' : 'Create Gardener Account'}
            </h2>
            <p className="text-xs text-[#4E6656] mt-1">
              Gardens, grid layers, and seasonal care logs save directly to your browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[#4E6656] hover:text-[#22392A] rounded-lg hover:bg-[#F8F5E6] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="auth-email-input" className="block text-xs font-semibold text-[#22392A]">
              Email Address
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gardener@mass.org"
              className="w-full px-3 py-2 text-sm bg-[#FFFDF3] border border-[#D8D4B8] rounded-lg focus:outline-none focus:border-[#30573C]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-pw-input" className="block text-xs font-semibold text-[#22392A]">
              Password
            </label>
            <input
              id="auth-pw-input"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full px-3 py-2 text-sm bg-[#FFFDF3] border border-[#D8D4B8] rounded-lg focus:outline-none focus:border-[#30573C]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full transition-colors cursor-pointer"
          >
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#F6F2DF] space-y-3">
          <button
            type="button"
            onClick={onQuickDemo}
            className="w-full py-2 px-4 text-xs font-semibold text-[#30573C] bg-[#F7F5E5] hover:bg-[#E4EFE8] border border-[#CFE0D5] rounded-full transition-colors cursor-pointer"
          >
            Continue with Sample Massachusetts Garden
          </button>

          <p className="text-xs text-center text-[#4E6656]">
            {mode === 'login' ? 'New to home grown? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                onSwitchMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="font-semibold text-[#30573C] hover:underline cursor-pointer"
            >
              {mode === 'login' ? 'Create an account' : 'Log in instead'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (
    name: string,
    width: number,
    height: number,
    zone: MAZone,
    zip: string,
    place: { city: string; state: string } | null
  ) => void;
}

/** Rough USDA zone for a Massachusetts ZIP code (by its first 3 digits). */
export function zoneForZip(zip: string): MAZone {
  const p = Number(zip.slice(0, 3));
  if (p === 12) return '5b'; // Berkshires
  if (p >= 10 && p <= 16) return '6a'; // Pioneer Valley & central MA
  if (p >= 25 && p <= 27) return '7a'; // Cape, islands, South Coast
  return '6b'; // Greater Boston, MetroWest, North & South Shore
}

/**
 * "create a new garden:" pop-up from the team Figma:
 * garden name, dimensions (width x / length y in feet) and ZIP code, then "build garden".
 * Asking for the ZIP here means weather alerts are ready as soon as the garden is planted.
 */
export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [zip, setZip] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setErr('Please type a 5-digit ZIP code, like 02481.');
      return;
    }
    setErr('');
    setBusy(true);
    let place: { city: string; state: string } | null = null;
    try {
      const r = await fetch(`/api/weather?zip=${zip}`, { signal: AbortSignal.timeout(12000) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 || r.status === 400) {
        setErr(d.error || 'We couldn’t find that ZIP code. Please check it.');
        setBusy(false);
        return;
      }
      if (d.place) place = { city: d.place.city, state: d.place.state };
    } catch {
      // Weather lookup is down: still build the garden, the forecast can load later.
    }
    const cleanName = name.trim() || 'my native garden';
    const w = Math.max(4, Math.min(20, Number(width) || 10));
    const h = Math.max(4, Math.min(16, Number(height) || 8));
    onCreate(cleanName, w, h, zoneForZip(zip), zip, place);
  };

  const field =
    'w-full h-14 px-5 text-[20px] text-[#30573C] placeholder:text-[#73A384]/70 bg-[#FFFDF3] border-[2.5px] border-[#30573C] rounded-full focus:outline-none focus:ring-4 focus:ring-[#30573C]/15';
  const label = 'block text-[26px] leading-tight text-[#30573C] mb-2';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0D1B14]/45 backdrop-blur-[3px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-garden-heading"
    >
      <div className="hg-rise bg-[#FFFDF3] border-[3px] border-[#30573C] rounded-[40px] w-full max-w-[900px] max-h-[calc(100vh-32px)] overflow-y-auto px-8 sm:px-10 py-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="new-garden-heading" className="text-[clamp(28px,3vw,38px)] font-medium text-[#30573C] leading-tight">
            create a new garden:
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[#30573C] hover:bg-[#F3F1DC] rounded-full cursor-pointer"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label htmlFor="garden-name-input" className={label}>
              garden name:
            </label>
            <input
              id="garden-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: first draft of the yard"
              className={field}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
            <div className="sm:col-span-2">
              <span className={label}>dimensions:</span>
              <div className="flex items-center gap-3">
                <input
                  aria-label="Width in feet, 4 to 20"
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={20}
                  required
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="width x (ft)"
                  className={field}
                />
                <span className="text-[26px] text-[#30573C]" aria-hidden="true">×</span>
                <input
                  aria-label="Length in feet, 4 to 16"
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={16}
                  required
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="length y (ft)"
                  className={field}
                />
              </div>
            </div>
            <div>
              <label htmlFor="garden-zip-input" className={label}>
                zip code:
              </label>
              <input
                id="garden-zip-input"
                inputMode="numeric"
                maxLength={5}
                required
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                placeholder="ex: 02481"
                className={`${field} font-mono tracking-widest`}
              />
            </div>
          </div>

          <p className="text-[16px] text-[#3F5747]">
            each square on your grid is 1 ft × 1 ft. width up to 20 ft, length up to 16 ft. your
            ZIP code gives you local weather alerts later.
          </p>
          {err && (
            <p role="alert" className="text-[16px] font-medium text-[#B4233C]">
              {err}
            </p>
          )}

          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={busy}
              className="h-16 px-12 text-[24px] font-bold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full transition-colors cursor-pointer disabled:opacity-60"
            >
              {busy ? 'finding your area…' : 'build garden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
