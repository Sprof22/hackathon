import {
  completedConferenceRecords,
  formatMeetTranscript,
  GoogleMeetService,
} from "./google-meet.service";

describe("Google Meet transcript formatting", () => {
  it("orders entries and attributes speech to participant display names", () => {
    const transcript = formatMeetTranscript(
      [
        {
          participant: "conferenceRecords/1/participants/b",
          text: "I will publish the release notes.",
          startTime: "2026-08-31T09:01:00Z",
        },
        {
          participant: "conferenceRecords/1/participants/a",
          text: "The launch is ready.",
          startTime: "2026-08-31T09:00:00Z",
        },
      ],
      [
        {
          name: "conferenceRecords/1/participants/a",
          signedinUser: { displayName: "Ada Lovelace" },
        },
        {
          name: "conferenceRecords/1/participants/b",
          anonymousUser: { displayName: "Grace" },
        },
      ]
    );
    expect(transcript).toBe(
      "Ada Lovelace: The launch is ready.\nGrace: I will publish the release notes."
    );
  });
});

describe("Google Meet conference selection", () => {
  it("keeps only completed conference records without relying on an unsupported API filter", () => {
    expect(
      completedConferenceRecords([
        {
          name: "conferenceRecords/completed",
          startTime: "2026-08-31T09:00:00Z",
          endTime: "2026-08-31T09:30:00Z",
        },
        {
          name: "conferenceRecords/in-progress",
          startTime: "2026-08-31T10:00:00Z",
        },
      ])
    ).toEqual([
      {
        name: "conferenceRecords/completed",
        startTime: "2026-08-31T09:00:00Z",
        endTime: "2026-08-31T09:30:00Z",
      },
    ]);
  });
});

describe("Google Meet API diagnostics", () => {
  it("logs structured Google errors with safe request context", async () => {
    const service = new GoogleMeetService({} as never, {} as never, {} as never, {} as never);
    const logError = jest
      .spyOn((service as unknown as { logger: { error: (message: string) => void } }).logger, "error")
      .mockImplementation(() => undefined);
    const response = new Response(
      JSON.stringify({
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "Invalid filter was provided",
          details: [{ reason: "INVALID_FILTER" }],
        },
      }),
      { status: 400 }
    );

    await expect(
      (
        service as unknown as {
          readGoogleResponse: (response: Response, context: object) => Promise<unknown>;
        }
      ).readGoogleResponse(response, {
        operation: "meet.conferenceRecords.list",
        endpoint: "/v2/conferenceRecords",
        organizationId: "organization-1",
        referenceId: "request-1",
        correlationId: "import-1",
        startedAt: Date.now(),
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({ referenceId: "request-1", upstreamStatus: 400 }),
    });

    const entry = JSON.parse(logError.mock.calls[0][0]) as Record<string, unknown>;
    expect(entry).toMatchObject({
      event: "google_api.request_failed",
      provider: "google",
      operation: "meet.conferenceRecords.list",
      endpoint: "/v2/conferenceRecords",
      organizationId: "organization-1",
      referenceId: "request-1",
      correlationId: "import-1",
      upstreamStatus: 400,
      googleStatus: "INVALID_ARGUMENT",
      googleMessage: "Invalid filter was provided",
      googleReasons: ["INVALID_FILTER"],
    });
  });
});
