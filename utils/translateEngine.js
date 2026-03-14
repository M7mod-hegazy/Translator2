const TranslationMemory = require('../models/TranslationMemory');
const GlossaryTerm = require('../models/GlossaryTerm');
const Language = require('../models/Language');
const axios = require('axios');

/**
 * Translator Translate Engine
 * Full-text MT via Google Translate + glossary enforcement
 * 
 * Strategy: TRANSLATE NORMALLY + CACHED POST-EDIT
 * - Translate full text normally via MT (no source modification)
 * - For each glossary match, find what MT produced and replace with glossary term
 * - Single-word MT translations are LRU-cached
 * - Multi-target translations run in parallel.
 */

// LRU cache for single-word translations
const mtWordCache = new Map();
const MAX_CACHE_SIZE = 2000;

/**
 * Translate a single word via Google Translate (LRU-cached)
 */
async function mtWord(word, sourceLang, targetLang) {
  const cacheKey = `${word}:${sourceLang}:${targetLang}`;
  
  if (mtWordCache.has(cacheKey)) {
    return mtWordCache.get(cacheKey);
  }
  
  try {
    const result = await googleTranslate(word, sourceLang, targetLang);
    const cleaned = result.trim();
    
    // LRU eviction
    if (mtWordCache.size >= MAX_CACHE_SIZE) {
      const firstKey = mtWordCache.keys().next().value;
      mtWordCache.delete(firstKey);
    }
    
    mtWordCache.set(cacheKey, cleaned);
    return cleaned;
  } catch (e) {
    console.error('MT Word Error:', e.message);
    return word;
  }
}

/**
 * Translate full text via Google Translate
 */
async function mtTranslate(text, sourceLang, targetLang) {
  try {
    return await googleTranslate(text, sourceLang, targetLang);
  } catch (e) {
    console.error('MT Translate Error:', e.message);
    return text;
  }
}

/**
 * Google Translate API call
 */
async function googleTranslate(text, sourceLang, targetLang) {
  const url = 'https://translate.googleapis.com/translate_a/single';
  
  console.log('[googleTranslate] Calling Google Translate:', { text: text?.substring(0, 30), sourceLang, targetLang });
  
  try {
    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text
      },
      timeout: 15000
    });
    
    console.log('[googleTranslate] Response received:', response.data ? 'success' : 'empty');
    
    // Response format: [[["translation","original",null,null,10],...],null,"en",null,null,null,null,null]
    const translations = response.data[0];
    if (translations && translations[0]) {
      const result = translations.map(t => t[0]).join('');
      console.log('[googleTranslate] Translation result:', result?.substring(0, 30));
      return result;
    }
    console.log('[googleTranslate] No translations in response');
    return text;
  } catch (e) {
    console.error('[googleTranslate] Error:', e.message);
    // Fallback: return original text with marker if all APIs fail
    console.warn('[googleTranslate] All translation APIs failed, returning original');
    return `[${targetLang}] ${text}`;
  }
}

/**
 * Load glossary terms with ALL language fields.
 * Handles multi-variant terms: splits on " / " to create separate lookup keys.
 * Also handles parenthetical content like "(عام/سياسي)" by stripping it for a clean match.
 */
async function lookupGlossaryAll(categoryId, sourceLangCode) {
  if (!categoryId) return {};
  
  const srcField = `term${sourceLangCode.charAt(0).toUpperCase() + sourceLangCode.slice(1)}`;
  
  console.log('[lookupGlossaryAll] Looking up with:', { categoryId, srcField });
  
  try {
    const terms = await GlossaryTerm.find({
      category: categoryId,
      [srcField]: { $exists: true, $ne: '' }
    });
    
    console.log('[lookupGlossaryAll] Found terms:', terms.length);
    
    const termDict = {};
    
    for (const t of terms) {
      const srcVal = t[srcField];
      if (!srcVal) continue;
      
      const termData = {
        id: t._id,
        sourceTerm: srcVal,
        termEn: t.termEn || '',
        termAr: t.termAr || '',
        termEs: t.termEs || ''
      };
      
      // Generate all possible match keys from this term
      const keys = generateMatchKeys(srcVal);
      
      for (const key of keys) {
        const k = key.toLowerCase().trim();
        if (k.length >= 1) {
          // Longer/more-specific keys take priority (don't overwrite with shorter)
          if (!termDict[k] || termDict[k].sourceTerm.length <= srcVal.length) {
            termDict[k] = termData;
          }
        }
      }
    }
    console.log('[lookupGlossaryAll] Term dict keys:', Object.keys(termDict).length, '(from', terms.length, 'terms)');
    return termDict;
  } catch (e) {
    console.error('[lookupGlossaryAll] Error:', e.message);
    return {};
  }
}

