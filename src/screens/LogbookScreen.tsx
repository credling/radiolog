import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { db, notifyDbChange, onDbChange, type Qso } from '../db';
import { bandFor, toAdif, utcStamp } from '../ham';
import { getSettings } from '../settings';
import { Button, C, Card, Field, s } from '../ui';

export type QsoDraft = Partial<Qso>;

function readQsos() {
  return db.getAllSync<Qso>('SELECT * FROM qsos ORDER BY utc DESC');
}

export function LogbookScreen({ draft, onDraftHandled }: {
  draft: QsoDraft | null; onDraftHandled: () => void;
}) {
  const [qsos, setQsos] = useState(readQsos);
  const [editing, setEditing] = useState<QsoDraft | null>(null);

  useEffect(() => onDbChange(() => setQsos(readQsos())), []);
  useEffect(() => {
    if (draft) { setEditing(draft); onDraftHandled(); }
  }, [draft, onDraftHandled]);

  const newQso = () => {
    const st = getSettings();
    setEditing({ utc: new Date().toISOString(), freq: st.freq, mode: st.mode, rst_sent: '59', rst_rcvd: '59' });
  };

  const exportAdif = () => {
    Share.share({ title: 'logbook.adi', message: toAdif(qsos, getSettings().myCall) });
  };

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={qsos}
        keyExtractor={(q) => String(q.id)}
        ListHeaderComponent={
          <View style={[s.row, { marginBottom: 4 }]}>
            <View style={{ flex: 1 }}><Button title="+ Novo QSO" onPress={newQso} /></View>
            <View style={{ flex: 1 }}><Button title="Exportar ADIF" outline onPress={exportAdif} /></View>
          </View>
        }
        ListEmptyComponent={<Text style={[s.dim, { textAlign: 'center', marginTop: 40 }]}>Nenhum QSO registrado.</Text>}
        renderItem={({ item: q }) => (
          <Pressable onPress={() => setEditing(q)}>
            <Card>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={[s.h1, { fontSize: 20 }]}>{q.callsign}</Text>
                <Text style={s.mono}>{utcStamp(q.utc)}</Text>
              </View>
              <Text style={s.dim}>
                {q.freq} MHz {bandFor(q.freq) ?? ''} · {q.mode} · RST {q.rst_sent}/{q.rst_rcvd}
                {q.name ? ` · ${q.name}` : ''}{q.qth ? ` · ${q.qth}` : ''}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <QsoForm value={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

function QsoForm({ value, onClose }: { value: QsoDraft | null; onClose: () => void }) {
  const [q, setQ] = useState<QsoDraft>({});
  useEffect(() => { if (value) setQ(value); }, [value]);
  const set = (k: keyof Qso) => (v: string) => setQ((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!q.callsign) return;
    const vals = [
      q.callsign.toUpperCase(), q.utc ?? new Date().toISOString(), q.freq ?? null, q.mode ?? null,
      q.rst_sent ?? null, q.rst_rcvd ?? null, q.name ?? null, q.qth ?? null, q.notes ?? null, q.chunk_id ?? null,
    ];
    if (q.id) {
      db.runSync(
        `UPDATE qsos SET callsign=?, utc=?, freq=?, mode=?, rst_sent=?, rst_rcvd=?, name=?, qth=?, notes=?, chunk_id=? WHERE id=?`,
        ...vals, q.id,
      );
    } else {
      db.runSync(
        `INSERT INTO qsos (callsign, utc, freq, mode, rst_sent, rst_rcvd, name, qth, notes, chunk_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...vals,
      );
    }
    notifyDbChange();
    onClose();
  };

  const remove = () => {
    if (q.id) { db.runSync('DELETE FROM qsos WHERE id=?', q.id); notifyDbChange(); }
    onClose();
  };

  return (
    <Modal visible={!!value} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 48 }]}>
        <Text style={s.h1}>{q.id ? 'Editar QSO' : 'Novo QSO'}</Text>
        <Field label="Indicativo" value={q.callsign ?? ''} onChangeText={set('callsign')} autoCapitalize="characters" autoFocus={!q.callsign} />
        <Field label="Data/hora UTC (AAAA-MM-DDTHH:MM)" value={(q.utc ?? '').slice(0, 16)} onChangeText={(v) => setQ((p) => ({ ...p, utc: v + ':00.000Z' }))} />
        <View style={s.row}>
          <Field label="Frequência (MHz)" value={q.freq ?? ''} onChangeText={set('freq')} keyboardType="decimal-pad" />
          <Field label="Modo" value={q.mode ?? ''} onChangeText={set('mode')} autoCapitalize="characters" />
        </View>
        <View style={s.row}>
          <Field label="RST enviado" value={q.rst_sent ?? ''} onChangeText={set('rst_sent')} keyboardType="number-pad" />
          <Field label="RST recebido" value={q.rst_rcvd ?? ''} onChangeText={set('rst_rcvd')} keyboardType="number-pad" />
        </View>
        <Field label="Nome" value={q.name ?? ''} onChangeText={set('name')} />
        <Field label="QTH" value={q.qth ?? ''} onChangeText={set('qth')} />
        <Field label="Observações" value={q.notes ?? ''} onChangeText={set('notes')} multiline />
        <Button title="Salvar" onPress={save} />
        <Button title="Cancelar" outline color={C.dim} onPress={onClose} />
        {q.id ? <Button title="Excluir QSO" outline color={C.rec} onPress={remove} /> : null}
      </ScrollView>
    </Modal>
  );
}
