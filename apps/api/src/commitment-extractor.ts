export type ExtractedItem = {
  task: string;
  ownerName: string;
  ownerEmail: string | null;
  deadline: Date | null;
  sourceQuote: string;
};

export function extractCommitmentsRules(transcript: string): ExtractedItem[] {
  const lines = transcript
    .split(/\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((value) => value.trim())
    .filter(Boolean);
  const patterns = [
    /^(?:[-*]\s*)?([A-Z][\w'-]+)(?:\s+[A-Z][\w'-]+)?\s*:\s*(?:I(?:'ll| will)|will|to)\s+(.+?)[.!]?$/i,
    /^(?:[-*]\s*)?([A-Z][\w'-]+)(?:\s+[A-Z][\w'-]+)?\s+(?:said\s+)?(?:I(?:'ll| will)|will|owns|to)\s+(.+?)[.!]?$/i,
  ];
  return lines.flatMap((line) => {
    const match = patterns.map((pattern) => line.match(pattern)).find(Boolean);
    if (!match) return [];
    const [taskText, deadlineText] = match[2].replace(/[.!]$/, "").split(/\s+by\s+(?=\w)/i);
    const date = deadlineText ? new Date(deadlineText) : null;
    return [
      {
        task: taskText.replace(/^(finish|complete|handle)\s+/i, ""),
        ownerName: match[1],
        ownerEmail: null,
        deadline: date && !Number.isNaN(date.valueOf()) ? date : null,
        sourceQuote: line,
      },
    ];
  });
}
