import { formatMeetTranscript } from "./google-meet";

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
