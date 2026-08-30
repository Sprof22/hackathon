import { classifyTranscript } from "./classifier";

describe("verification confidence gate",()=>{
  const item={task:"ship checkout retry fix",ownerName:"Sarah"};
  it("never marks silence done",()=>expect(classifyTranscript(item,"We discussed hiring and design updates.")).toEqual({status:"open",confidence:null,evidenceQuote:null}));
  it("requires matching evidence for done",()=>{const result=classifyTranscript(item,"Sarah: I finished the checkout retry fix and it is now shipped.");expect(result.status).toBe("done");expect(result.evidenceQuote).toContain("finished");expect(result.confidence).toBeGreaterThan(.86);});
  it("recognizes blockers",()=>expect(classifyTranscript(item,"Sarah is blocked on the checkout retry fix while waiting on the API team.").status).toBe("blocked"));
});
