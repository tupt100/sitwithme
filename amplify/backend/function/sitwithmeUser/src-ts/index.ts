/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_JOBTABLE_ARN
  API_SITWITHME_JOBTABLE_NAME
  API_SITWITHME_MAILINGTABLE_ARN
  API_SITWITHME_MAILINGTABLE_NAME
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERCONFIRMATIONTABLE_ARN
  API_SITWITHME_USERCONFIRMATIONTABLE_NAME
  API_SITWITHME_USERPHOTOTABLE_ARN
  API_SITWITHME_USERPHOTOTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  AUTH_SITWITHME_USERPOOLID
  ENV
  REGION
Amplify Params - DO NOT EDIT */
import { CognitoUpdateUserAttributes } from '@swm-core/interfaces/cognito.interface';
import { InitUserInput, User } from '@swm-core/interfaces/user.interface';
import { UserService } from '@swm-core/services/user.service';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { AuthService } from '@swm-core/services/auth.service';

const {
  AUTH_SITWITHME_USERPOOLID,
  AWS_REGION,
  AWS_IOT_POLICY_NAME
} = process.env;

const userService = new UserService();
const authService = new AuthService();

const resolvers = {
  Mutation: {
    initUser: (event) => {
      return initUser(event);
    },

    enableUser: (event) => {
      const { id } = event.arguments.input;
      return userService.enableUser(id, AUTH_SITWITHME_USERPOOLID);
    },

    disableUser: (event) => {
      const { id } = event.arguments.input;
      return userService.disableUser(id, AUTH_SITWITHME_USERPOOLID);
    },

    softDeleteUser: (event: any) => {
      const { id } = event.arguments.input;
      return userService.softDeleteUser(id, getCognitoUpdateUserAttributes(event));
    },

    attachConnectPolicy: async (event) => {
      const { idToken } = event.arguments.input;
      const { cognitoIdentityId } = event.identity;

      // cognito jwt token auth
      await authService.verifyIdToken(idToken, AUTH_SITWITHME_USERPOOLID, AWS_REGION);
      return userService.attachConnectPolicy(cognitoIdentityId, AWS_IOT_POLICY_NAME);
    },

    confirmUser: (event) => {
      const { cognitoUsername, code } = event.arguments.input;
      return authService.confirmUser(cognitoUsername, code, AUTH_SITWITHME_USERPOOLID);
    },

    sendCodeToPhone: (event) => {
      const { cognitoUsername, phoneNumber } = event.arguments.input;
      return authService.sendSignUpCodeVerificationToPhone(cognitoUsername, phoneNumber);
    },

    sendCodeToEmail: (event) => {
      const { cognitoUsername, email } = event.arguments.input;
      return authService.sendSignUpCodeVerificationToEmail(cognitoUsername, email);
    },

    deleteMe: async (event: any) => {
      const userID = event.identity.claims['custom:id'];
      await userService.delete(userID, AUTH_SITWITHME_USERPOOLID);
      return true;
    }
  },

  Query: {
    validateEmailSignup: (event) => {
      return userService.validateEmailSignup(event.arguments.input, AUTH_SITWITHME_USERPOOLID);
    },

    validateUsernameSignup: (event) => {
      return userService.validateUsernameSignup(event.arguments.input, AUTH_SITWITHME_USERPOOLID);
    },

    validateUniqueEmail: (event) => {
      const cognitoParams: CognitoUpdateUserAttributes = getCognitoUpdateUserAttributes(event);
      return userService.validateUniqueEmail(event.arguments.input, cognitoParams);
    },

    validateUniqueUsername: (event) => {
      const cognitoParams: CognitoUpdateUserAttributes = getCognitoUpdateUserAttributes(event);
      return userService.validateUniqueUsername(event.arguments.input, cognitoParams);
    },

    findCognitoUsernameByEmail: (event) => {
      return userService.findCognitoUsernameByEmail(AUTH_SITWITHME_USERPOOLID, event.arguments.input);
    }
  }
};

/**
 * Init user happen when user signup with social account
 * User need to fill missing required info
 *
 * @param event Contains userID and InitUserInput
 * @returns User
 */
async function initUser(event): Promise<User> {
  console.info('Starting init user: ', event);
  const cognitoParams: CognitoUpdateUserAttributes = getCognitoUpdateUserAttributes(event);
  const userInput: InitUserInput = event.arguments.input;

  return userService.initUser(userInput, cognitoParams);
}

function getCognitoUpdateUserAttributes(event): CognitoUpdateUserAttributes {
  return {
    userId: event.identity.claims['custom:id'],
    userName: event.identity.claims['cognito:username'],
    userPoolId: AUTH_SITWITHME_USERPOOLID,
  };
}

export const handler = async (event) => {
  // event
  // {
  //   "typeName": "Query", /* Filled dynamically based on @function usage location */
  //   "fieldName": "me", /* Filled dynamically based on @function usage location */
  //   "arguments": { /* GraphQL field arguments via $ctx.arguments */ },
  //   "identity": { /* AppSync identity object via $ctx.identity */ },
  //   "source": { /* The object returned by the parent resolver. E.G. if resolving field 'Post.comments', the source is the Post object. */ },
  //   "request": { /* AppSync request object. Contains things like headers. */ },
  //   "prev": { /* If using the built-in pipeline resolver support, this contains the object returned by the previous function. */ },
  // }
  console.info('Event: ', JSON.stringify(event, null,2));
  const typeHandler = resolvers[event.typeName];
  if (typeHandler) {
    try {
      const resolver = typeHandler[event.fieldName];
      if (resolver) {
        return await resolver(event);
      }
    } catch (e) {
      if (e instanceof PlatformException) {
        const { message, errCode, errors } = e;
        return { error: { message, errCode, errors }};
      } else {
        console.log('ERROR: ', JSON.stringify(e, null, 2));
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
