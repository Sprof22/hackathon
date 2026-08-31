# Evaluation results

Generated deterministically from the six checked-in synthetic commitments and their follow-up meetings. The baseline reads only the latest transcript and applies status keywords. LoopClose persists the initial commitments, requires attributable evidence, handles negation, applies a confidence threshold, and routes ambiguous completion language to review.

| Metric | Stateless baseline | LoopClose |
| --- | ---: | ---: |
| Initial commitments recovered | not retained | 6/6 (100.0%) |
| Correct final outcomes | 3/6 (50.0%) | 6/6 (100.0%) |
| Unsafe false closes | 2 | 0 |
| Missing final outcomes | 1 | 0 |

## Per-item evidence

| Series | Owner | Expected | Baseline | LoopClose |
| --- | --- | --- | --- | --- |
| series-1 | Sarah | done | done | done |
| series-1 | Marcus | open | done | open |
| series-2 | Priya | blocked | blocked | blocked |
| series-2 | Jon | done | done | done |
| series-3 | Amina | needs_review | done | needs_review |
| series-3 | Diego | open | missing | open |

## Safety cases covered

- Silence cannot produce a `done` verdict.
- Negated completion (`did not claim it was complete`) remains open.
- Ambiguous progress (`should be ready soon`) routes to `needs_review`.
- Explicit blocker language produces `blocked` with the exact source sentence.
- No evidence quote means no autonomous close.

## Scope and limitations

This is a six-item synthetic safety evaluation, not a claim of production accuracy. It is intentionally small, public, deterministic, and free to run. The highest-risk remaining failure mode is paraphrased or multilingual completion language outside the rules engine's patterns.
