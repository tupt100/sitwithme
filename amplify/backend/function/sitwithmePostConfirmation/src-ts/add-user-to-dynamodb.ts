import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import { v4 as uuidv4 } from 'uuid';
import isEmpty from 'lodash/isEmpty';
import parsePhoneNumber from 'libphonenumber-js/mobile';

import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const cognitoIdentityServiceProvider: CognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });

// handle both normal user and social user
export const handler = async (event, context) => {
  console.info('Starting add user to DynamoDB', event);

  const dynamoDBService = new DynamoDBService();
  const userAttributes = event.request.userAttributes;
  let userItem: any = {
    __typename: 'User',
    id: uuidv4(),
    email: userAttributes.email?.toLowerCase().trim(), // social user maybe not have email
    phone: userAttributes.phone_number?.trim(),
    userName: userAttributes.preferred_username?.trim(),
    firstName: userAttributes.given_name,
    lastName: userAttributes.family_name,
    role: process.env.GROUP.toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  if (userItem.phone) {
    userItem.rawPhone = parsePhoneNumber(userItem.phone, 'US')?.number;
  }

  let cognitoUserAttributes = [
    {
      Name: 'custom:id',
      Value: userItem.id,
    },
  ];

  // In case user is existed, recover cognito id, username and email to avoid duplicating users.
  let existedUser: any;
  if (userItem.email) {
    existedUser = (await dynamoDBService.query({
      TableName: process.env.API_SITWITHME_USERTABLE_NAME,
      IndexName: 'byEmail',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': userItem.email,
      },
    })).Items[0];
  }

  console.log('existedUser: ', existedUser);
  if (!isEmpty(existedUser)) {
    userItem = {
      ...userItem,
      id: existedUser.id,
      email: existedUser.email,
      userName: existedUser.preferred_username,
      createdAt: existedUser.createdAt,
    };

    if (userItem.userName) {
      cognitoUserAttributes.push({ Name: 'preferred_username', Value: userItem.userName });
    }
  }

  if (userItem.email) {
    cognitoUserAttributes.push(
      { Name: 'email', Value: userItem.email },
      { Name: 'email_verified', Value: 'true' }
    );
  }

  if (userItem.phone) {
    cognitoUserAttributes.push(
      { Name: 'phone_number', Value: userItem.rawPhone || userItem.phone },
      { Name: 'phone_number_verified', Value: 'true' }
    );
  }

  // if (userAttributes['cognito:user_status'] === 'EXTERNAL_PROVIDER' && userAttributes.email) { // verify for social user
  //   cognitoUserAttributes.push({ Name: 'email_verified', Value: 'true' });
  // }

  console.info('User Item: ', userItem);
  const createdUser = await dynamoDBService.put({
    TableName: process.env.API_SITWITHME_USERTABLE_NAME,
    Item: userItem,
  });

  await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
    UserAttributes: cognitoUserAttributes,
    UserPoolId: event.userPoolId,
    Username: event.userName,
  }).promise();

  console.info('Finished adding user to DynamoDB', createdUser);
};
