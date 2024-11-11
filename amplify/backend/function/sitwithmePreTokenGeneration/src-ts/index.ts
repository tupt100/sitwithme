import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
const db = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', convertEmptyValues: true });

const findUserByEmail = async (email: string) => {
  return (await db.query({
    TableName: process.env.API_SITWITHME_USERTABLE_NAME,
    IndexName: 'byEmail',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  }).promise()).Items[0];
};

/**
 * Verify Email
 *
 * @param uuid UUID
 * @param userPoolId User Pool ID
 * @param email User Phone Number
 * @param uuid UUID in DB
 */
 const verifyCognitoAndLinkUser = async (userPoolId: string, uuid: string, email: string, preferredUsername?: string) => {
  const attrs = [
    { Name: 'custom:id', Value: uuid },
    { Name: 'email_verified', Value: 'true' }
  ];
  if (preferredUsername) {
    attrs.push({ Name: 'preferred_username', Value: preferredUsername });
  }
  return await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
    UserAttributes: attrs,
    UserPoolId: userPoolId,
    Username: email
  }).promise();
};

const createUser = async ({ id, email, userName, firstName, lastName, role }) => {
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;
  await db.put({
    TableName: process.env.API_SITWITHME_USERTABLE_NAME,
    Item: { id, email, userName, firstName, lastName, role, createdAt, updatedAt, __typename: 'User' },
  }).promise();
};

export const handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const customId = event.request.userAttributes['custom:id'];
  const { email, given_name: firstName, family_name: lastName, preferred_username: userName } = event.request.userAttributes;
  const groups = event.request.groupConfiguration.groupsToOverride;
  const role = groups.length ? groups[0].toUpperCase() : 'USER';

  let user: any;
  let id: string;
  if (event.triggerSource === 'TokenGeneration_NewPasswordChallenge') {
    if (email) {
      user = await findUserByEmail(email);
      id = user ? user.id : context.awsRequestId;

      // create new user, link and verify this email address if user doesn't exist
      if (!user) {
        await createUser({ id, email, userName, firstName, lastName, role });
        await verifyCognitoAndLinkUser(event.userPoolId, id, email);
      } else if (!customId) {
        // if cognito user have no custom:id, then re-link user from rds to cognito
        await verifyCognitoAndLinkUser(event.userPoolId, id, email, user.userName);
      }
    }
  }

  // Token should include new user attributes just verified
  if (id) {
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          'email_verified': true,
          'custom:id': id
        },
        claimsToSuppress: []
      }
    };
  }

  return event;
};
