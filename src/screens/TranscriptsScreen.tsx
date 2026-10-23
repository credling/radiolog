import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { db, onDbChange, type Chunk } from '../db';
import { utcStamp } from '../ham';
import { deleteChunk, processQueue, retryChunk } from '../uploader';
import { C, Card, s } from '../ui';

const STATUS: Record<Chunk['status'], { label: string; color: string }> = {
  pending: { label: 'Na fila', color: C.dim },
  uploading: { label: 'Enviando…', color: C.warn },
  done: { label: 'Transcrito', color: C.ok },
  error: { label: 'Erro', color: C.rec },
  silence: { label: 'Silêncio', color: C.dim },
};

function readChunks() {
  return db.getAllSync<Chunk>(`SELECT * FROM chunks WHERE status != 'silence' ORDER BY id DESC LIMIT 200`);
}

export function TranscriptsScreen({ onCallsign }: { onCallsign: (call: string, chunk: Chunk) => void }) {
  const [chunks, setChunks] = useState(readChunks);
  const [playing, setPlaying] = useState<number | null>(null);
  const player = useMemo(() => createAudioPlayer(null), []);

  useEffect(() => onDbChange(() => setChunks(readChunks())), []);
  useEffect(() => {
    processQueue();
    return () => player.remove();
  }, [player]);

  const play = (c: Chunk) => {
    if (playing === c.id) {
      player.pause();
      setPlaying(null);
      return;
    }
    player.replace({ uri: c.uri });
    player.play();
    setPlaying(c.id);
  };

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.pad}
      data={chunks}
      keyExtractor={(c) => String(c.id)}
      ListEmptyComponent={
        <Text style={[s.dim, { textAlign: 'center', marginTop: 40 }]}>
          Nenhuma gravação ainda. Comece pela aba Gravar.
        </Text>
      }
      renderItem={({ item: c }) => {
        const st = STATUS[c.status];
        const calls: string[] = c.callsigns ? JSON.parse(c.callsigns) : [];
        return (
          <Card>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={s.mono}>
                {utcStamp(c.started_at)} · {c.freq} {c.mode}
              </Text>
              <Text style={{ color: st.color, fontWeight: '700' }}>{st.label}</Text>
            </View>

            {c.text ? (
              <Text style={[s.text, { marginTop: 8 }]}>{c.text || '(sem fala reconhecida)'}</Text>
            ) : null}
            {c.status === 'error' && <Text style={[s.dim, { color: C.rec, marginTop: 6 }]}>{c.error}</Text>}

            {calls.length > 0 && (
              <View style={[s.chips, { marginTop: 10 }]}>
                {calls.map((call) => (
                  <Pressable key={call} style={[s.chip, s.chipOn]} onPress={() => onCallsign(call, c)}>
                    <Text style={[s.chipText, { color: C.bg }]}>+ {call}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={[s.row, { marginTop: 12, gap: 20 }]}>
              <Pressable onPress={() => play(c)}>
                <Text style={{ color: C.accent, fontWeight: '600' }}>
                  {playing === c.id ? '❚❚ Pausar' : '▶ Ouvir'}
                </Text>
              </Pressable>
              {(c.status === 'error' || c.status === 'done') && (
                <Pressable onPress={() => retryChunk(c.id)}>
                  <Text style={{ color: C.dim, fontWeight: '600' }}>↻ Transcrever de novo</Text>
                </Pressable>
              )}
              <Pressable onPress={() => deleteChunk(c.id)}>
                <Text style={{ color: C.dim, fontWeight: '600' }}>Apagar</Text>
              </Pressable>
            </View>
          </Card>
        );
      }}
    />
  );
}
