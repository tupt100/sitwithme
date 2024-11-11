/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
	API_SITWITHME_PROFILETABLE_ARN
	API_SITWITHME_PROFILETABLE_NAME
	API_SITWITHME_USERNOTETABLE_ARN
	API_SITWITHME_USERNOTETABLE_NAME
	API_SITWITHME_USERTABLE_ARN
	API_SITWITHME_USERTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */// This is sample code. Please update this to suite your schema


import { PlatformException } from "@swm-core/exceptions/platform.exception";
import { UserNoteService } from "@swm-core/services/user-note.service";

const userNoteService = new UserNoteService();

const resolvers = {
  Query: {
    createNote: async (event: any) => {
      const { input } = event.arguments;
      return userNoteService.create(event.identity.claims["custom:id"], input);
    },
    updateNote: async (event: any) => {
      const { id, input } = event.arguments;
      return userNoteService.update(id, input);
    },
    deleteNote: async (event: any) => {
      const { id } = event.arguments;
      return userNoteService.delete(id);
    }
  }
};

export const handler = async (event: any) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
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