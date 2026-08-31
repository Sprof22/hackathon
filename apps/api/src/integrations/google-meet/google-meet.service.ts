import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { Repository } from "typeorm";
import { Role } from "../../auth/entities/user.entity";
import { AuthenticatedUser } from "../../common/auth/authenticated-user";
import { MeetingIngestionService } from "../../meetings/meeting-ingestion.service";
import { GoogleMeetConnection } from "./entities/google-meet-connection.entity";

const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.readonly";
const MEET_API = "https://meet.googleapis.com/v2";

type StoredTokens = { accessToken: string; refreshToken: string | null };
type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
type ConferenceRecord = {
  name: string;
  startTime: string;
  endTime?: string;
};
type Transcript = { name: string; state: string };
type TranscriptEntry = {
  participant: string;
  text: string;
  startTime: string;
};
type Participant = {
  name: string;
  signedinUser?: { displayName: string };
  anonymousUser?: { displayName: string };
  phoneUser?: { displayName: string };
};
type GoogleRequestContext = {
  operation: string;
  endpoint: string;
  organizationId: string;
  referenceId: string;
  correlationId?: string;
  startedAt: number;
};
type GoogleErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ reason?: string; domain?: string }>;
  };
};

export function completedConferenceRecords(records: ConferenceRecord[]): ConferenceRecord[] {
  return records.filter((record) => Boolean(record.endTime));
}

export function formatMeetTranscript(
  entries: TranscriptEntry[],
  participants: Participant[]
): string {
  const names = new Map(
    participants.map((participant) => [
      participant.name,
      participant.signedinUser?.displayName ??
        participant.anonymousUser?.displayName ??
        participant.phoneUser?.displayName ??
        "Participant",
    ])
  );
  return entries
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((entry) => `${names.get(entry.participant) ?? "Participant"}: ${entry.text.trim()}`)
    .filter((line) => !line.endsWith(": "))
    .join("\n");
}

