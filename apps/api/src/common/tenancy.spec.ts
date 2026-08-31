import { ObjectLiteral, Repository } from "typeorm";
import { ActionItemsController } from "../action-items/action-items.controller";
import { ActionItem, ItemStatus } from "../action-items/entities/action-item.entity";
import { Role } from "../auth/entities/user.entity";
import { DashboardController } from "../dashboard/dashboard.controller";
import { Meeting } from "../meetings/entities/meeting.entity";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { NotificationService } from "../notifications/notification.service";
import { Reminder } from "../reminders/entities/reminder.entity";
import { ReminderService } from "../reminders/reminder.service";
import { RemindersController } from "../reminders/reminders.controller";
import { AuthenticatedUser } from "./auth/authenticated-user";

const tenant: AuthenticatedUser = {
  sub: "user-a",
  email: "owner@example.com",
  role: Role.OWNER,
  organizationId: "org-a",
};

const repository = <T extends ObjectLiteral>() =>
  ({
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    findOneByOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

describe("organization isolation", () => {
  it("scopes dashboard reads to the authenticated organization", async () => {
    const meetings = repository<Meeting>();
    const items = repository<ActionItem>();
    const qa = repository<QaNotification>();
    items.find.mockResolvedValue([]);
    meetings.count.mockResolvedValue(0);
    qa.find.mockResolvedValue([]);
    const controller = new DashboardController(meetings, items, qa);

    await controller.dashboard(tenant);

    expect(items.find).toHaveBeenCalledWith({
      where: { organizationId: "org-a" },
      order: { createdAt: "DESC" },
    });
    expect(meetings.count).toHaveBeenCalledWith({ where: { organizationId: "org-a" } });
    expect(qa.find).toHaveBeenCalledWith({
      where: { organizationId: "org-a", read: false },
      order: { createdAt: "DESC" },
    });
  });

  it("scopes direct record updates to the authenticated organization", async () => {
    const items = repository<ActionItem>();
    const reminders = repository<Reminder>();
    const deliveries = repository<NotificationDelivery>();
    const item = {
      id: "item-b",
      organizationId: "org-a",
      ownerEmail: null,
      status: ItemStatus.OPEN,
    } as ActionItem;
    items.findOneByOrFail.mockResolvedValue(item);
    items.save.mockResolvedValue(item);
    const controller = new ActionItemsController(
      items,
      reminders,
      deliveries,
      {} as ReminderService
    );

    await controller.updateOwnerEmail(tenant, "item-b", { email: "owner@customer.test" });

    expect(items.findOneByOrFail).toHaveBeenCalledWith({ id: "item-b", organizationId: "org-a" });
  });

  it("scopes action-item details and delivery history to the authenticated organization", async () => {
    const items = repository<ActionItem>();
    const reminders = repository<Reminder>();
    const deliveries = repository<NotificationDelivery>();
    items.findOneByOrFail.mockResolvedValue({ id: "item-a" } as ActionItem);
    reminders.find.mockResolvedValue([]);
    deliveries.find.mockResolvedValue([]);
    const controller = new ActionItemsController(
      items,
      reminders,
      deliveries,
      {} as ReminderService
    );

    await controller.detail(tenant, "item-a");

    expect(items.findOneByOrFail).toHaveBeenCalledWith({ id: "item-a", organizationId: "org-a" });
    expect(reminders.find).toHaveBeenCalledWith({
      where: { actionItemId: "item-a", organizationId: "org-a" },
      order: { createdAt: "DESC" },
    });
    expect(deliveries.find).toHaveBeenCalledWith({
      where: { actionItemId: "item-a", organizationId: "org-a" },
      order: { createdAt: "DESC" },
    });
  });

  it("scopes reminder drafting to the authenticated organization", async () => {
    const reminders = repository<Reminder>();
    const items = repository<ActionItem>();
    const item = {
      id: "item-a",
      organizationId: "org-a",
      ownerEmail: "owner@customer.test",
      ownerName: "Owner",
      task: "Ship release",
      sourceQuote: "I will ship the release",
    } as ActionItem;
    items.findOneByOrFail.mockResolvedValue(item);
    reminders.create.mockReturnValue({} as Reminder);
    reminders.save.mockResolvedValue({} as Reminder);
    const service = new ReminderService(reminders, items);

    await service.draft("item-a", "org-a");

    expect(items.findOneByOrFail).toHaveBeenCalledWith({ id: "item-a", organizationId: "org-a" });
    expect(reminders.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", actionItemId: "item-a" })
    );
  });

  it("links an approved delivery to the scoped reminder and action item", async () => {
    const reminders = repository<Reminder>();
    const reminder = {
      id: "reminder-a",
      organizationId: "org-a",
      actionItemId: "item-a",
      recipientEmail: "owner@customer.test",
      subject: "Check in",
      emailBody: "How is this going?",
      approved: false,
    } as Reminder;
    const delivery = { id: "delivery-a", status: "captured" } as NotificationDelivery;
    reminders.findOneByOrFail.mockResolvedValue(reminder);
    reminders.save.mockResolvedValue(reminder);
    const notifications = {
      sendEmail: jest.fn().mockResolvedValue(delivery),
    } as unknown as NotificationService;
    const controller = new RemindersController(reminders, notifications);

    await controller.approve(tenant, "reminder-a");

    expect(reminders.findOneByOrFail).toHaveBeenCalledWith({
      id: "reminder-a",
      organizationId: "org-a",
    });
    expect(notifications.sendEmail).toHaveBeenCalledWith(
      "owner@customer.test",
      "Check in",
      "How is this going?",
      "org-a",
      { actionItemId: "item-a", reminderId: "reminder-a" }
    );
    expect(reminder.approvedBy).toBe("user-a");
  });
});
