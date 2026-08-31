import { Controller, Get } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Meeting } from "../meetings/entities/meeting.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";

@Controller("dashboard")
export class DashboardController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(QaNotification) private qa: Repository<QaNotification>
  ) {}

  @Get()
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = user.organizationId;
    const [items, meetings, qa] = await Promise.all([
      this.items.find({ where: { organizationId }, order: { createdAt: "DESC" } }),
      this.meetings.count({ where: { organizationId } }),
      this.qa.find({ where: { organizationId, read: false }, order: { createdAt: "DESC" } }),
    ]);
    return {
      items,
      meetings,
      qa,
      metrics: {
        open: items.filter((value) => value.status === "open").length,
        attention: items.filter((value) =>
          ["stale", "needs_review", "blocked"].includes(value.status)
        ).length,
        closed: items.filter((value) => value.status === "done").length,
      },
    };
  }
}