/**
 * Generate all searchable keys from a term that may contain:
 * - Multiple variants: "To Testify / To Appear before Parliament"
 * - Parenthetical notes: "عفو (عام/سياسي)" → "عفو"
 * - Slashes within: "Condemn / Denounce" → ["Condemn", "Denounce"]
 */
function generateMatchKeys(termValue) {
  const keys = new Set();
  
  // 1. The full original value is always a key
  keys.add(termValue.trim());
  
  // 2. Strip parenthetical content: "عفو (عام/سياسي)" → "عفو"
  const withoutParens = termValue.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutParens && withoutParens !== termValue.trim()) {
    keys.add(withoutParens);
  }
  
  // 3. Split by " / " (surrounded by spaces) for true alternatives
  const slashParts = termValue.split(/\s*\/\s*/);
  if (slashParts.length > 1) {
    for (const part of slashParts) {
      const cleaned = part.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 1) {
        keys.add(cleaned);
      }
      // Also add the raw part (with parens)
      if (part.trim().length >= 1) {
        keys.add(part.trim());
      }
    }
  }
  
  return Array.from(keys);
}

/**
 * Find all glossary term occurrences in text
 */
function findGlossaryMatches(text, glossary) {
  if (!glossary) return [];
  
  console.log('[findGlossaryMatches] Input text:', text?.substring(0, 50), 'glossary keys:', Object.keys(glossary).length);
  
  const matches = [];
  const sortedTerms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const textLower = text.toLowerCase();
  const usedRanges = [];
  
  for (const termKey of sortedTerms) {
    const term = glossary[termKey];
    let start = 0;
    
    while (true) {
      const idx = textLower.indexOf(termKey, start);
      if (idx === -1) break;
      
      const endIdx = idx + termKey.length;
      
      let beforeOk = (idx === 0 || !textLower[idx - 1].match(/[a-z0-9]/i));
      let afterOk = (endIdx >= textLower.length || !textLower[endIdx].match(/[a-z0-9]/i));
      
      // Allow non-Latin characters
      if (!beforeOk || !afterOk) {
        const char = text[idx];
        if (char && char.charCodeAt(0) > 127) {
          beforeOk = afterOk = true;
        }
      }
      
      const overlaps = usedRanges.some(([s, e]) => s < endIdx && e > idx);
      
      if (beforeOk && afterOk && !overlaps) {
        usedRanges.push([idx, endIdx]);
        matches.push({
          sourceWord: text.substring(idx, endIdx),
          termId: term.id,
          termEn: term.termEn,
          termAr: term.termAr,
          termEs: term.termEs,
          start: idx,
          end: endIdx
        });
      }
      
      start = idx + 1;
    }
  }
  
  matches.sort((a, b) => a.start - b.start);
  console.log('[findGlossaryMatches] Found matches:', matches.length, matches.map(m => m.sourceWord));
  return matches;
}

/**
 * Post-edit: find what MT produced for each glossary source word
 * and replace it with the glossary target term
 */
