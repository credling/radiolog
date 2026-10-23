import { openDatabaseSync } from 'expo-sqlite';

export const db = openDatabaseSync('radiolog.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uri TEXT NOT NULL,
    started_at TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    freq TEXT,
    mode TEXT,
    peak_db REAL,
    status TEXT NOT NULL,          -- pending | uploading | done | error | silence
    attempts INTEGER NOT NULL DEFAULT 0,
    text TEXT,
    callsigns TEXT,                -- JSON array
    error TEXT
  );
  CREATE TABLE IF NOT EXISTS qsos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    callsign TEXT NOT NULL,
    utc TEXT NOT NULL,
    freq TEXT,
    mode TEXT,
    rst_sent TEXT,
    rst_rcvd TEXT,
    name TEXT,
    qth TEXT,
    notes TEXT,
    chunk_id INTEGER
  );
`);

// Aviso simples para as telas recarregarem quando os dados mudam.
type Listener = () => void;
const listeners = new Set<Listener>();
export function onDbChange(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notifyDbChange() {
  listeners.forEach((fn) => fn());
}

export type ChunkStatus = 'pending' | 'uploading' | 'done' | 'error' | 'silence';

export type Chunk = {
  id: number;
  uri: string;
  started_at: string;
  duration_ms: number;
  freq: string | null;
  mode: string | null;
  peak_db: number | null;
  status: ChunkStatus;
  attempts: number;
  text: string | null;
  callsigns: string | null;
  error: string | null;
};

export type Qso = {
  id: number;
  callsign: string;
  utc: string;
  freq: string | null;
  mode: string | null;
  rst_sent: string | null;
  rst_rcvd: string | null;
  name: string | null;
  qth: string | null;
  notes: string | null;
  chunk_id: number | null;
};
