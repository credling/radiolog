import { readFile } from 'node:fs/promises';

// Qualquer serviço compatível com o endpoint /audio/transcriptions da OpenAI
// funciona aqui (OpenAI, Groq, servidor whisper local etc.).
const API_URL = process.env.TRANSCRIBE_API_URL || 'https://api.groq.com/openai/v1';
const API_KEY = process.env.TRANSCRIBE_API_KEY;
const MODEL = process.env.TRANSCRIBE_MODEL || 'whisper-large-v3';

// Vocabulário que ajuda o modelo a acertar termos de radioamadorismo.
const PROMPT =
  'QSO de radioamador. QRZ, QTH, QSL, QRM, QRN, QSB, 73, 88, câmbio, na escuta, ' +
  'indicativo, Papa Yankee, Papa Uniform, Papa Papa, Alfa, Bravo, Charlie, Delta, ' +
  'Echo, Foxtrot, Golf, Hotel, India, Juliet, Kilo, Lima, Mike, November, Oscar, ' +
  'Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu, meia.';

export async function transcribe(flacPath, language = 'pt') {
  if (!API_KEY) throw new Error('TRANSCRIBE_API_KEY não configurada no servidor');

  const form = new FormData();
  form.append('file', new Blob([await readFile(flacPath)], { type: 'audio/flac' }), 'audio.flac');
  form.append('model', MODEL);
  form.append('language', language);
  form.append('prompt', PROMPT);
  form.append('response_format', 'json');
  form.append('temperature', '0');

  const res = await fetch(`${API_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcrição falhou (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return (data.text || '').trim();
}