async function applyGlossaryReplacement(fullTranslation, matches, sourceLang, targetLang) {
  const tgtField = `term${targetLang.charAt(0).toUpperCase() + targetLang.slice(1)}`;
  let result = fullTranslation;
  const mtWordResults = new Map();
  const uniqueSourceWords = Array.from(new Set((matches || []).map(m => (m.sourceWord || '').toLowerCase()).filter(Boolean)));
  
  await Promise.all(uniqueSourceWords.map(async (sourceWord) => {
    try {
      mtWordResults.set(sourceWord, await mtWord(sourceWord, sourceLang, targetLang));
    } catch (e) {
      mtWordResults.set(sourceWord, sourceWord);
    }
  }));
  
  for (const m of matches) {
    const glossaryTarget = m[tgtField];
    if (!glossaryTarget) continue;
    
    // Skip if glossary target already in output
    if (result.toLowerCase().includes(glossaryTarget.toLowerCase())) continue;
    
    // Get what MT translates this word to in isolation (CACHED)
    const mtWordResult = mtWordResults.get((m.sourceWord || '').toLowerCase()) || await mtWord(m.sourceWord.toLowerCase(), sourceLang, targetLang);
    const mtClean = mtWordResult.replace(/[.!?,;:،。]+$/, '');
    
    console.log('[applyGlossaryReplacement] Source:', m.sourceWord, '→ MT says:', mtWordResult, '→ Glossary:', glossaryTarget);
    
    // Try exact match replacement
    let replaced = false;
    for (const candidate of [mtWordResult, mtClean]) {
      if (!candidate) continue;
      
      const idx = result.toLowerCase().indexOf(candidate.toLowerCase());
      if (idx !== -1) {
        result = result.substring(0, idx) + glossaryTarget + result.substring(idx + candidate.length);
        replaced = true;
        console.log('[applyGlossaryReplacement] Exact match replaced');
        break;
      }
    }
    
    // Try matching the MT result when Google splits terms (e.g., "kill22" → "قتل 22")
    // Split the MT word result and see if all parts appear consecutively in the output
    if (!replaced && mtClean.includes(' ')) {
      const mtParts = mtClean.split(/\s+/);
      const resultLower = result.toLowerCase();
      const firstPartIdx = resultLower.indexOf(mtParts[0].toLowerCase());
      if (firstPartIdx !== -1) {
        // Find the extent of all consecutive parts
        let searchStart = firstPartIdx;
        let lastEndIdx = firstPartIdx + mtParts[0].length;
        let allFound = true;
        for (let p = 1; p < mtParts.length; p++) {
          const nextIdx = resultLower.indexOf(mtParts[p].toLowerCase(), searchStart);
          if (nextIdx !== -1 && nextIdx <= lastEndIdx + 2) {
            lastEndIdx = nextIdx + mtParts[p].length;
          } else {
            allFound = false;
            break;
          }
        }
        if (allFound) {
          result = result.substring(0, firstPartIdx) + glossaryTarget + result.substring(lastEndIdx);
          replaced = true;
          console.log('[applyGlossaryReplacement] Multi-word MT replaced');
        }
      }
    }
    
    // Also try: source word might contain numbers that Google keeps as-is
    // e.g., "kill22" → Google outputs "قتل22" or "قتل 22" — find any segment containing the number part
    if (!replaced) {
      const numberMatch = m.sourceWord.match(/(\d+)/);
      if (numberMatch) {
        const numPart = numberMatch[1];
        const resultWords = result.split(/(\s+)/);
        let foundIdx = -1;
        let spanStart = -1;
        let spanEnd = -1;
        let pos = 0;
        
        for (let w = 0; w < resultWords.length; w++) {
          if (resultWords[w].includes(numPart) || 
              (w > 0 && resultWords[w-1] && !resultWords[w-1].trim() && w > 1 && resultWords[w].includes(numPart))) {
            // Found the number — look for adjacent non-number text that's part of MT result
            spanEnd = pos + resultWords[w].length;
            spanStart = pos;
            // Extend backwards to capture the translated word part
            if (w >= 2 && !resultWords[w-1].trim()) {
              spanStart = pos - resultWords[w-1].length - (resultWords[w-2] || '').length;
            }
            foundIdx = w;
            break;
          }
          pos += resultWords[w].length;
        }
        
        if (foundIdx !== -1 && spanStart >= 0) {
          result = result.substring(0, spanStart) + glossaryTarget + result.substring(spanEnd);
          replaced = true;
          console.log('[applyGlossaryReplacement] Number-based replaced');
        }
      }
    }
    
    // Stem matching fallback
    if (!replaced && mtClean.length >= 3) {
      const stemLen = Math.max(2, Math.floor(mtClean.length * 0.6));
      const stem = mtClean.substring(0, stemLen);
      const stemRegex = new RegExp(stem + '\\S*', 'i');
      const match = stemRegex.exec(result);
      
      if (match) {
        result = result.substring(0, match.index) + glossaryTarget + result.substring(match.index + match[0].length);
        replaced = true;
      }
    }
    
    // For non-Latin output: character overlap matching
    if (!replaced && mtClean.split('').some(c => c.charCodeAt(0) > 127) && mtClean.length >= 2) {
      const wordsInOutput = result.match(/\S+/g) || [];
      for (const word of wordsInOutput) {
        if (word === glossaryTarget) continue;
        
        const shared = mtClean.split('').filter(c => word.includes(c)).length;
        if (shared >= Math.max(2, Math.floor(mtClean.length * 0.5))) {
          result = result.replace(word, glossaryTarget);
          break;
        }
      }
    }
  }
  
  return result;
}

