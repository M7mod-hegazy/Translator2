const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHybridTranslation, categorizeFailureCases } = require('../utils/hybridMemoryEngine');
const { compareQuality } = require('../utils/translationQualityMetrics');

test('hybrid keeps sentence structure while applying memory phrase', () => {
  const googleText = 'Aerial bombardment, but Houda is not injured';
  const edits = [{
    editId: '1',
    currentTranslation: 'Houda',
    googleTranslation: 'Houda',
    originalTranslation: 'Houda',
    userTranslation: 'Mahmoud',
    usageCount: 9
  }];
  const hybrid = buildHybridTranslation({ googleText, edits, targetLang: 'en' });
  assert.equal(hybrid.text, 'Aerial bombardment, but Mahmoud is not injured');
  assert.equal(hybrid.applied.length, 1);
});

test('hybrid preserves Arabic clause order while replacing memory terms', () => {
  const googleText = 'بطل محلي، لكن بشريه خاسر';
  const edits = [{
    editId: '2',
    currentTranslation: 'بشريه',
    googleTranslation: 'بشريه',
    originalTranslation: 'بشريه',
    userTranslation: 'حماده',
    usageCount: 4
  }];
  const hybrid = buildHybridTranslation({ googleText, edits, targetLang: 'ar' });
  assert.equal(hybrid.text, 'بطل محلي، لكن حماده خاسر');
});

test('failure categorization detects severe discontinuity', () => {
  const failures = categorizeFailureCases({
    googleText: 'human losses but hamada is an hero',
    hybridText: 'hamada'
  });
  assert.ok(failures.includes('semantic_dropout'));
});

test('quality metrics improve for structured hybrid output', () => {
  const reference = 'Aerial bombardment, but Mahmoud is not injured';
  const baseline = 'Mahmoud injured not but bombardment aerial';
  const hybrid = 'Aerial bombardment, but Mahmoud is not injured';
  const metrics = compareQuality({ baseline, hybrid, reference, langCode: 'en' });
  assert.ok(metrics.deltas.bleu >= 0);
  assert.ok(metrics.deltas.wordOrder > 0);
  assert.ok(metrics.deltas.coherence >= 0);
});

test('handles idiomatic and complex sentence pattern', () => {
  const googleText = 'He kicked the bucket, but his friend stayed calm';
  const edits = [{
    editId: '3',
    currentTranslation: 'kicked the bucket',
    googleTranslation: 'kicked the bucket',
    originalTranslation: 'kicked the bucket',
    userTranslation: 'passed away',
    usageCount: 12
  }];
  const hybrid = buildHybridTranslation({ googleText, edits, targetLang: 'en' });
  assert.equal(hybrid.text, 'He passed away, but his friend stayed calm');
});
