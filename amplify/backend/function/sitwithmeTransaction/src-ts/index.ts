/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_ARN
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_TRANSACTIONHISTORYTABLE_ARN
  API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME
  API_SITWITHME_TRANSACTIONTABLE_ARN
  API_SITWITHME_TRANSACTIONTABLE_NAME
  ENV
  REGION
  ASSET_BASE_URL
Amplify Params - DO NOT EDIT */

import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { ProfileService } from '@swm-core/services/profile.service';
import { TransactionService } from '@swm-core/services/transaction.service';

const profileService = new ProfileService();
const transactionService = new TransactionService();

const resolvers = {
  Mutation: {
    validateReceipt: async (event) => {
      const { receipt, role } = event.arguments.input;

      const profile = await profileService.getStaffByUserID(event.identity.claims['custom:id']);
      if (!profile) {
        throw new BadRequestException('Staff does not existed');
      }
      return await transactionService.createReceipt({ profileID: profile.id, receipt });
    },
  },
};

exports.handler = async (event) => {
  console.info('Event: ', event);
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
        console.log('ERROR: ', e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
