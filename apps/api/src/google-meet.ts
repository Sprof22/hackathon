import {
  BadGatewayException,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Repository } from "typeorm";
import { AuthenticatedUser, CurrentUser, Public } from "./auth.guard";
import { GoogleMeetConnection, Role } from "./entities";
import { MeetingIngestionService } from "./meeting-ingestion";

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
type RedirectResponse = { redirect(status: number, url: string): void };

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
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
        client_secret: this.config.getOrThrow("GOOGLE_CLIENT_SECRET"),
        redirect_uri: this.config.getOrThrow("GOOGLE_REDIRECT_URI"),
        grant_type: "authorization_code",
      }),
    });
    const token = await this.readGoogleResponse<GoogleTokenResponse>(tokenResponse);
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
    const connection = await this.connections.findOneBy({ organizationId: user.organizationId });
    if (!connection) throw new NotFoundException("Connect Google Meet before importing a meeting");
    const accessToken = await this.accessToken(connection);
    const records = await this.googleGetPaged<ConferenceRecord>(
      "conferenceRecords",
      "conferenceRecords",
      accessToken,
      { pageSize: "10", filter: "end_time IS NOT NULL" }
    );
    let selected: { record: ConferenceRecord; transcript: Transcript } | null = null;
    for (const record of records) {
      const transcripts = await this.googleGetPaged<Transcript>(
        `${record.name}/transcripts`,
        "transcripts",
        accessToken,
        { pageSize: "10" }
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
        { pageSize: "100" }
      ),
      this.googleGetPaged<Participant>(
        `${selected.record.name}/participants`,
        "participants",
        accessToken,
        { pageSize: "250" }
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
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: tokens.refreshToken,
        client_id: this.config.getOrThrow("GOOGLE_CLIENT_ID"),
        client_secret: this.config.getOrThrow("GOOGLE_CLIENT_SECRET"),
        grant_type: "refresh_token",
      }),
    });
    const token = await this.readGoogleResponse<GoogleTokenResponse>(response);
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
    query: Record<string, string>
  ): Promise<T[]> {
    const results: T[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`${MEET_API}/${path}`);
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
      const payload = await this.readGoogleResponse<Record<string, unknown>>(response);
      results.push(...((payload[field] as T[] | undefined) ?? []));
      pageToken = payload.nextPageToken as string | undefined;
    } while (pageToken);
    return results;
  }

  private async readGoogleResponse<T>(response: Response): Promise<T> {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new BadGatewayException(payload.error?.message ?? "Google Meet could not be reached");
    return payload as T;
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

@Controller("integrations/google-meet")
export class GoogleMeetController {
  constructor(
    private googleMeet: GoogleMeetService,
    private config: ConfigService
  ) {}

  @Get("status")
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.googleMeet.status(user.organizationId);
  }

  @Get("auth-url")
  authUrl(@CurrentUser() user: AuthenticatedUser) {
    return { url: this.googleMeet.authorizationUrl(user) };
  }

  @Get("callback")
  @Public()
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") oauthError: string | undefined,
    @Res() response: RedirectResponse
  ) {
    const webOrigin = (this.config.get("WEB_ORIGIN", "http://localhost:3000") as string)
      .split(",")[0]
      .replace(/\/$/, "");
    if (oauthError || !code || !state) {
      response.redirect(302, `${webOrigin}/organization?googleMeet=cancelled`);
      return;
    }
    try {
      await this.googleMeet.connect(code, state);
      response.redirect(302, `${webOrigin}/organization?googleMeet=connected`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google connection failed";
      response.redirect(
        302,
        `${webOrigin}/organization?googleMeet=error&message=${encodeURIComponent(message)}`
      );
    }
  }

  @Post("import-latest")
  importLatest(@CurrentUser() user: AuthenticatedUser) {
    return this.googleMeet.importLatest(user);
  }

  @Delete()
  disconnect(@CurrentUser() user: AuthenticatedUser) {
    return this.googleMeet.disconnect(user);
  }
}
