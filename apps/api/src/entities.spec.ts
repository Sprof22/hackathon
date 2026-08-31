import { DataSource } from "typeorm";
import {
  ActionItem,
  Meeting,
  NotificationDelivery,
  Organization,
  QaNotification,
  Reminder,
  StatusEvent,
  User,
} from "./entities";

describe("Postgres entity metadata", () => {
  it("uses concrete database types for every decorated column", async () => {
    const entities = [
      Organization,
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
