import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { saveSettings, useSettings, type Settings } from '../settings';
import { Button, C, Card, Chips, Field, Label, s } from '../ui';

const FILTERS = ['nenhum', 'fm', 'hf', 'forte'] as const;
const FILTER_HELP: Record<Settings['filter'], string> = {
  nenhum: 'Envia o áudio como gravado.',
  fm: 'VHF/UHF em FM: corta graves e agudos e iguala o volume.',
  hf: 'SSB em HF: banda de voz estreita e redução de chiado.',
  forte: 'Sinal fraco/ruidoso: redução de ruído agressiva.',
};

export function SettingsScreen() {
  const st = useSettings();
  const [test, setTest] = useState('');

  const testServer = async () => {
    setTest('Testando…');
    try {
      const res = await fetch(`${st.serverUrl.replace(/\/$/, '')}/health`);
      setTest(res.ok ? '✓ Servidor respondeu' : `Erro HTTP ${res.status}`);
    } catch (e: any) {
      setTest(`Sem conexão: ${e?.message ?? e}`);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Card>
        <Field label="Meu indicativo" value={st.myCall} autoCapitalize="characters"
          onChangeText={(myCall) => saveSettings({ myCall: myCall.toUpperCase() })} />
      </Card>

      <Card>
        <Field label="Endereço do servidor" value={st.serverUrl} autoCapitalize="none" keyboardType="url"
          onChangeText={(serverUrl) => saveSettings({ serverUrl })} />
        <Field label="Senha do servidor (APP_TOKEN)" value={st.token} autoCapitalize="none" secureTextEntry
          onChangeText={(token) => saveSettings({ token })} />
        <Button title="Testar conexão" outline onPress={testServer} />
        {test ? <Text style={[s.dim, { marginTop: 8 }]}>{test}</Text> : null}
      </Card>

      <Card>
        <Label>Filtro de ruído</Label>
        <Chips options={FILTERS} value={st.filter} onChange={(filter) => saveSettings({ filter })} />
        <Text style={[s.dim, { marginTop: 8 }]}>{FILTER_HELP[st.filter]}</Text>
      </Card>

      <Card>
        <Field label="Duração de cada trecho (segundos)" value={String(st.chunkSeconds)} keyboardType="number-pad"
          onChangeText={(v) => saveSettings({ chunkSeconds: Math.max(10, Math.min(60, parseInt(v) || 30)) })} />
        <Text style={s.dim}>
          Menor = texto chega mais rápido. Com 30 s, a transcrição aparece em até ~1 minuto.
        </Text>
        <Field label="Limite de silêncio (dB)" value={String(st.silenceDb)} keyboardType="numbers-and-punctuation"
          onChangeText={(v) => saveSettings({ silenceDb: parseInt(v) || -45 })} />
        <Text style={s.dim}>
          Trechos cujo pico fica abaixo desse nível são descartados sem enviar. Veja o medidor na
          aba Gravar com o rádio em squelch fechado e ajuste um pouco acima.
        </Text>
      </Card>

      <Text style={[s.dim, { textAlign: 'center', color: C.dim }]}>RadioLog v0.1 · 73!</Text>
    </ScrollView>
  );
}
