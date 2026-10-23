import express from 'express';
import multer from 'multer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractCallsigns } from './callsign.js';
import { applyFilter, FILTERS } from './filters.js';
import { transcribe } from './transcribe.js';

const PORT = process.env.PORT || 3000;
const APP_TOKEN = process.env.APP_TOKEN;

const app = express();
const upload = multer({ dest: tmpdir(), limits: { fileSize: 25 * 1024 * 1024 } });

function auth(req, res, next) {
  if (APP_TOKEN && req.get('authorization') !== `Bearer ${APP_TOKEN}`) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true, filters: Object.keys(FILTERS) }));

// Recebe um trecho de áudio, aplica o filtro de ruído e devolve a transcrição.
app.post('/transcribe', auth, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie o arquivo no campo "audio"' });
  const filter = req.body.filter || 'hf';
  const work = await mkdtemp(join(tmpdir(), 'radiolog-'));
  const started = Date.now();
  try {
    const flac = await applyFilter(req.file.path, join(work, 'audio.flac'), filter);
    const text = await transcribe(flac, req.body.language || 'pt');
    res.json({ text, callsigns: extractCallsigns(text), filter, ms: Date.now() - started });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  } finally {
    await rm(work, { recursive: true, force: true });
    await rm(req.file.path, { force: true });
  }
});

app.listen(PORT, () => console.log(`RadioLog server em http://localhost:${PORT}`));
