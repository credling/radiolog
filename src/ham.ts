import type { Qso } from './db';

const BANDS: [string, number, number][] = [
  ['160m', 1.8, 2.0], ['80m', 3.5, 4.0], ['60m', 5.3, 5.45], ['40m', 7.0, 7.3],
  ['30m', 10.1, 10.15], ['20m', 14.0, 14.35], ['17m', 18.068, 18.168],
  ['15m', 21.0, 21.45], ['12m', 24.89, 24.99], ['10m', 28.0, 29.7],
  ['6m', 50, 54], ['2m', 144, 148], ['70cm', 420, 450],
];

export function bandFor(freqMHz: string | null): string | null {
  const f = parseFloat((freqMHz ?? '').replace(',', '.'));
  if (!isFinite(f)) return null;
  return BANDS.find(([, lo, hi]) => f >= lo && f <= hi)?.[0] ?? null;
}

export function utcClock(d = new Date()) {
  return d.toISOString().slice(11, 19);
}

export function utcStamp(iso: string) {
  return iso.slice(0, 16).replace('T', ' ') + 'Z';
}

function field(name: string, value: string | null | undefined) {
  if (!value) return '';
  return `<${name}:${value.length}>${value} `;
}

// Gera ADIF 3, aceito por LoTW, QRZ.com, eQSL, ClubLog etc.
export function toAdif(qsos: Qso[], myCall: string) {
  const header = `RadioLog export\n<ADIF_VER:5>3.1.4 <PROGRAMID:8>RadioLog <EOH>\n`;
  const body = qsos.map((q) => {
    const d = q.utc.replace(/[-:]/g, '');
    return (
      field('CALL', q.callsign) +
      field('QSO_DATE', d.slice(0, 8)) +
      field('TIME_ON', d.slice(9, 13)) +
      field('FREQ', q.freq?.replace(',', '.')) +
      field('BAND', bandFor(q.freq)) +
      field('MODE', q.mode) +
      field('RST_SENT', q.rst_sent) +
      field('RST_RCVD', q.rst_rcvd) +
      field('NAME', q.name) +
      field('QTH', q.qth) +
      field('COMMENT', q.notes) +
      field('STATION_CALLSIGN', myCall) +
      '<EOR>'
    );
  });
  return header + body.join('\n') + '\n';
}
