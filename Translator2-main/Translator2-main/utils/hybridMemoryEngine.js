function normalizeToken(value, langCode) {
  let out = String(value || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (langCode === 'ar') out = out.replace(/\s+/g, ' ');
  return out;
}

function tokenizeWords(text, langCode) {
  const raw = String(text || '').split(/\s+/).filter(Boolean);
  return raw.map((w, index) => ({ index, raw: w, norm: normalizeToken(w, langCode) }));
}

function splitClauses(text) {
  return String(text || '')
    .split(/([,،؛;.!?])/)
    .reduce((acc, part) => {
      if (!part) return acc;
      if (/^[,،؛;.!?]$/.test(part)) {
        if (acc.length) acc[acc.length - 1] += part;
      } else {
        acc.push(part.trim());
      }
      return acc;
    }, [])
    .filter(Boolean);
}

function tokenCompatible(tokenNorm, phraseNorm, langCode) {
  if (!tokenNorm || !phraseNorm) return false;
  if (tokenNorm === phraseNorm) return true;
  if (tokenNorm.includes(phraseNorm) || phraseNorm.includes(tokenNorm)) return true;
  if (langCode === 'ar') {
    if (tokenNorm === `و${phraseNorm}` || phraseNorm === `و${tokenNorm}`) return true;
  }
  return false;
}

function rankEdits(edits) {
  return [...(edits || [])].sort((a, b) => {
    const bUsage = Number(b.usageCount || 0);
    const aUsage = Number(a.usageCount || 0);
    if (bUsage !== aUsage) return bUsage - aUsage;
    const bLen = String(b.userTranslation || '').length;
    const aLen = String(a.userTranslation || '').length;
    return bLen - aLen;
  });
}

function applyEditsToClause(clause, edits, langCode) {
  let parts = String(clause || '').match(/\S+|\s+/g) || [];
  const applied = [];
  const ordered = rankEdits(edits);
  function contentTokensFromParts() {
    const tokens = [];
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i] || !parts[i].trim()) continue;
      tokens.push({ partIndex: i, raw: parts[i], norm: normalizeToken(parts[i], langCode) });
    }
    return tokens;
  }
  for (const edit of ordered) {
    const candidates = [edit.currentTranslation, edit.googleTranslation, edit.originalTranslation]
      .map(v => String(v || '').trim())
      .filter(Boolean);
    if (!candidates.length || !edit.userTranslation) continue;
    let appliedForEdit = false;
    for (const candidate of candidates) {
      const phraseTokens = normalizeToken(candidate, langCode).split(' ').filter(Boolean);
      if (!phraseTokens.length) continue;
      const clauseTokens = contentTokensFromParts();
      for (let i = 0; i <= clauseTokens.length - phraseTokens.length; i++) {
        let ok = true;
        for (let j = 0; j < phraseTokens.length; j++) {
          if (!tokenCompatible(clauseTokens[i + j].norm, phraseTokens[j], langCode)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const startPart = clauseTokens[i].partIndex;
        const endPart = clauseTokens[i + phraseTokens.length - 1].partIndex;
        const trailing = (parts[endPart].match(/([.,!?;:،。]+)$/) || [])[1] || '';
        parts[startPart] = `${edit.userTranslation}${trailing}`;
        for (let z = startPart + 1; z <= endPart; z++) parts[z] = '';
        applied.push({ editId: edit.editId, from: candidate, to: edit.userTranslation });
        appliedForEdit = true;
        break;
      }
      if (appliedForEdit) break;
    }
  }
  return { output: parts.join('').replace(/\s+/g, ' ').trim(), applied };
}

function buildHybridTranslation({ googleText, edits, targetLang }) {
  const clauses = splitClauses(googleText);
  const allApplied = [];
  const mergedClauses = clauses.map(clause => {
    const { output, applied } = applyEditsToClause(clause, edits, targetLang);
    allApplied.push(...applied);
    return output;
  });
  return {
    text: mergedClauses.join(' ').replace(/\s+/g, ' ').trim(),
    applied: allApplied
  };
}

function categorizeFailureCases({ googleText, hybridText }) {
  const failures = [];
  if (!googleText || !hybridText) return failures;
  const googleClauses = splitClauses(googleText);
  const hybridClauses = splitClauses(hybridText);
  if (hybridClauses.length !== googleClauses.length) failures.push('clause_count_shift');
  const tokenDelta = Math.abs(tokenizeWords(googleText).length - tokenizeWords(hybridText).length);
  if (tokenDelta > 3) failures.push('token_discontinuity');
  const gNorm = normalizeToken(googleText);
  const hNorm = normalizeToken(hybridText);
  if (gNorm && hNorm && hNorm.length < gNorm.length * 0.5) failures.push('semantic_dropout');
  return failures;
}

module.exports = {
  buildHybridTranslation,
  categorizeFailureCases,
  normalizeToken,
  splitClauses
};
