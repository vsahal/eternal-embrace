import { defineStorage } from '@aws-amplify/backend';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../data/resource.ts";


const client = generateClient<Schema>();

export const storage = defineStorage({
  name: 'scheduledMessagesFiles',
  access: (allow) => ({
    'uploads/{entity_id}/*': [
    // 'uploads/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ]
  })
});

export const checkExistingMessage = async (userEmail: string, date: string) => {
  const existingMessages = await client.models.ScheduledMessage.list({
    filter: { userEmail: { eq: userEmail }, scheduleDate: { eq: date } },
  });
  return existingMessages.data.length > 0;
};

export const saveScheduledMessage = async (message: any, id?: string) => {
  if (id) {
    return client.models.ScheduledMessage.update({ id, ...message });
  }
  return client.models.ScheduledMessage.create(message);
};