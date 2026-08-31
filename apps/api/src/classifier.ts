export type ClassifierItem = { task: string; ownerName: string };
export type ClassifierVerdict = {
  status: "open" | "done" | "blocked";
  confidence: number | null;
  evidenceQuote: string | null;
};

export function classifyTranscript(item: ClassifierItem, transcript: string): ClassifierVerdict {
  const lines = transcript
    .split(/\n|(?<=[.!?])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const terms = item.task
    .toLowerCase()
    .split(/\W+/)
    .filter((v) => v.length > 3);
  const relevant = lines.filter(
    (line) =>
      terms.some((term) => line.toLowerCase().includes(term)) ||
      line.toLowerCase().includes(item.ownerName.toLowerCase())
  );
  const blocked = relevant.find((line) =>
    /\b(blocked|stuck|waiting on|can't finish|cannot finish)\b/i.test(line)
  );
  if (blocked) return { status: "blocked", confidence: 0.93, evidenceQuote: blocked };
  const done = relevant.find((line) =>
    /\b(done|finished|completed|shipped|live|resolved|merged)\b/i.test(line)
  );
  if (done) {
    const overlap =
      terms.filter((t) => done.toLowerCase().includes(t)).length / Math.max(terms.length, 1);
    return {
      status: "done",
      confidence: Math.min(0.98, 0.68 + overlap * 0.3),
      evidenceQuote: done,
    };
  }
  return { status: "open", confidence: null, evidenceQuote: relevant[0] ?? null };
}