@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);

  constructor(
    @InjectRepository(GoogleMeetConnection)
    private connections: Repository<GoogleMeetConnection>,
    private config: ConfigService,
    private jwt: JwtService,
    private ingestion: MeetingIngestionService
  ) {}

  configured() {
    return Boolean(
      this.config.get("GOOGLE_CLIENT_ID") &&
      this.config.get("GOOGLE_CLIENT_SECRET") &&
      this.config.get("GOOGLE_REDIRECT_URI")
    );
  }

  async status(organizationId: string) {
    const connection = await this.connections.findOneBy({ organizationId });
    return {
      configured: this.configured(),
      connected: Boolean(connection),
      googleEmail: connection?.googleEmail ?? null,
      lastImportedAt: connection?.lastImportedAt ?? null,
    };
  }

  authorizationUrl(user: AuthenticatedUser) {
    this.assertConfigured();
    if (user.role !== Role.OWNER)
      throw new ForbiddenException("Only an organization owner can connect Google Meet");
    const state = this.jwt.sign(
      { type: "google-meet-oauth", sub: user.sub, organizationId: user.organizationId },
      { expiresIn: "10m" }
    );
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
      redirect_uri: this.config.getOrThrow("GOOGLE_REDIRECT_URI"),
      response_type: "code",
      scope: `openid email ${MEET_SCOPE}`,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    return url.toString();
  }

  async connect(code: string, state: string) {
    this.assertConfigured();
    let identity: { type: string; sub: string; organizationId: string };
    try {
      identity = this.jwt.verify(state);
      if (identity.type !== "google-meet-oauth" || !identity.organizationId) throw new Error();
    } catch {
      throw new UnauthorizedException("Google connection request expired. Please try again.");
    }
    const tokenContext: GoogleRequestContext = {
      operation: "oauth.token.exchange",
      endpoint: "/token",
      organizationId: identity.organizationId,
      referenceId: randomUUID(),
      startedAt: Date.now(),
    };
    const tokenResponse = await this.googleFetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
          client_secret: this.config.getOrThrow("GOOGLE_CLIENT_SECRET"),
          redirect_uri: this.config.getOrThrow("GOOGLE_REDIRECT_URI"),
          grant_type: "authorization_code",
        }),
      },
      tokenContext
    );
    const token = await this.readGoogleResponse<GoogleTokenResponse>(tokenResponse, tokenContext);
    const existing = await this.connections.findOneBy({
      organizationId: identity.organizationId,
    });
    const previous = existing ? this.decrypt(existing.encryptedTokens) : null;
    const refreshToken = token.refresh_token ?? previous?.refreshToken ?? null;
    if (!refreshToken)
      throw new BadGatewayException(
        "Google did not return offline access. Reconnect and approve access."
      );
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    const profile = profileResponse.ok
      ? ((await profileResponse.json()) as { email?: string })
      : { email: undefined };
    const connection = this.connections.create({
      ...(existing ?? {}),
      organizationId: identity.organizationId,
      googleEmail: profile.email ?? existing?.googleEmail ?? null,
      encryptedTokens: this.encrypt({
        accessToken: token.access_token,
        refreshToken,
      }),
      tokenExpiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      scope: token.scope ?? MEET_SCOPE,
    });
    return this.connections.save(connection);
  }

  async disconnect(user: AuthenticatedUser) {
    if (user.role !== Role.OWNER)
      throw new ForbiddenException("Only an organization owner can disconnect Google Meet");
    await this.connections.delete({ organizationId: user.organizationId });
    return { connected: false };
  }

  async importLatest(user: AuthenticatedUser) {
    const importReferenceId = randomUUID();
    const importStartedAt = Date.now();
    this.log("google_meet.import_started", {
      referenceId: importReferenceId,
      organizationId: user.organizationId,
    });
    const connection = await this.connections.findOneBy({ organizationId: user.organizationId });
    if (!connection) throw new NotFoundException("Connect Google Meet before importing a meeting");
    const accessToken = await this.accessToken(connection);
    const records = await this.googleGetPaged<ConferenceRecord>(
      "conferenceRecords",
      "conferenceRecords",
      accessToken,
      { pageSize: "10" },
      user.organizationId,
      importReferenceId
    );
    const completedRecords = completedConferenceRecords(records);
    this.log("google_meet.conference_records_loaded", {
      referenceId: importReferenceId,
      organizationId: user.organizationId,
      recordCount: records.length,
      completedRecordCount: completedRecords.length,
    });
    let selected: { record: ConferenceRecord; transcript: Transcript } | null = null;
    for (const record of completedRecords) {
      const transcripts = await this.googleGetPaged<Transcript>(
        `${record.name}/transcripts`,
        "transcripts",
        accessToken,
        { pageSize: "10" },
        user.organizationId,
        importReferenceId
      );
      const transcript = transcripts.find((value) => value.state === "FILE_GENERATED");
      if (transcript) {
        selected = { record, transcript };
        break;
      }
    }
    if (!selected)
      throw new NotFoundException(
        "No completed Google Meet transcript was found. Make sure transcription was enabled during the meeting."
      );
    if (connection.lastImportedConferenceName === selected.record.name)
      throw new ConflictException("The latest Google Meet transcript has already been imported");
    const [entries, participants] = await Promise.all([
      this.googleGetPaged<TranscriptEntry>(
        `${selected.transcript.name}/entries`,
        "transcriptEntries",
        accessToken,
        { pageSize: "100" },
        user.organizationId,
        importReferenceId
      ),
      this.googleGetPaged<Participant>(
        `${selected.record.name}/participants`,
        "participants",
        accessToken,
        { pageSize: "250" },
        user.organizationId,
        importReferenceId
      ),
    ]);
    const transcript = formatMeetTranscript(entries, participants);
    if (transcript.length < 20)
      throw new NotFoundException("The latest Google Meet transcript did not contain enough text");
    const started = new Date(selected.record.startTime);
    const result = await this.ingestion.process(user, {
      title: `Google Meet — ${new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(started)}`,
      meetingDate: selected.record.startTime,
      transcript,
    });
    connection.lastImportedConferenceName = selected.record.name;
    connection.lastImportedAt = new Date();
    await this.connections.save(connection);
    this.log("google_meet.import_completed", {
      referenceId: importReferenceId,
      organizationId: user.organizationId,
      durationMs: Date.now() - importStartedAt,
      speakerCount: participants.length,
      transcriptEntryCount: entries.length,
    });
    return {
      ...result,
      source: "google_meet",
      speakers: participants.length,
      transcriptEntries: entries.length,
    };
  }

  private async accessToken(connection: GoogleMeetConnection) {
    const tokens = this.decrypt(connection.encryptedTokens);
    if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 60_000)
      return tokens.accessToken;
    if (!tokens.refreshToken)
      throw new UnauthorizedException("Google Meet access expired. Please reconnect.");
    const tokenContext: GoogleRequestContext = {
      operation: "oauth.token.refresh",
      endpoint: "/token",
      organizationId: connection.organizationId,
      referenceId: randomUUID(),
      startedAt: Date.now(),
    };
    const response = await this.googleFetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
          client_secret: this.config.getOrThrow("GOOGLE_CLIENT_SECRET"),
          grant_type: "refresh_token",
        }),
      },
      tokenContext
    );
    const token = await this.readGoogleResponse<GoogleTokenResponse>(response, tokenContext);
    connection.encryptedTokens = this.encrypt({
      accessToken: token.access_token,
      refreshToken: tokens.refreshToken,
    });
    connection.tokenExpiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000);
    await this.connections.save(connection);
    return token.access_token;
  }

  private async googleGetPaged<T>(
    path: string,
    field: string,
    accessToken: string,
    query: Record<string, string>,
    organizationId: string,
    correlationId: string
  ): Promise<T[]> {
    const results: T[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`${MEET_API}/${path}`);
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const context: GoogleRequestContext = {
        operation: `meet.${field}.list`,
        endpoint: this.redactGooglePath(url.pathname),
        organizationId,
        referenceId: randomUUID(),
        correlationId,
        startedAt: Date.now(),
      };
      const response = await this.googleFetch(
        url,
        { headers: { authorization: `Bearer ${accessToken}` } },
        context
      );
      const payload = await this.readGoogleResponse<Record<string, unknown>>(response, context);
      results.push(...((payload[field] as T[] | undefined) ?? []));
      pageToken = payload.nextPageToken as string | undefined;
    } while (pageToken);
    return results;
  }

  private async googleFetch(
    input: string | URL,
    init: RequestInit,
    context: GoogleRequestContext
  ) {
    try {
      return await fetch(input, init);
    } catch (error) {
      this.error("google_api.network_failed", {
        ...context,
        startedAt: undefined,
        durationMs: Date.now() - context.startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Google request failed",
      });
      throw new BadGatewayException({
        message: "Google Meet could not be reached",
        error: "Google API network request failed",
        referenceId: context.referenceId,
      });
    }
  }

  private async readGoogleResponse<T>(
    response: Response,
    context: GoogleRequestContext
  ): Promise<T> {
    const payload = (await response.json().catch(() => ({}))) as GoogleErrorPayload;
    const durationMs = Date.now() - context.startedAt;
    if (!response.ok) {
      const googleError = payload.error;
      this.error("google_api.request_failed", {
        ...context,
        startedAt: undefined,
        durationMs,
        upstreamStatus: response.status,
        googleCode: googleError?.code ?? null,
        googleStatus: googleError?.status ?? null,
        googleMessage: googleError?.message ?? null,
        googleReasons: googleError?.details
          ?.map((detail) => detail.reason)
          .filter((reason): reason is string => Boolean(reason)),
      });
      throw new BadGatewayException({
        message: googleError?.message ?? "Google Meet could not be reached",
        error: "Google API request failed",
        referenceId: context.referenceId,
        upstreamStatus: response.status,
      });
    }
    this.log("google_api.request_completed", {
      ...context,
      startedAt: undefined,
      durationMs,
      upstreamStatus: response.status,
    });
    return payload as T;
  }

  private redactGooglePath(path: string) {
    return path
      .replace(/conferenceRecords\/[^/]+/g, "conferenceRecords/{conferenceId}")
      .replace(/transcripts\/[^/]+/g, "transcripts/{transcriptId}")
      .replace(/participants\/[^/]+/g, "participants/{participantId}");
  }

  private log(event: string, fields: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, provider: "google", ...fields }));
  }

  private error(event: string, fields: Record<string, unknown>) {
    this.logger.error(JSON.stringify({ event, provider: "google", ...fields }));
  }

  private assertConfigured() {
    if (!this.configured())
      throw new ServiceUnavailableException(
        "Google Meet is not configured. Add the Google OAuth environment variables."
      );
  }

  private encryptionKey() {
    const source = this.config.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || this.config.get("JWT_SECRET");
    if (!source) throw new ServiceUnavailableException("Token encryption is not configured");
    return createHash("sha256").update(source).digest();
  }

  private encrypt(tokens: StoredTokens) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(tokens), "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((value) => value.toString("base64url"))
      .join(".");
  }

  private decrypt(value: string): StoredTokens {
    try {
      const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
      const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), iv);
      decipher.setAuthTag(tag);
      return JSON.parse(
        Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
      ) as StoredTokens;
    } catch {
      throw new UnauthorizedException(
        "Stored Google credentials could not be read. Please reconnect."
      );
    }
  }
}
