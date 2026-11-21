// Browser side of the check-in: shrink the photo, call /api/analyze, fall back if offline.
import { readNoteLocally } from './fallbackReader.js';

export async function analyzeCheckIn(payload) {
  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Analysis failed');
    return data;
  } catch (err) {
    return { source: 'fallback', reason: String(err.message || err), ...readNoteLocally(payload.note) };
  }
}

/** Resize a photo to max 1024px and return { mimeType, data (base64), previewUrl }. */
export function shrinkImage(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      resolve({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl });
    };
    img.onerror = () => reject(new Error('Could not read that photo.'));
    img.src = url;
  });
}
