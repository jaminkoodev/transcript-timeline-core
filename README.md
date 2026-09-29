# Transcript Timeline Core

Small, deterministic TypeScript utilities for turning timestamped transcript tokens into inspectable segments and timeline groups. The package contains no model calls, database, lecture content, or deployment settings.

## Problem

Transcription providers return tokens with times, while downstream tools need stable sections and links back to the source. A careless split can lose words or write character offsets that point to the wrong text. This core makes the source-text relationship explicit and testable.

```text
timestamped tokens + exact raw text
             │
             ▼
   speaker / silence / sentence / size boundaries
             │
             ▼
  segments with token ranges, times, confidence, and source offsets
             │
             ▼
  optional adjacent-label grouping and readable time strings
```

## Contracts

- `segmentTokens` is a pure function. Identical inputs produce identical segments.
- If raw text is supplied, it must equal the token texts joined in order. A mismatch throws instead of publishing incorrect offsets.
- Every segment satisfies `rawText.slice(charStart, charEnd) === text`. The offsets count UTF-16 string code units, not UTF-8 bytes.
- Boundaries consider speaker changes, long gaps, sentence endings after a minimum size, and maximum size limits. Whitespace-only groups are omitted.
- `groupParts` combines only adjacent, equally labeled parts with contiguous sequence numbers. An incomplete time range remains `null`.
- `parseClock` distinguishes an empty input (`null`) from a malformed one (`undefined`). Plain numeric input means minutes.

## Try it

```bash
bun install --frozen-lockfile
bun run demo
bun run test
bun run typecheck
```

The demo uses synthetic conversation tokens and prints segments with a `sourceMatches` check. Import the functions from `src/index.ts` in another TypeScript project.

## Design limits

The default boundary thresholds are starting values and need calibration for each transcription source. The core assumes token times arrive in order and does not validate or repair invalid timestamps. It does not perform speech recognition, alignment against recordings, speaker identification, or confidence calibration. It only transforms token data already supplied by a caller.

## License

MIT.
