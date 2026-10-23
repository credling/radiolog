import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const C = {
  bg: '#0f1418',
  card: '#182026',
  border: '#26313a',
  text: '#e8eef2',
  dim: '#8a9aa6',
  accent: '#f5a524',
  rec: '#e5484d',
  ok: '#30a46c',
  warn: '#f5a524',
};

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={C.dim} style={s.input} {...props} />
    </View>
  );
}

export function Button({ title, onPress, color = C.accent, outline }: {
  title: string; onPress: () => void; color?: string; outline?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        outline ? { borderColor: color, borderWidth: 1 } : { backgroundColor: color },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[s.btnText, outline && { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({ options, value, onChange }: {
  options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, o === value && s.chipOn]}>
          <Text style={[s.chipText, o === value && { color: C.bg }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  label: { color: C.dim, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  text: { color: C.text, fontSize: 15 },
  dim: { color: C.dim, fontSize: 13 },
  h1: { color: C.text, fontSize: 22, fontWeight: '700' },
  mono: { fontFamily: 'monospace', color: C.text },
  input: {
    backgroundColor: C.bg, color: C.text, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: C.bg, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontWeight: '600' },
});
