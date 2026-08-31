import { classifyTranscript } from "./classifier";

describe("verification confidence gate", () => {
  const item = { task: "ship checkout retry fix", ownerName: "Sarah" };
  it("never marks silence done", () =>
    expect(classifyTranscript(item, "We discussed hiring and design updates.")).toEqual({
      status: "open",
      confidence: null,
      evidenceQuote: null,
    }));
  it("requires matching evidence for done", () => {
    const result = classifyTranscript(
      item,
      "Sarah: I finished the checkout retry fix and it is now shipped."
    );
    expect(result.status).toBe("done");
    expect(result.evidenceQuote).toContain("finished");
    expect(result.confidence).toBeGreaterThan(0.86);
  });
  it("recognizes blockers", () =>
    expect(
      classifyTranscript(
        item,
        "Sarah is blocked on the checkout retry fix while waiting on the API team."
      ).status
    ).toBe("blocked"));
  it("does not mistake a negated completion for done", () => {
    const result = classifyTranscript(
      { task: "publish the onboarding brief", ownerName: "Marcus" },
      "Marcus said the onboarding work is moving along, but did not claim it was complete."
    );
    expect(result.status).toBe("open");
    expect(result.evidenceQuote).toContain("did not claim");
  });
  it("routes ambiguous progress language below the autonomous threshold", () => {
    const result = classifyTranscript(
      { task: "finalize the pricing model", ownerName: "Amina" },
      "Amina: We made progress on pricing and it should be ready soon."
    );
    expect(result.status).toBe("done");
    expect(result.confidence).toBeLessThan(0.86);
    expect(result.evidenceQuote).toContain("ready soon");
  });
});
