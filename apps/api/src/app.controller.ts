import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  @Get()
  @Public()
  welcome() {
    return "Welcome to LoopClose v0.0.1";
  }

  @Get("health")
  @Public()
  health() {
    return { status: "ok", service: "loopclose-api" };
  }
}
