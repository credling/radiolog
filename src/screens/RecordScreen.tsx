import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { db, onDbChange } from '../db';
import { bandFor, utcClock } from '../ham';
import { saveSettings, useSettings } from '../settings';
import { useChunkRecorder } from '../useChunkRecorder';
import { Button, C, Card, Chips, Field, Label, s } from '../ui';

const MODES = ['SSB', 'FM', 'AM', 'CW', 'DIG'] as const;

function useQueueCounts() {
  const read = () =>
    db.getFirstSync<{ pending: number; done: number }>(
      `SELECT SUM(status IN ('pending','uploading','error')) AS pending, SUM(status='done') AS done FROM chunks`,
    ) ?? { pending: 0, done: 0 };
  const [c, setC] = useState(read);
  useEffect(() => onDbChange(() => setC(read())), []);
  return c;
}

export function RecordScreen() {
  const settings = useSettings();
  const rec = useChunkRecorder();
  const queue = useQueueCounts();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggle = async () => {
    try {
      if (rec.running) await rec.stop();
      else await rec.start();
    } catch (e: any) {
      Alert.alert('Erro na gravação', e?.message ?? String(e));
    }
  };

  // Medidor de nível: -60 dB = vazio, 0 dB = cheio.
  const pct = Math.max(0, Math.min(1, (rec.level + 60) / 60));
  const aboveSilence = rec.level >= settings.silenceDb;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Card style={{ alignItems: 'center' }}>
        <Label>Hora UTC</Label>
        <Text style={[s.mono, { fontSize: 44, fontWeight: '700' }]}>{utcClock(now)}</Text>
        <Text style={s.dim}>Local {now.toLocaleTimeString('pt-BR')}</Text>
      </Card>

      <Card>
        <View style={s.row}>
          <Field
            label={`Frequência (MHz) ${bandFor(settings.freq) ?? ''}`}
            value={settings.freq}
            keyboardType="decimal-pad"
            onChangeText={(freq) => saveSettings({ freq })}
          />
        </View>
        <Label>Modo</Label>
        <Chips options={MODES} value={settings.mode as any} onChange={(mode) => saveSettings({ mode })} />
      </Card>

      {rec.inputs.length > 1 && (
        <Card>
          <Label>Entrada de áudio (escolha o cabo/placa USB)</Label>
          <Chips
            options={rec.inputs.map((i) => i.name)}
            value={rec.inputs.find((i) => i.uid === rec.inputUid)?.name ?? ''}
            onChange={(name) => {
              const i = rec.inputs.find((x) => x.name === name);
              if (i) rec.chooseInput(i.uid);
            }}
          />
        </Card>
      )}

      <Card>
        <Label>Nível do áudio</Label>
        <View style={{ height: 14, backgroundColor: C.bg, borderRadius: 7, overflow: 'hidden' }}>
          <View
            style={{
              width: `${pct * 100}%`, height: '100%',
              backgroundColor: aboveSilence ? C.ok : C.dim,
            }}
          />
        </View>
        <Text style={[s.dim, { marginTop: 6 }]}>
          {rec.running
            ? `${rec.level.toFixed(0)} dB · trecho ${rec.elapsed}s de ${settings.chunkSeconds}s`
            : 'Parado'}
        </Text>
      </Card>

      <Button
        title={rec.running ? '■  Parar gravação' : '●  Gravar'}
        color={rec.running ? C.rec : C.accent}
        onPress={toggle}
      />

      <Text style={[s.dim, { textAlign: 'center' }]}>
        Na fila: {queue.pending ?? 0} · Transcritos: {queue.done ?? 0} · Filtro: {settings.filter}
      </Text>
    </ScrollView>
  );
}
