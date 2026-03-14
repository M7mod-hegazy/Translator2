function toMs(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function isRecentMemoryEntry(entry, options = {}) {
  if (!entry) return false;
  const nowMs = options.nowMs || Date.now();
  const maxAgeMs = options.maxAgeMs || 90 * 24 * 60 * 60 * 1000;
  const lastUsedMs = toMs(entry.lastUsedAt);
  if (!lastUsedMs) return false;
  return (nowMs - lastUsedMs) <= maxAgeMs;
}

function resolveTranslationSource(input = {}) {
  const googleTranslation = input.googleTranslation || '';
  const memoryEntry = input.memoryEntry || null;
  if (!memoryEntry) return { translation: googleTranslation, source: 'google' };
  const recent = isRecentMemoryEntry(memoryEntry, input);
  const memoryTranslation = (memoryEntry.editedTranslation || '').trim();
  if (recent && memoryTranslation) {
    return { translation: memoryTranslation, source: 'memory' };
  }
  return { translation: googleTranslation, source: 'google' };
}

module.exports = {
  isRecentMemoryEntry,
  resolveTranslationSource
};
