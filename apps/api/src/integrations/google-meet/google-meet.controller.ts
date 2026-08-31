import { Controller, Delete, Get, Post, Query, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser } from "../../common/auth/authenticated-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { GoogleMeetService } from "./google-meet.service";

type RedirectResponse = { redirect(status: number, url: string): void };

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
