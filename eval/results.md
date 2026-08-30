# Evaluation results

Generated from the checked-in synthetic ground truth. Run the API unit tests for behavioral verification.

| Metric | Baseline | LoopClose |
| --- | ---: | ---: |
| Ground-truth commitments | 6 | 6 |
| Cross-meeting status support | No | Yes |
| Evidence-required auto-close | No | Yes |
| Stale/blocked escalation | No | Yes |
| Human-gated owner email | No | Yes |

## Safety cases

- Silence cannot produce a `done` verdict.
- Completion without sufficient task overlap stays below the autonomous threshold.
- Blocker language produces `blocked` with the exact source sentence.
- No evidence quote means no autonomous close.
