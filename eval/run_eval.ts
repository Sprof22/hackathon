import fs from "node:fs";
import path from "node:path";
import { extractCommitmentsRules } from "../apps/api/src/commitment-extractor.ts";
import { classifyTranscript } from "../apps/api/src/classifier.ts";

type Outcome = "open" | "done" | "blocked" | "needs_review";
type GroundItem = { task: string; owner: string; outcome: Outcome };
type Series = { id: string; items: GroundItem[] };

const root = path.resolve(import.meta.dirname, "..");
const truth = JSON.parse(fs.readFileSync(path.join(root, "data/ground_truth.json"), "utf8")) as {
  series: Series[];
};
const threshold = 0.86;

function readTranscript(seriesId: string, meeting: 1 | 2) {
  return fs.readFileSync(
    path.join(root, "data/transcripts", `${seriesId}-meeting-${meeting}.txt`),
    "utf8"
  );
}

// Baseline: a stateless keyword pass over only the latest transcript. It has no stored
// commitments, confidence threshold, negation handling, or human-review state.
function baselineOutcomes(items: GroundItem[], transcript: string) {
  const lines = transcript.split("\n").map((line) => line.trim());
  return new Map(
    items.flatMap((item) => {
      const line = lines.find((candidate) =>
        candidate.toLowerCase().includes(item.owner.toLowerCase())
      );
      if (!line) return [];
      if (/\b(blocked|stuck|waiting on)\b/i.test(line)) return [[item.owner, "blocked"]] as const;
      if (/\b(done|finished|complete|completed|shipped|live|ready|resolved|merged)\b/i.test(line))
        return [[item.owner, "done"]] as const;
      return [];
    })
  );
}

function loopCloseOutcome(item: GroundItem, transcript: string): Outcome {
  const verdict = classifyTranscript({ task: item.task, ownerName: item.owner }, transcript);
  if (verdict.status === "done")
    return verdict.evidenceQuote && (verdict.confidence ?? 0) >= threshold
      ? "done"
      : "needs_review";
  return verdict.status;
}

const details: Array<{
  series: string;
  owner: string;
  expected: Outcome;
  baseline: Outcome | "missing";
  loopClose: Outcome;
}> = [];
let extracted = 0;
let expectedCommitments = 0;

for (const series of truth.series) {
  const initial = readTranscript(series.id, 1);
  const followUp = readTranscript(series.id, 2);
  const commitments = extractCommitmentsRules(initial);
  expectedCommitments += series.items.length;
  extracted += series.items.filter((item) =>
    commitments.some(
      (commitment) =>
        commitment.ownerName.toLowerCase() === item.owner.toLowerCase() &&
        item.task
          .toLowerCase()
          .split(/\W+/)
          .filter((term) => term.length > 3)
          .some((term) => commitment.task.toLowerCase().includes(term))
    )
  ).length;
  const baseline = baselineOutcomes(series.items, followUp);
  for (const item of series.items) {
    details.push({
      series: series.id,
      owner: item.owner,
      expected: item.outcome,
      baseline: (baseline.get(item.owner) as Outcome | undefined) ?? "missing",
      loopClose: loopCloseOutcome(item, followUp),
    });
  }
}

const baselineCorrect = details.filter((row) => row.baseline === row.expected).length;
const loopCloseCorrect = details.filter((row) => row.loopClose === row.expected).length;
const baselineUnsafeCloses = details.filter(
  (row) => row.baseline === "done" && row.expected !== "done"
).length;
const loopCloseUnsafeCloses = details.filter(
  (row) => row.loopClose === "done" && row.expected !== "done"
).length;
const percent = (value: number, total: number) => `${((value / total) * 100).toFixed(1)}%`;

const rows = details
  .map(
    (row) =>
      `| ${row.series} | ${row.owner} | ${row.expected} | ${row.baseline} | ${row.loopClose} |`
  )
  .join("\n");
const results = `# Evaluation results

Generated deterministically from the six checked-in synthetic commitments and their follow-up meetings. The baseline reads only the latest transcript and applies status keywords. LoopClose persists the initial commitments, requires attributable evidence, handles negation, applies a confidence threshold, and routes ambiguous completion language to review.

| Metric | Stateless baseline | LoopClose |
| --- | ---: | ---: |
| Initial commitments recovered | not retained | ${extracted}/${expectedCommitments} (${percent(extracted, expectedCommitments)}) |
| Correct final outcomes | ${baselineCorrect}/${details.length} (${percent(baselineCorrect, details.length)}) | ${loopCloseCorrect}/${details.length} (${percent(loopCloseCorrect, details.length)}) |
| Unsafe false closes | ${baselineUnsafeCloses} | ${loopCloseUnsafeCloses} |
| Missing final outcomes | ${details.filter((row) => row.baseline === "missing").length} | 0 |

## Per-item evidence

| Series | Owner | Expected | Baseline | LoopClose |
| --- | --- | --- | --- | --- |
${rows}

## Safety cases covered

- Silence cannot produce a \`done\` verdict.
- Negated completion (\`did not claim it was complete\`) remains open.
- Ambiguous progress (\`should be ready soon\`) routes to \`needs_review\`.
- Explicit blocker language produces \`blocked\` with the exact source sentence.
- No evidence quote means no autonomous close.

## Scope and limitations

This is a six-item synthetic safety evaluation, not a claim of production accuracy. It is intentionally small, public, deterministic, and free to run. The highest-risk remaining failure mode is paraphrased or multilingual completion language outside the rules engine's patterns.
`;

if (process.argv.includes("--baseline-only")) {
  console.log(
    `Stateless baseline: ${baselineCorrect}/${details.length} correct outcomes (${percent(baselineCorrect, details.length)}), ${baselineUnsafeCloses} unsafe false closes, ${details.filter((row) => row.baseline === "missing").length} missing outcomes.`
  );
} else {
  fs.writeFileSync(path.join(root, "eval/results.md"), results);
  console.log(
    `Evaluated ${details.length} outcomes: baseline ${baselineCorrect}/${details.length}, LoopClose ${loopCloseCorrect}/${details.length}; wrote eval/results.md`
  );
}
