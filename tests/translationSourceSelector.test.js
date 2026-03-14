const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { isRecentMemoryEntry, resolveTranslationSource } = require('../utils/translationSourceSelector');

test('prefers memory translation when entry is recent', () => {
  const nowMs = Date.now();
  const result = resolveTranslationSource({
    googleTranslation: 'Aerial bombardment',
    memoryEntry: {
      editedTranslation: 'Air strike',
      lastUsedAt: new Date(nowMs - 5 * 60 * 1000).toISOString()
    },
    nowMs
  });
  assert.equal(result.translation, 'Air strike');
  assert.equal(result.source, 'memory');
});

test('falls back to google when memory is stale', () => {
  const nowMs = Date.now();
  const result = resolveTranslationSource({
    googleTranslation: 'Aerial bombardment',
    memoryEntry: {
      editedTranslation: 'Air strike',
      lastUsedAt: new Date(nowMs - 120 * 24 * 60 * 60 * 1000).toISOString()
    },
    nowMs
  });
  assert.equal(result.translation, 'Aerial bombardment');
  assert.equal(result.source, 'google');
});

test('recent check handles invalid or missing dates', () => {
  assert.equal(isRecentMemoryEntry({ editedTranslation: 'x' }), false);
  assert.equal(isRecentMemoryEntry({ editedTranslation: 'x', lastUsedAt: 'bad-date' }), false);
});

test('high concurrency resolver stays under 200ms budget', async () => {
  const nowMs = Date.now();
  const start = performance.now();
  const tasks = Array.from({ length: 10000 }, (_, i) => Promise.resolve(resolveTranslationSource({
    googleTranslation: `g-${i}`,
    memoryEntry: {
      editedTranslation: `m-${i}`,
      lastUsedAt: new Date(nowMs - 1000).toISOString()
    },
    nowMs
  })));
  const results = await Promise.all(tasks);
  const durationMs = performance.now() - start;
  assert.equal(results.length, 10000);
  assert.ok(results.every(r => r.source === 'memory'));
  assert.ok(durationMs < 200);
});
