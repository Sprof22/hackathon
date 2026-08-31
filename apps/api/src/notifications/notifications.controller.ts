import { Controller, Get } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationDelivery } from "./entities/notification-delivery.entity";
import { QaNotification } from "./entities/qa-notification.entity";

@Controller()
export class NotificationsController {
  constructor(
    @InjectRepository(QaNotification) private qa: Repository<QaNotification>,
    @InjectRepository(NotificationDelivery) private deliveries: Repository<NotificationDelivery>
  ) {}

  @Get("qa-notifications")
  qaList(@CurrentUser() user: AuthenticatedUser) {
    return this.qa.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }

  @Get("notification-deliveries")
  deliveryList(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }
}
