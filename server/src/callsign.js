// Extrai indicativos de radioamador de um texto transcrito.
// Entende indicativos escritos (PY2ABC), soletrados no alfabeto fonético
// (Papa Yankee Dois Alfa Bravo Charlie) e letra por letra (P Y 2 A B C).

const PHONETIC = {
  alfa: 'A', alpha: 'A', bravo: 'B', charlie: 'C', charly: 'C', delta: 'D',
  echo: 'E', eco: 'E', foxtrot: 'F', foxtrote: 'F', fox: 'F', golf: 'G', golfe: 'G',
  hotel: 'H', india: 'I', juliet: 'J', juliett: 'J', julieta: 'J', kilo: 'K', quilo: 'K',
  lima: 'L', mike: 'M', maike: 'M', november: 'N', oscar: 'O', papa: 'P',
  quebec: 'Q', romeo: 'R', sierra: 'S', tango: 'T', uniform: 'U', victor: 'V',
  whiskey: 'W', whisky: 'W', xray: 'X', yankee: 'Y', ianque: 'Y', zulu: 'Z',
};

const DIGITS = {
  zero: '0', um: '1', uma: '1', one: '1', dois: '2', duas: '2', two: '2',
  tres: '3', three: '3', quatro: '4', four: '4', cinco: '5', five: '5',
  seis: '6', meia: '6', six: '6', sete: '7', seven: '7', oito: '8', eight: '8',
  nove: '9', nine: '9', niner: '9',
};

// Prefixo de 1 a 3 caracteres (com ao menos uma letra), algarismo de área,
// sufixo de 1 a 4 letras. Ex.: PY2ABC, PU1AB, 2E0XYZ, K1A.
const CALLSIGN_RE = /^(?=[A-Z0-9]{0,2}[A-Z])[A-Z0-9]{1,3}[0-9][A-Z]{1,4}$/;

export function isCallsign(s) {
  return s.length >= 3 && s.length <= 8 && CALLSIGN_RE.test(s);
}

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/x-ray/g, 'xray');
}

function tokenToChars(tok) {
  if (PHONETIC[tok]) return PHONETIC[tok];
  if (DIGITS[tok]) return DIGITS[tok];
  // "a", "e" e "o" soltos são artigos/conjunções em português, não letras.
  if (/^[b-df-np-z]$/.test(tok)) return tok.toUpperCase();
  if (/^[0-9]$/.test(tok)) return tok;
  return null;
}

// Dentro de uma sequência longa de caracteres, pega o maior indicativo válido
// a partir de cada posição, da esquerda para a direita.
function scanRun(chars, found) {
  let i = 0;
  while (i < chars.length) {
    let best = 0;
    // Soletrados exigem 4+ caracteres para evitar falsos positivos.
    for (let len = Math.min(8, chars.length - i); len >= 4; len--) {
      if (isCallsign(chars.slice(i, i + len))) { best = len; break; }
    }
    if (best) { found.add(chars.slice(i, i + best)); i += best; } else i++;
  }
}

export function extractCallsigns(text) {
  const found = new Set();

  // 1) Indicativos já escritos por extenso: PY2ABC, PU1XYZ/P etc.
  for (const m of text.toUpperCase().matchAll(/\b[A-Z0-9]{4,8}(?:\/[A-Z0-9]{1,4})?\b/g)) {
    const base = m[0].split('/')[0];
    if (isCallsign(base)) found.add(m[0]);
  }

  // 2) Soletrados (fonético, letras soltas ou algarismos falados).
  const tokens = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  let run = '';
  for (const tok of tokens) {
    const c = tokenToChars(tok);
    if (c) run += c;
    else { if (run) scanRun(run, found); run = ''; }
  }
  if (run) scanRun(run, found);

  return [...found];
}
