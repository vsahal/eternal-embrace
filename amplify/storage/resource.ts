import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'scheduledMessagesFiles',
  access: (allow) => ({
    // 'uploads/{entity_id}/*': [
    'uploads/*': [
      // allow.entity('identity').to(['read', 'write', 'delete'])
      allow.authenticated.to(['read','write', 'delete']),
    ]
  })
});