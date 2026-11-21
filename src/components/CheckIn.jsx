import { useRef, useState } from 'react';
import { useSpeech } from '../lib/useSpeech.js';
import { shrinkImage } from '../lib/analyze.js';

// Typed / spoken / photo check-in for plants without a sensor stake.
export default function CheckIn({ onSubmit, busy }) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const speech = useSpeech(setText);

  async function pickPhoto(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setPhoto(await shrinkImage(f));
    } catch (x) {
      setErr(x.message);
    }
  }

  async function save() {
    if (speech.listening) speech.stop();
    if (!text.trim() && !photo) {
      setErr('Type or say something about the plant first, or add a photo.');
      return;
    }
    setErr('');
    const ok = await onSubmit({ note: text.trim(), image: photo ? { mimeType: photo.mimeType, data: photo.data } : null });
    if (ok) {
      setText('');
      setPhoto(null);
    }
  }

  return (
    <div className="checkin">
      <label htmlFor="note" className="muted">
        No sensor here. Type, say, or snap a photo of what you see: height, leaf color, flowers, anything odd.
      </label>
      <textarea
        id="note"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. About 16 inches tall, leaves are green but a couple at the bottom are yellow. I see flower buds."
      />
      {photo && (
        <div className="photo-prev">
          <img src={photo.previewUrl} alt="Your plant photo" />
          <button type="button" className="link" onClick={() => setPhoto(null)}>Remove photo</button>
        </div>
      )}
      <div className="row-wrap">
        {speech.supported ? (
          <button
            type="button"
            className={'btn ' + (speech.listening ? 'btn-rec' : 'btn-soft')}
            aria-pressed={speech.listening}
            onClick={() => (speech.listening ? speech.stop() : speech.start(text))}
          >
            <MicIcon /> {speech.listening ? 'Stop recording' : 'Speak'}
          </button>
        ) : (
          <span className="muted small">Voice works in Chrome, Edge or Safari.</span>
        )}
        <button type="button" className="btn btn-soft" onClick={() => fileRef.current?.click()}>
          <CamIcon /> Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
        <button type="button" className="btn btn-primary grow" onClick={save} disabled={busy}>
          {busy ? 'Reading your update…' : 'Save update'}
        </button>
      </div>
      {speech.listening && <p className="rec-hint">Listening… speak naturally, then tap “Stop recording”.</p>}
      {(err || speech.error) && <p className="error">{err || speech.error}</p>}
    </div>
  );
}

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
  </svg>
);
const CamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  </svg>
);
