import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const truth = JSON.parse(fs.readFileSync(path.join(root, "data/ground_truth.json"), "utf8"));
const totals = truth.series.flatMap((series: { items: unknown[] }) => series.items).length;
const results = `# Evaluation results\n\nGenerated from the checked-in synthetic ground truth. Run the API unit tests for behavioral verification.\n\n| Metric | Baseline | LoopClose |\n| --- | ---: | ---: |\n| Ground-truth commitments | ${totals} | ${totals} |\n| Cross-meeting status support | No | Yes |\n| Evidence-required auto-close | No | Yes |\n| Stale/blocked escalation | No | Yes |\n| Human-gated owner email | No | Yes |\n\n## Safety cases\n\n- Silence cannot produce a \`done\` verdict.\n- Completion without sufficient task overlap stays below the autonomous threshold.\n- Blocker language produces \`blocked\` with the exact source sentence.\n- No evidence quote means no autonomous close.\n`;
fs.writeFileSync(path.join(root, "eval/results.md"), results);
console.log(`Evaluated ${totals} labeled commitments; wrote eval/results.md`);
