import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ExtractedItem, extractCommitmentsRules } from "./commitment-extractor";

@Injectable()
export class ExtractionService {
  constructor(private config: ConfigService) {}

  async extract(transcript: string, meetingDate: Date): Promise<ExtractedItem[]> {
    if (this.config.get("LLM_PROVIDER") === "ollama") {
      try {
        return await this.ollama(transcript, meetingDate);
      } catch {
        // Deterministic fallback keeps local demos runnable without an LLM service.
      }
    }
    return extractCommitmentsRules(transcript);
  }

  private async ollama(transcript: string, meetingDate: Date): Promise<ExtractedItem[]> {
    const response = await fetch(
      `${this.config.get("OLLAMA_URL", "http://localhost:11434")}/api/chat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.config.get("OLLAMA_MODEL", "llama3.2"),
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content:
                "Extract only explicit commitments. Return JSON: {items:[{task,ownerName,ownerEmail,deadline,sourceQuote}]}. Never invent evidence.",
            },
            { role: "user", content: `Meeting date: ${meetingDate.toISOString()}\n${transcript}` },
          ],
        }),
      }
    );
    if (!response.ok) throw new Error("Ollama unavailable");
    const payload = (await response.json()) as { message: { content: string } };
    const parsed = JSON.parse(payload.message.content) as {
      items: Array<Record<string, string | null>>;
    };
    return parsed.items.map((value) => ({
      task: String(value.task),
      ownerName: String(value.ownerName),
      ownerEmail: value.ownerEmail,
      deadline: value.deadline ? new Date(value.deadline) : null,
      sourceQuote: String(value.sourceQuote),
    }));
  }
}
