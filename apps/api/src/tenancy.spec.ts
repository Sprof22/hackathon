import { ObjectLiteral, Repository } from "typeorm";
import { AppController } from "./app.controller";
import { ExtractionService, ReminderService, VerificationService } from "./agents";
import { AuthenticatedUser } from "./auth.guard";
import {
  ActionItem,
  ItemStatus,
  Meeting,
  NotificationDelivery,
  QaNotification,
  Reminder,
  Role,
  User,
} from "./entities";
import { NotificationService } from "./notifications";

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
    const reminders = repository<Reminder>();
    const qa = repository<QaNotification>();
    const deliveries = repository<NotificationDelivery>();
    const users = repository<User>();
    items.find.mockResolvedValue([]);
    meetings.count.mockResolvedValue(0);
    qa.find.mockResolvedValue([]);
    const controller = new AppController(
      meetings,
      items,
      reminders,
      qa,
      deliveries,
      users,
      {} as ExtractionService,
      {} as VerificationService,
      {} as ReminderService,
      {} as NotificationService
    );
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
    const meetings = repository<Meeting>();
    const items = repository<ActionItem>();
    const reminders = repository<Reminder>();
    const qa = repository<QaNotification>();
    const deliveries = repository<NotificationDelivery>();
    const users = repository<User>();
    const item = {
      id: "item-b",
      organizationId: "org-a",
      ownerEmail: null,
      status: ItemStatus.OPEN,
    } as ActionItem;
    items.findOneByOrFail.mockResolvedValue(item);
    items.save.mockResolvedValue(item);
    const controller = new AppController(
      meetings,
      items,
      reminders,
      qa,
      deliveries,
      users,
      {} as ExtractionService,
      {} as VerificationService,
      {} as ReminderService,
      {} as NotificationService
    );
    await controller.ownerEmail(tenant, "item-b", { email: "owner@customer.test" });
    expect(items.findOneByOrFail).toHaveBeenCalledWith({ id: "item-b", organizationId: "org-a" });
  });

  it("scopes action-item details and delivery history to the authenticated organization", async () => {
    const meetings = repository<Meeting>();
    const items = repository<ActionItem>();
    const reminders = repository<Reminder>();
    const qa = repository<QaNotification>();
    const deliveries = repository<NotificationDelivery>();
    const users = repository<User>();
    items.findOneByOrFail.mockResolvedValue({ id: "item-a" } as ActionItem);
    reminders.find.mockResolvedValue([]);
    deliveries.find.mockResolvedValue([]);
    const controller = new AppController(
      meetings,
      items,
      reminders,
      qa,
      deliveries,
      users,
      {} as ExtractionService,
      {} as VerificationService,
      {} as ReminderService,
      {} as NotificationService
    );
    await controller.itemDetail(tenant, "item-a");
    expect(items.findOneByOrFail).toHaveBeenCalledWith({ id: "item-a", organizationId: "org-a" });
    expect(reminders.find).toHaveBeenCalledWith({ where: { actionItemId: "item-a", organizationId: "org-a" }, order: { createdAt: "DESC" } });
    expect(deliveries.find).toHaveBeenCalledWith({ where: { actionItemId: "item-a", organizationId: "org-a" }, order: { createdAt: "DESC" } });
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
    const meetings = repository<Meeting>();
    const items = repository<ActionItem>();
    const reminders = repository<Reminder>();
    const qa = repository<QaNotification>();
    const deliveries = repository<NotificationDelivery>();
    const users = repository<User>();
    const reminder={id:"reminder-a",organizationId:"org-a",actionItemId:"item-a",recipientEmail:"owner@customer.test",subject:"Check in",emailBody:"How is this going?",approved:false} as Reminder;
    const delivery={id:"delivery-a",status:"captured"} as NotificationDelivery;
    reminders.findOneByOrFail.mockResolvedValue(reminder);reminders.save.mockResolvedValue(reminder);
    const notifications={sendEmail:jest.fn().mockResolvedValue(delivery)} as unknown as NotificationService;
    const controller=new AppController(meetings,items,reminders,qa,deliveries,users,{} as ExtractionService,{} as VerificationService,{} as ReminderService,notifications);
    await controller.approve(tenant,"reminder-a");
    expect(reminders.findOneByOrFail).toHaveBeenCalledWith({id:"reminder-a",organizationId:"org-a"});
    expect(notifications.sendEmail).toHaveBeenCalledWith("owner@customer.test","Check in","How is this going?","org-a",{actionItemId:"item-a",reminderId:"reminder-a"});
    expect(reminder.approvedBy).toBe("user-a");
  });
});
