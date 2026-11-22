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
      <div className="bg-white border border-[#E3E8E4] rounded-xl w-full max-w-md p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-heading" className="font-display text-xl font-semibold text-[#14261C]">
              {mode === 'login' ? 'Log In to Your Gardens' : 'Create Gardener Account'}
            </h2>
            <p className="text-xs text-[#4A5D52] mt-1">
              Gardens, grid layers, and seasonal care logs save directly to your browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[#4A5D52] hover:text-[#14261C] rounded-lg hover:bg-[#F2F5F2] cursor-pointer"
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
            <label htmlFor="auth-email-input" className="block text-xs font-semibold text-[#14261C]">
              Email Address
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gardener@mass.org"
              className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-pw-input" className="block text-xs font-semibold text-[#14261C]">
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
              className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors cursor-pointer"
          >
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#EEF2EF] space-y-3">
          <button
            type="button"
            onClick={onQuickDemo}
            className="w-full py-2 px-4 text-xs font-semibold text-[#1B4332] bg-[#F2F7F4] hover:bg-[#E4EFE8] border border-[#CFE0D5] rounded-lg transition-colors cursor-pointer"
          >
            Continue with Sample Massachusetts Garden
          </button>

          <p className="text-xs text-center text-[#4A5D52]">
            {mode === 'login' ? 'New to BayState Bloom? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                onSwitchMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="font-semibold text-[#1B4332] hover:underline cursor-pointer"
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
  onCreate: (name: string, width: number, height: number, zone: MAZone) => void;
}

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(8);
  const [zone, setZone] = useState<MAZone>('6a');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Massachusetts Native Border';
    const w = Math.max(4, Math.min(20, Number(width) || 10));
    const h = Math.max(4, Math.min(16, Number(height) || 8));
    onCreate(cleanName, w, h, zone);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0D1B14]/55 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-garden-heading"
    >
      <div className="bg-white border border-[#E3E8E4] rounded-xl w-full max-w-md p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="new-garden-heading" className="font-display text-xl font-semibold text-[#14261C]">
              Create a New Native Garden
            </h2>
            <p className="text-xs text-[#4A5D52] mt-1">
              Each grid square represents 1 ft × 1 ft of Massachusetts backyard space.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[#4A5D52] hover:text-[#14261C] rounded-lg hover:bg-[#F2F5F2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="garden-name-input" className="block text-xs font-semibold text-[#14261C]">
              Garden Name
            </label>
            <input
              id="garden-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sunny Pollinator Border"
              className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="garden-x-input" className="block text-xs font-semibold text-[#14261C]">
                Width X (4–20 ft)
              </label>
              <input
                id="garden-x-input"
                type="number"
                min={4}
                max={20}
                required
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="garden-y-input" className="block text-xs font-semibold text-[#14261C]">
                Length Y (4–16 ft)
              </label>
              <input
                id="garden-y-input"
                type="number"
                min={4}
                max={16}
                required
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="garden-zone-select" className="block text-xs font-semibold text-[#14261C]">
              Massachusetts Hardiness Region
            </label>
            <select
              id="garden-zone-select"
              value={zone}
              onChange={(e) => setZone(e.target.value as MAZone)}
              className="w-full px-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
            >
              <option value="5b">Zone 5b — Berkshires &amp; Northern Hilltowns</option>
              <option value="6a">Zone 6a — Central MA &amp; Pioneer Valley</option>
              <option value="6b">Zone 6b — Greater Boston, MetroWest &amp; North Shore</option>
              <option value="7a">Zone 7a — Cape Cod, South Coast &amp; Islands</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-[#4A5D52] bg-[#F5F8F5] px-3 py-2 rounded-lg font-mono tabular-nums">
            <span>Total Bed Footprint</span>
            <span className="font-semibold text-[#14261C]">{width * height} sq ft</span>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg transition-colors cursor-pointer"
          >
            Build Garden Grid
          </button>
        </form>
      </div>
    </div>
  );
}
