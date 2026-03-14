const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { toSyncPayload, pruneEditsByDeletion } = require('../utils/memoryDeletionSync');

test('creates deletion payload with base and synthetic ids', () => {
  const payload = toSyncPayload([{ _id: 'abc123' }, { _id: 'def456' }]);
  assert.deepEqual(payload.deletedIds, ['abc123', 'def456']);
  assert.deepEqual(payload.deletedSyntheticIds, ['abc123_rev', 'def456_rev']);
  assert.ok(payload.syncToken > 0);
});

test('prunes direct and reverse entries by deleted ids', () => {
  const edits = [
    { editId: 'abc123', sourceWord: 'x' },
    { editId: 'abc123_rev', sourceWord: 'y' },
    { editId: 'def456', sourceWord: 'z' }
  ];
  const payload = {
    deletedIds: ['abc123'],
    deletedSyntheticIds: ['abc123_rev'],
    syncToken: Date.now()
  };
  const pruned = pruneEditsByDeletion(edits, payload);
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].editId, 'def456');
});

test('does not modify unrelated edits', () => {
  const edits = [{ editId: 'x1' }, { editId: 'x2_rev' }];
  const payload = { deletedIds: ['y1'], deletedSyntheticIds: ['y1_rev'], syncToken: Date.now() };
  const pruned = pruneEditsByDeletion(edits, payload);
  assert.equal(pruned.length, 2);
});

test('high concurrency prune stays under 200ms', async () => {
  const edits = Array.from({ length: 10000 }, (_, i) => ({ editId: `id-${i}` }));
  const payload = { deletedIds: ['id-1', 'id-2'], deletedSyntheticIds: ['id-1_rev', 'id-2_rev'], syncToken: Date.now() };
  const start = performance.now();
  const tasks = Array.from({ length: 200 }, () => Promise.resolve(pruneEditsByDeletion(edits, payload)));
  const results = await Promise.all(tasks);
  const durationMs = performance.now() - start;
  assert.equal(results.length, 200);
  assert.ok(results.every(r => r.length === 9998));
  assert.ok(durationMs < 200);
});
