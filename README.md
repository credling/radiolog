# 📻 RadioLog

App para radioamadores (Android e iPhone): grava o áudio do rádio pelo cabo,
filtra o ruído, transcreve os QSOs em português, reconhece indicativos
(inclusive no alfabeto fonético) e mantém um logbook com exportação ADIF.

## Como funciona

```
Rádio ──cabo──► Celular (grava trechos de 30 s, descarta silêncio, guarda na fila)
                   │  envia quando há internet
                   ▼
               Servidor (ffmpeg: filtro de ruído → Whisper → indicativos)
                   │
                   ▼
               Texto + indicativos de volta no app → "+ PY2ABC" cria o QSO
```

Atraso típico: duração do trecho (30 s) + envio + transcrição (~2-5 s) — menos de 1 minuto.

## Estrutura

| Pasta | O quê |
|---|---|
| `App.tsx`, `src/` | App Expo / React Native |
| `src/useChunkRecorder.ts` | Gravação em trechos, medidor de nível, escolha da entrada (cabo/USB) |
| `src/uploader.ts` | Fila de envio com novas tentativas |
| `src/screens/` | Gravar, Transcrições, Logbook, Ajustes |
| `server/` | Servidor Node: filtros ffmpeg + transcrição + detecção de indicativos |

## Instalar no Android (grátis)

Baixe no celular: **https://github.com/credling/radiolog/releases/latest/download/RadioLog.apk**
e abra o arquivo (permita "instalar apps desconhecidos" quando o Android pedir).
Cada push na `main` gera um APK novo automaticamente (GitHub Actions).

Em **Ajustes**, escolha o modo **direto** e cole uma chave gratuita da Groq
(console.groq.com → API Keys). O modo **servidor** é opcional e adiciona os
filtros de ruído do ffmpeg.

## 1. Rodar o servidor (opcional)

Precisa de Node 22+ e ffmpeg. Crie uma chave em um serviço de transcrição —
recomendo a **Groq** (whisper-large-v3, rápida e barata) ou a **OpenAI**.

```bash
cd server
cp .env.example .env      # preencha TRANSCRIBE_API_KEY e APP_TOKEN
npm install
npm start                 # http://localhost:3000
npm test                  # testes do detector de indicativos
```

Para deixar online 24 h, o `Dockerfile` funciona em Render, Railway, Fly.io etc.

## 2. Rodar o app no celular

O app usa gravação em segundo plano, então precisa de um *development build*
(o Expo Go não basta). Sem Android Studio nem Xcode, usando a nuvem da Expo:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # gera um APK para instalar
npx expo start --dev-client
```

Em **Ajustes**, coloque o endereço do servidor (ex.: `http://192.168.0.10:3000`
na mesma rede Wi-Fi) e a senha `APP_TOKEN`.

## Ligação do rádio

Saída de fone/alto-falante do rádio → **adaptador USB-C de áudio com entrada de
microfone** (ou cabo P2 TRRS) → celular. Na aba Gravar aparece a lista de
entradas para escolher o cabo. Ajuste o volume do rádio para o medidor ficar
verde nas falas sem encostar no máximo, e o "limite de silêncio" um pouco
acima do nível com o squelch fechado.

## Publicação

- **Android**: `eas build --profile production --platform android` gera o
  `.aab` para a Play Store; `--profile preview` gera um APK para distribuir direto.
- **iPhone**: exige conta Apple Developer (US$ 99/ano), mas o EAS faz o build e
  o envio sem Mac: `eas build -p ios` e `eas submit -p ios`. Para testes, use o TestFlight.

## Próximos passos

- [ ] Gravação contínua sem a pequena pausa entre trechos (módulo nativo)
- [ ] Filtros em tempo real enquanto escuta
- [ ] Consulta de indicativos (QRZ.com / HamQTH)
- [ ] Grid locator por GPS, propagação, repetidoras
- [ ] Transcrição offline no aparelho (whisper.cpp)
- [ ] Decodificador de CW
