import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCallsigns, isCallsign } from '../src/callsign.js';

test('valida formatos de indicativo', () => {
  for (const ok of ['PY2ABC', 'PU1AB', 'PP5XX', 'ZZ2A', '2E0XYZ', 'K1A', 'W1AW']) assert.ok(isCallsign(ok), ok);
  for (const bad of ['123AB', 'ABC', 'PY2', 'MP3', 'PY2ABCDE']) assert.ok(!isCallsign(bad), bad);
});

test('indicativo escrito', () => {
  assert.deepEqual(extractCallsigns('Aqui é PY2ABC chamando, câmbio'), ['PY2ABC']);
  assert.deepEqual(extractCallsigns('qrz de pu1xyz/p'), ['PU1XYZ/P']);
});

test('alfabeto fonético em português', () => {
  assert.deepEqual(
    extractCallsigns('Papa Yankee Dois Alfa Bravo Charlie na escuta'),
    ['PY2ABC'],
  );
  assert.deepEqual(extractCallsigns('Papa Uniform Meia X-ray Zulu, obrigado'), ['PU6XZ']);
});

test('letras soltas e números', () => {
  assert.deepEqual(extractCallsigns('aqui P Y 3 K L M, 73'), ['PY3KLM']);
});

test('dois indicativos na mesma frase', () => {
  const r = extractCallsigns('Papa Yankee Dois Alfa Bravo de Papa Papa Cinco Zulu Zulu');
  assert.deepEqual(r.sort(), ['PP5ZZ', 'PY2AB']);
});

test('texto comum não gera falso positivo', () => {
  assert.deepEqual(extractCallsigns('o sinal está cinco por nove, muito obrigado pelo contato'), []);
  assert.deepEqual(extractCallsigns('volto a um e meia, tá bom?'), []);
});
