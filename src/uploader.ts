import * as Network from 'expo-network';
import { File } from 'expo-file-system';
import { db, notifyDbChange, type Chunk } from './db';
import { extractCallsigns } from './callsign';
import { getSettings, type Settings } from './settings';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
// Vocabulário que ajuda o modelo a acertar termos de radioamadorismo.
const PROMPT =
  'QSO de radioamador. QRZ, QTH, QSL, QRM, QRN, QSB, 73, 88, câmbio, na escuta, ' +
  'indicativo, Papa Yankee, Papa Uniform, Papa Papa, Alfa, Bravo, Charlie, Delta, ' +
  'Echo, Foxtrot, Golf, Hotel, India, Juliet, Kilo, Lima, Mike, November, Oscar, ' +
  'Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu, meia.';

const MAX_ATTEMPTS = 5;
let busy = false;

// Envia os trechos pendentes para o servidor, um por vez, na ordem em que foram
// gravados. Sem internet, eles ficam guardados e saem quando a conexão voltar.
export async function processQueue() {
  if (busy) return;
  busy = true;
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected || net.isInternetReachable === false) return;

    while (true) {
      const chunk = db.getFirstSync<Chunk>(
        `SELECT * FROM chunks WHERE status IN ('pending','error') AND attempts < ?
         ORDER BY id LIMIT 1`,
        MAX_ATTEMPTS,
      );
      if (!chunk) break;
      await sendChunk(chunk);
    }
  } finally {
    busy = false;
  }
}

async function sendChunk(chunk: Chunk) {
  const s = getSettings();
  db.runSync(`UPDATE chunks SET status='uploading', attempts=attempts+1 WHERE id=?`, chunk.id);
  notifyDbChange();
  try {
    const { text, callsigns } = s.backend === 'direto' ? await viaGroq(chunk, s) : await viaServer(chunk, s);
    db.runSync(
      `UPDATE chunks SET status='done', text=?, callsigns=?, error=NULL WHERE id=?`,
      text, JSON.stringify(callsigns), chunk.id,
    );
  } catch (e: any) {
    db.runSync(`UPDATE chunks SET status='error', error=? WHERE id=?`, String(e?.message ?? e), chunk.id);
  }
  notifyDbChange();
}

function audioPart(chunk: Chunk) {
  // React Native aceita { uri, name, type } como arquivo no FormData.
  return { uri: chunk.uri, name: `trecho-${chunk.id}.m4a`, type: 'audio/mp4' } as any;
}

// Modo direto: o celular envia o áudio para a Groq (Whisper), sem servidor próprio.
async function viaGroq(chunk: Chunk, s: Settings) {
  if (!s.groqKey) throw new Error('Coloque sua chave da Groq em Ajustes');
  const form = new FormData();
  form.append('file', audioPart(chunk));
  form.append('model', 'whisper-large-v3');
  form.append('language', 'pt');
  form.append('prompt', PROMPT);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.groqKey.trim()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  const text: string = (data.text ?? '').trim();
  return { text, callsigns: extractCallsigns(text) };
}

// Modo servidor: aplica os filtros de ruído (ffmpeg) antes de transcrever.
async function viaServer(chunk: Chunk, s: Settings) {
  const form = new FormData();
  form.append('audio', audioPart(chunk));
  form.append('filter', s.filter);
  form.append('language', 'pt');
  const res = await fetch(`${s.serverUrl.replace(/\/$/, '')}/transcribe`, {
    method: 'POST',
    headers: s.token ? { Authorization: `Bearer ${s.token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { text: (data.text ?? '') as string, callsigns: (data.callsigns ?? []) as string[] };
}

export function retryChunk(id: number) {
  db.runSync(`UPDATE chunks SET status='pending', attempts=0, error=NULL WHERE id=?`, id);
  notifyDbChange();
  processQueue();
}

export function deleteChunk(id: number) {
  const row = db.getFirstSync<Chunk>('SELECT * FROM chunks WHERE id=?', id);
  if (row) {
    try { new File(row.uri).delete(); } catch {}
  }
  db.runSync('DELETE FROM chunks WHERE id=?', id);
  notifyDbChange();
}
