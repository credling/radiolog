import * as Network from 'expo-network';
import { File } from 'expo-file-system';
import { db, notifyDbChange, type Chunk } from './db';
import { getSettings } from './settings';

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
    const form = new FormData();
    // React Native aceita { uri, name, type } como arquivo no FormData.
    form.append('audio', { uri: chunk.uri, name: `trecho-${chunk.id}.m4a`, type: 'audio/mp4' } as any);
    form.append('filter', s.filter);
    form.append('language', 'pt');

    const res = await fetch(`${s.serverUrl.replace(/\/$/, '')}/transcribe`, {
      method: 'POST',
      headers: s.token ? { Authorization: `Bearer ${s.token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    db.runSync(
      `UPDATE chunks SET status='done', text=?, callsigns=?, error=NULL WHERE id=?`,
      data.text ?? '', JSON.stringify(data.callsigns ?? []), chunk.id,
    );
  } catch (e: any) {
    db.runSync(`UPDATE chunks SET status='error', error=? WHERE id=?`, String(e?.message ?? e), chunk.id);
  }
  notifyDbChange();
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
