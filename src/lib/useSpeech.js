// Voice input using the browser's built-in speech recognition (Chrome, Edge, Safari).
// Free, no key needed. Firefox doesn't support it, so we show a friendly message there.
import { useEffect, useRef, useState } from 'react';

export function useSpeech(onText) {
  const Rec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!Rec;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const baseRef = useRef('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recRef.current?.abort(), []);

  function start(currentText) {
    if (!supported) return;
    setError('');
    const rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = currentText ? currentText.trim() + ' ' : '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onTextRef.current(baseRef.current + text.trim());
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Please allow microphone access in your browser.' : 'Voice input stopped. Try again.');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, error, start, stop };
}
