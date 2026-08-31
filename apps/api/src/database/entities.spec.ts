import { DataSource } from "typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { StatusEvent } from "../action-items/entities/status-event.entity";
import { User } from "../auth/entities/user.entity";
import { GoogleMeetConnection } from "../integrations/google-meet/entities/google-meet-connection.entity";
import { Meeting } from "../meetings/entities/meeting.entity";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { Organization } from "../organizations/entities/organization.entity";
import { Reminder } from "../reminders/entities/reminder.entity";

describe("Postgres entity metadata", () => {
  it("uses concrete database types for every decorated column", async () => {
    const entities = [
      Organization,
      GoogleMeetConnection,
      User,
      Meeting,
      ActionItem,
      StatusEvent,
      Reminder,
      QaNotification,
      NotificationDelivery,
    ];
    const source = new DataSource({ type: "postgres", entities });
    await (source as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
    const actionItem = source.getMetadata(ActionItem);
    expect(actionItem.findColumnWithPropertyName("ownerUserId")?.type).toBe("uuid");
    expect(actionItem.findColumnWithPropertyName("ownerEmail")?.type).toBe("text");
    const delivery = source.getMetadata(NotificationDelivery);
    expect(delivery.findColumnWithPropertyName("actionItemId")?.type).toBe("uuid");
    expect(delivery.findColumnWithPropertyName("reminderId")?.type).toBe("uuid");
    for (const entity of entities.filter((value) => value !== Organization))
      expect(source.getMetadata(entity).findColumnWithPropertyName("organizationId")?.type).toBe(
        "uuid"
      );
  });
});
