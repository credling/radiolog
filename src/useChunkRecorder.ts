import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingInput,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { db, notifyDbChange } from './db';
import { getSettings } from './settings';
import { processQueue } from './uploader';

// Mono e taxa moderada: voz de rádio não precisa de mais que isso,
// e arquivos menores sobem mais rápido.
const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  sampleRate: 22050,
  bitRate: 48000,
  isMeteringEnabled: true,
  directory: 'document',
};

// Grava em trechos de N segundos. Cada trecho é salvo, entra na fila de envio
// e a gravação do próximo começa logo em seguida.
export function useChunkRecorder() {
  const recorder = useAudioRecorder(OPTIONS);
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(-160);
  const [elapsed, setElapsed] = useState(0);
  const [inputs, setInputs] = useState<RecordingInput[]>([]);
  const [inputUid, setInputUid] = useState<string | null>(null);

  const runningRef = useRef(false);
  const peakRef = useRef(-160);
  const startedRef = useRef<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<string | null>(null);

  const startChunk = useCallback(async () => {
    await recorder.prepareToRecordAsync({ fileName: `trecho-${Date.now()}` });
    if (inputRef.current) {
      try { recorder.setInput(inputRef.current); } catch {}
    }
    peakRef.current = -160;
    startedRef.current = new Date();
    recorder.record();
  }, [recorder]);

  const finishChunk = useCallback(async () => {
    const started = startedRef.current;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;
    const s = getSettings();
    const silent = peakRef.current < s.silenceDb;
    if (silent) {
      // Não guarda nem envia trechos só com chiado de fundo.
      try { new File(uri).delete(); } catch {}
    }
    db.runSync(
      `INSERT INTO chunks (uri, started_at, duration_ms, freq, mode, peak_db, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uri, started.toISOString(), Date.now() - started.getTime(),
      s.freq, s.mode, peakRef.current, silent ? 'silence' : 'pending',
    );
    notifyDbChange();
    if (!silent) processQueue();
  }, [recorder]);

  const loop = useCallback(async () => {
    if (!runningRef.current) return;
    await finishChunk();
    if (!runningRef.current) return;
    await startChunk();
    timerRef.current = setTimeout(loop, getSettings().chunkSeconds * 1000);
  }, [finishChunk, startChunk]);

  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('Permissão de microfone negada');
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      allowsBackgroundRecording: true,
    });
    runningRef.current = true;
    setRunning(true);
    await startChunk();
    setInputs(recorder.getAvailableInputs());
    timerRef.current = setTimeout(loop, getSettings().chunkSeconds * 1000);
  }, [recorder, startChunk, loop]);

  const stop = useCallback(async () => {
    runningRef.current = false;
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorder.isRecording) await finishChunk();
    await setAudioModeAsync({ allowsRecording: false });
  }, [recorder, finishChunk]);

  // Atualiza o medidor de nível e guarda o pico do trecho atual.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const st = recorder.getStatus();
      const m = st.metering ?? -160;
      setLevel(m);
      if (m > peakRef.current) peakRef.current = m;
      setElapsed(Math.floor((Date.now() - startedRef.current.getTime()) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [running, recorder]);

  const chooseInput = useCallback((uid: string) => {
    inputRef.current = uid;
    setInputUid(uid);
    try { recorder.setInput(uid); } catch {}
  }, [recorder]);

  return { running, level, elapsed, inputs, inputUid, start, stop, chooseInput };
}
