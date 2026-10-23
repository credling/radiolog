import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Chunk } from './src/db';
import { LogbookScreen, type QsoDraft } from './src/screens/LogbookScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TranscriptsScreen } from './src/screens/TranscriptsScreen';
import { processQueue } from './src/uploader';
import { C, s } from './src/ui';

const TABS = [
  { key: 'rec', label: 'Gravar', icon: '●' },
  { key: 'txt', label: 'Transcrições', icon: '≡' },
  { key: 'log', label: 'Logbook', icon: '✎' },
  { key: 'cfg', label: 'Ajustes', icon: '⚙' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<Tab>('rec');
  const [draft, setDraft] = useState<QsoDraft | null>(null);

  // Tenta reenviar a fila periodicamente (ex.: quando a internet volta).
  useEffect(() => {
    processQueue();
    const id = setInterval(processQueue, 15000);
    return () => clearInterval(id);
  }, []);

  // Tocar num indicativo da transcrição abre um QSO já preenchido.
  const fromCallsign = useCallback((callsign: string, c: Chunk) => {
    setDraft({
      callsign, utc: c.started_at, freq: c.freq, mode: c.mode,
      rst_sent: '59', rst_rcvd: '59', notes: c.text?.slice(0, 200) ?? null, chunk_id: c.id,
    });
    setTab('log');
  }, []);
  const clearDraft = useCallback(() => setDraft(null), []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={s.h1}>📻 RadioLog</Text>
        </View>
        <View style={{ flex: 1 }}>
          {/* Gravar fica sempre montado para não parar a gravação ao trocar de aba. */}
          <View style={{ flex: 1, display: tab === 'rec' ? 'flex' : 'none' }}><RecordScreen /></View>
          {tab === 'txt' && <TranscriptsScreen onCallsign={fromCallsign} />}
          {tab === 'log' && <LogbookScreen draft={draft} onDraftHandled={clearDraft} />}
          {tab === 'cfg' && <SettingsScreen />}
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: 18, color: tab === t.key ? C.accent : C.dim }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, color: tab === t.key ? C.accent : C.dim }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
