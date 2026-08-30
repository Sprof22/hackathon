import { DataSource } from "typeorm";
import { ActionItem, Meeting, NotificationDelivery, QaNotification, Reminder, StatusEvent, User } from "./entities";

describe("Postgres entity metadata",()=>{
  it("uses concrete database types for every decorated column",async()=>{
    const source=new DataSource({type:"postgres",entities:[User,Meeting,ActionItem,StatusEvent,Reminder,QaNotification,NotificationDelivery]});
    await (source as unknown as {buildMetadatas():Promise<void>}).buildMetadatas();
    const actionItem=source.getMetadata(ActionItem);
    expect(actionItem.findColumnWithPropertyName("ownerUserId")?.type).toBe("uuid");
    expect(actionItem.findColumnWithPropertyName("ownerEmail")?.type).toBe("text");
  });
});
