import isEmail from 'validator/lib/isEmail';
import isEmpty from 'lodash/isEmpty';
import parsePhoneNumber from 'libphonenumber-js/mobile';

import { CognitoService } from '@swm-core/services/cognito.service';

const cognitoService = new CognitoService();

export const handler = async (event, context) => {

  console.info('Starting signup validation: ', event);
  const userAttributes = event.request.userAttributes;
  const email: string = userAttributes.email?.toLowerCase().trim();
  const preferredUsername: string = userAttributes.preferred_username?.trim();
  const givenName: string = userAttributes.given_name;
  const familyName: string = userAttributes.family_name;
  const phoneNumber: string = userAttributes.phone_number;

  /* Validate required fields */
  if (event.triggerSource === 'PreSignUp_SignUp') { // social user doesn't need validate some advance attributes
    if (!email) {
      throw new Error('Email is required');
    }

    if (!preferredUsername) {
      throw new Error('Username is required');
    }

    if (!givenName) {
      throw new Error('First name is required');
    }

    if (!familyName) {
      throw new Error('Last name is required');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    } else if (!parsePhoneNumber(phoneNumber, 'US')?.isPossible()) {
      throw new Error('This phone number is invalid');
    }
  }
  /* End validate required fields */

  // Validate email format
  if (email && !isEmail(email)) {
    console.error('Validation error: Invalid email format.');
    throw new Error('Invalid email format');
  };

  // Validate existed username. Usernames are case sensitive
  if (preferredUsername) {
    const existedCognitoUser = await cognitoService.getUserByUserName(event.userPoolId, preferredUsername);

    if (existedCognitoUser) {
      console.error('Existed username.', existedCognitoUser);
      throw new Error('Username is already existed');
    }
  }

  // Validate existed email
  if (email) {
    const existedCognitoEmail = await cognitoService.listUsersByEmail(event.userPoolId, email);

    if (!isEmpty(existedCognitoEmail.Users)) {
      console.error('Existed email address.', existedCognitoEmail);
      throw new Error('Email address is already existed');
    }
  }

  console.info('Finished signup validation: Succeed!', event);
};
