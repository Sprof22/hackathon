import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { StatusEvent } from "../action-items/entities/status-event.entity";
import { Role, User } from "../auth/entities/user.entity";
import { Meeting } from "../meetings/entities/meeting.entity";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { Reminder } from "../reminders/entities/reminder.entity";
import { Organization } from "./entities/organization.entity";

@Injectable()
export class OrganizationBootstrapService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Organization) private organizations: Repository<Organization>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(StatusEvent) private events: Repository<StatusEvent>,
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    @InjectRepository(QaNotification) private qa: Repository<QaNotification>,
    @InjectRepository(NotificationDelivery) private deliveries: Repository<NotificationDelivery>
  ) {}

  async onApplicationBootstrap() {
    let organization = await this.organizations.findOneBy({ slug: "loopclose-demo" });
    if (!organization) {
      try {
        organization = await this.organizations.save(
          this.organizations.create({ name: "LoopClose Demo", slug: "loopclose-demo" })
        );
      } catch {
        organization = await this.organizations.findOneByOrFail({ slug: "loopclose-demo" });
      }
    }
    const repositories = [
      this.users,
      this.meetings,
      this.items,
      this.events,
      this.reminders,
      this.qa,
      this.deliveries,
    ];
    for (const repository of repositories) {
      await repository
        .createQueryBuilder()
        .update()
        .set({ organizationId: organization.id })
        .where('"organizationId" IS NULL')
        .execute();
    }
    const ownerCount = await this.users.count({
      where: { organizationId: organization.id, role: Role.OWNER },
    });
    if (ownerCount === 0) {
      const firstUser = await this.users.findOne({
        where: { organizationId: organization.id },
        order: { createdAt: "ASC" },
      });
      if (firstUser) {
        firstUser.role = Role.OWNER;
        await this.users.save(firstUser);
      }
    }
  }
}
