const { normalizeToken } = require('./hybridMemoryEngine');

function tokenize(text, langCode) {
  return normalizeToken(text || '', langCode).split(' ').filter(Boolean);
}

function bleu1(candidate, reference, langCode) {
  const cand = tokenize(candidate, langCode);
  const ref = tokenize(reference, langCode);
  if (!cand.length || !ref.length) return 0;
  const refCounts = {};
  ref.forEach(t => { refCounts[t] = (refCounts[t] || 0) + 1; });
  let hits = 0;
  cand.forEach(t => {
    if (refCounts[t] > 0) {
      hits += 1;
      refCounts[t] -= 1;
    }
  });
  return hits / cand.length;
}

function wordOrderRatio(candidate, reference, langCode) {
  const cand = tokenize(candidate, langCode);
  const ref = tokenize(reference, langCode);
  if (!cand.length || !ref.length) return 0;
  const refPos = {};
  ref.forEach((t, i) => { if (!(t in refPos)) refPos[t] = i; });
  let matched = 0;
  let ordered = 0;
  let prev = -1;
  cand.forEach(t => {
    if (refPos[t] === undefined) return;
    matched += 1;
    if (refPos[t] >= prev) {
      ordered += 1;
      prev = refPos[t];
    }
  });
  if (!matched) return 0;
  return ordered / matched;
}

function semanticCoherenceIndex(candidate, reference, langCode) {
  const cand = new Set(tokenize(candidate, langCode));
  const ref = new Set(tokenize(reference, langCode));
  if (!cand.size || !ref.size) return 0;
  let inter = 0;
  cand.forEach(t => { if (ref.has(t)) inter += 1; });
  const union = new Set([...cand, ...ref]).size;
  return union ? inter / union : 0;
}

function compareQuality({ baseline, hybrid, reference, langCode }) {
  const baselineMetrics = {
    bleu: bleu1(baseline, reference, langCode),
    wordOrder: wordOrderRatio(baseline, reference, langCode),
    coherence: semanticCoherenceIndex(baseline, reference, langCode)
  };
  const hybridMetrics = {
    bleu: bleu1(hybrid, reference, langCode),
    wordOrder: wordOrderRatio(hybrid, reference, langCode),
    coherence: semanticCoherenceIndex(hybrid, reference, langCode)
  };
  return {
    baseline: baselineMetrics,
    hybrid: hybridMetrics,
    deltas: {
      bleu: hybridMetrics.bleu - baselineMetrics.bleu,
      wordOrder: hybridMetrics.wordOrder - baselineMetrics.wordOrder,
      coherence: hybridMetrics.coherence - baselineMetrics.coherence
    }
  };
}

module.exports = {
  bleu1,
  wordOrderRatio,
  semanticCoherenceIndex,
  compareQuality
};
