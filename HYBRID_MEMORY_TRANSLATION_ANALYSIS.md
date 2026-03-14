# Hybrid Memory + Google Translation Analysis

## Failure case catalog

### FC-1: Disconnected replacement tokens
- Symptom: memory word appears beside original Google token.
- Root cause: positional fallback mapped memory to a second token when phrase anchor was weak.
- Impact: duplicated lexical meaning and broken readability.

### FC-2: Clause boundary breakage in complex sentences
- Symptom: subordinate clauses lose order after memory injection.
- Root cause: word-level replacement without phrase-span awareness.
- Impact: semantic drift and grammatical degradation.

### FC-3: Arabic destination order regression
- Symptom: destination Arabic output keeps wrong sequence around conjunctions and punctuation.
- Root cause: naive token matching ignored Arabic connective prefixes and clause punctuation anchoring.
- Impact: unnatural target-language flow.

### FC-4: Semantic dropout in long inputs
- Symptom: translation collapses to short fragments after aggressive edit application.
- Root cause: uncontrolled replacement windows and no continuity checks.
- Impact: lost information and low coherence.

## Hybrid architecture

### Source selection layer
- Uses recency-gated memory selection from `translationSourceSelector`.
- Rule: prefer memory only for recent entries; otherwise keep Google baseline.
- File: `utils/translationSourceSelector.js`.

### Contextual merge layer
- Phrase-aware matching from Google baseline into memory candidates.
- Replaces only contiguous phrase spans and never reorders non-target tokens.
- Preserves clause boundaries and punctuation.
- Language-specific token compatibility includes Arabic conjunction prefix handling (`و`).
- File: `utils/hybridMemoryEngine.js`.

### UI integration layer
- Renderer uses phrase spans and skips positional force-mapping.
- Memory now applies only when contextual anchor exists, preventing duplicated tokens.
- File: `views/translator/home.ejs`.

### Sync consistency layer
- Deletion propagation from memory page to translator page using `localStorage` sync payloads.
- Prunes direct and reverse (`_rev`) memory entries.
- Files: `routes/memory.js`, `utils/memoryDeletionSync.js`, `views/translator/memory.ejs`, `views/translator/home.ejs`.

## Decision algorithm (operational)

1. Build Google baseline translation.
2. Collect active memory edits by target language.
3. Rank memory edits by usage and replacement specificity.
4. For each edit, evaluate candidate anchors (`current`, `google`, `original` translation).
5. Select highest-confidence contiguous span inside the same clause.
6. Apply replacement in-place and mark occupied span.
7. Reject edits without contextual anchors.
8. Run quality metrics against references for evaluation.

## Contextual linking strategy

- Syntactic proxy: clause segmentation by punctuation.
- Semantic proxy: token normalization + phrase overlap checks.
- Language-specific rules:
  - Arabic diacritics normalization.
  - Arabic conjunction compatibility (`و+token`).
  - punctuation-aware tail preservation.

## Testing framework

- `tests/hybridMemoryEngine.test.js`
  - complex sentence structure retention
  - Arabic clause order preservation
  - idiomatic expression replacement
  - failure-case detection
  - comparative quality improvement checks
- `tests/memoryDeletionSync.test.js`
  - deletion propagation integrity
  - reverse-id pruning
  - high-concurrency prune performance
- `tests/translationSourceSelector.test.js`
  - memory-vs-google source selection
  - recency gating
  - high-concurrency source resolution

## Quantitative quality metrics

- BLEU-1 precision: lexical alignment to reference.
- Word-order correctness ratio: monotonic token-order retention versus reference.
- Semantic coherence index: Jaccard overlap of normalized content tokens.
- Comparative framework: baseline Google-only or naive merge vs hybrid merge.
- File: `utils/translationQualityMetrics.js`.

## Expected quality outcomes

- Lower duplication artifacts for named entities and custom memory terms.
- Higher word-order correctness in multi-clause sentences.
- Better semantic coherence under mixed glossary + memory usage.
- Stable performance under high-concurrency utility-level checks (<200ms in current tests).