/**
 * Translate text then post-edit to enforce glossary terms
 */
async function translateWithGlossary(text, sourceLang, targetLang, options = {}) {
  const { category, useGlossary = true, glossary = null, matches = null, allDetectedMatches = null } = options;
  
  if (!text.trim()) {
    return { fullTranslation: '', segments: [] };
  }
  
  // Translate line-by-line
  const lines = text.split('\n');
  const translatedLines = await Promise.all(lines.map(async (line) => {
    if (!line.trim()) return line;
    return await mtTranslate(line, sourceLang, targetLang);
  }));
  
  let fullTranslation = translatedLines.join('\n');
  
  // Apply glossary replacements
  if (matches && matches.length > 0) {
    fullTranslation = await applyGlossaryReplacement(fullTranslation, matches, sourceLang, targetLang);
  }
  
  // Build segments using ALL detected matches
  const segments = [];
  const displayMatches = allDetectedMatches !== null ? allDetectedMatches : matches;
  
  if (displayMatches) {
    const seenIds = new Set();
    for (const m of displayMatches) {
      const termIdStr = m.termId.toString();
      if (!seenIds.has(termIdStr)) {
        seenIds.add(termIdStr);
        segments.push({
          source: m.sourceWord,
          is_glossary: true,
          term_id: m.termId,
          term_en: m.termEn,
          term_ar: m.termAr,
          term_es: m.termEs
        });
      }
    }
  }
  
  return {
    full_translation: fullTranslation,
    segments
  };
}

/**
 * Translate text into multiple target languages in PARALLEL
 */
async function translateMultiTarget(text, sourceLang, targetLangs, options = {}) {
  const { category, useGlossary = true, disabledTerms = [] } = options;
  
  console.log('[translateEngine] translateMultiTarget called:', { text: text?.substring(0, 30), sourceLang, targetLangs, category });
  
  const targets = targetLangs.filter(t => t !== sourceLang);
  if (!targets.length) {
    console.log('[translateEngine] No targets after filtering, returning empty');
    return {};
  }
  
  console.log('[translateEngine] Targets to translate:', targets);
  
  // Glossary: detect once, share across all targets
  let allGlossary = {};
  let matches = [];
  
  if (useGlossary && category) {
    console.log('[translateEngine] Looking up glossary for category:', category);
    allGlossary = await lookupGlossaryAll(category, sourceLang);
    matches = findGlossaryMatches(text, allGlossary);
    console.log('[translateEngine] Glossary matches found:', matches.length);
  }
  
  // Filter matches for replacement but KEEP them for returning in segments
  let replacementMatches = matches;
  if (disabledTerms && disabledTerms.length > 0) {
    const disabledSet = new Set(disabledTerms.map(String));
    replacementMatches = matches.filter(m => !disabledSet.has(String(m.termId)));
  }
  
  const targetResults = await Promise.all(targets.map(async (tgt) => {
    try {
      const translated = await translateWithGlossary(text, sourceLang, tgt, {
        category,
        useGlossary,
        glossary: allGlossary,
        matches: replacementMatches,
        allDetectedMatches: matches
      });
      return [tgt, translated];
    } catch (e) {
      console.error(`Translation error for ${tgt}:`, e);
      return [tgt, { full_translation: '', segments: [] }];
    }
  }));
  
  const results = {};
  for (const [tgt, translated] of targetResults) {
    results[tgt] = translated;
  }
  
  return results;
}

/**
 * Pure MT, no glossary
 */
async function translateDirect(text, sourceLang, targetLang) {
  if (!text.trim()) return '';
  return await mtTranslate(text, sourceLang, targetLang);
}

module.exports = {
  translateMultiTarget,
  translateWithGlossary,
  translateDirect,
  mtTranslate,
  mtWord,
  lookupGlossaryAll,
  findGlossaryMatches,
  applyGlossaryReplacement,
  googleTranslate
};
