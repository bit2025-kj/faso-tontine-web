import { Mic, Square } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Press to start recording, press again to stop and hand off the recorded
 * clip. Uses the browser's native MediaRecorder — no server-side transcoding,
 * whatever mimeType the browser picks (webm/opus in Chrome/Firefox, mp4/aac
 * in Safari) is uploaded as-is; the backend's audio size limit (5MB) is the
 * only constraint that matters here.
 */
export default function VoiceRecorderButton({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
        onRecorded(new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType }));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      // Mic permission denied or unavailable — nothing to record, stay idle.
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  return (
    <button
      type="button"
      className={`chat-voice-btn${recording ? ' chat-voice-btn-recording' : ''}`}
      onClick={recording ? stop : start}
      aria-label={recording ? 'Arrêter l’enregistrement' : 'Message vocal'}
    >
      {recording ? <Square size={17} fill="currentColor" /> : <Mic size={19} />}
    </button>
  );
}
