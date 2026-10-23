import { spawn } from 'node:child_process';

// Cadeias de filtros do ffmpeg aplicadas antes da transcrição.
// Todas terminam em mono 16 kHz, que é o que os modelos de fala esperam.
export const FILTERS = {
  // Sem tratamento, só converte o formato.
  nenhum: [],
  // Voz em FM (VHF/UHF): corta graves/agudos e normaliza o volume.
  fm: ['highpass=f=250', 'lowpass=f=3400', 'dynaudnorm=f=150:g=15'],
  // SSB em HF: banda estreita, redução forte de chiado e AGC.
  hf: [
    'highpass=f=300',
    'lowpass=f=2800',
    'afftdn=nr=18:nf=-30:tn=1',
    'dynaudnorm=f=150:g=15:p=0.9',
  ],
  // Sinal muito fraco/ruidoso: redução de ruído em duas passadas.
  forte: [
    'highpass=f=300',
    'lowpass=f=2700',
    'afftdn=nr=24:nf=-25:tn=1',
    'anlmdn=s=7',
    'dynaudnorm=f=200:g=21:p=0.9',
  ],
};

export function applyFilter(inputPath, outputPath, name = 'hf') {
  const chain = FILTERS[name];
  if (!chain) throw new Error(`Filtro desconhecido: ${name}`);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath];
  if (chain.length) args.push('-af', chain.join(','));
  args.push('-ac', '1', '-ar', '16000', '-c:a', 'flac', outputPath);

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args);
    let stderr = '';
    ff.stderr.on('data', (d) => { stderr += d; });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`ffmpeg falhou (${code}): ${stderr.trim()}`));
    });
  });
}
