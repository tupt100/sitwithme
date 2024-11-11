import { handler as addUserToDB } from './add-user-to-dynamodb';
import { handler as addUserToGroup } from './add-user-to-group';

export const handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    await Promise.all([
      addUserToGroup(event, context),
      addUserToDB(event, context),
    ]);
  }

  return event;
};
