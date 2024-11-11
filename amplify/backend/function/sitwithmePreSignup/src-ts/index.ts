/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
	API_SITWITHME_USERCONFIRMATIONTABLE_ARN
	API_SITWITHME_USERCONFIRMATIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */
import { AuthService } from '@swm-core/services/auth.service';
import { handler as validateUserInput } from './validate-user-input';

const authService = new AuthService();

export const handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (event.triggerSource === 'PreSignUp_SignUp' || event.triggerSource === 'PreSignUp_ExternalProvider') {
    await validateUserInput(event, context);

    if (event.triggerSource === 'PreSignUp_SignUp') {
      const userAttributes = event.request.userAttributes;
      const phoneNumber: string = userAttributes.phone_number;

      // send SMS to user
      if (phoneNumber) {
        await authService.sendSignUpCodeVerificationToPhone(event.userName, phoneNumber);
      }
    }
  }

  return event;
};
