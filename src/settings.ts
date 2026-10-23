import { useEffect, useState } from 'react';
import { db, notifyDbChange, onDbChange } from './db';

export type Settings = {
  backend: 'direto' | 'servidor';
  groqKey: string;     // modo direto: chave gratuita da Groq
  serverUrl: string;
  token: string;
  filter: 'nenhum' | 'fm' | 'hf' | 'forte';
  chunkSeconds: number;
  silenceDb: number;   // trechos com pico abaixo disso não são enviados
  freq: string;        // MHz, ex.: 7.100
  mode: string;
  myCall: string;
};

export const DEFAULTS: Settings = {
  backend: 'direto',
  groqKey: '',
  serverUrl: 'http://192.168.0.10:3000',
  token: '',
  filter: 'hf',
  chunkSeconds: 30,
  silenceDb: -45,
  freq: '7.100',
  mode: 'SSB',
  myCall: '',
};

export function getSettings(): Settings {
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const s: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) s[r.key] = JSON.parse(r.value);
  return s as Settings;
}

export function saveSettings(patch: Partial<Settings>) {
  for (const [k, v] of Object.entries(patch)) {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', k, JSON.stringify(v));
  }
  notifyDbChange();
}

export function useSettings(): Settings {
  const [s, setS] = useState(getSettings);
  useEffect(() => onDbChange(() => setS(getSettings())), []);
  return s;
}
