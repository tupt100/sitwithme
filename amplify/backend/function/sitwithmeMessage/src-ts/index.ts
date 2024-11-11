/* Amplify Params - DO NOT EDIT
	API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { BadRequestException } from "@swm-core/exceptions/bad-request.exception";
import { PlatformException } from "@swm-core/exceptions/platform.exception";
import { UserRole } from "@swm-core/interfaces/profile.interface";
import { FollowingService } from "@swm-core/services/following.service";
import { MessageService } from "@swm-core/services/message.service";
import { ProfileService } from "@swm-core/services/profile.service";

const messageService = new MessageService();
const profileService = new ProfileService();
const followingService = new FollowingService();

const resolvers = {
  Query: {
    listPatronsByBroadcastConversationID: async (event) => {
      const { id } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      return messageService.listPatronsByBroadcastConversationID(senderProfile.id, id, true);
    }
  },
  Mutation: {
    createBroadcastConversation: async (event) => {
      const { recipientProfileIDs, broadcastName } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      if (!recipientProfileIDs.length) {
        throw new BadRequestException("Broadcast must have at least one Patron");
      }
      const recipientProfiles = (await profileService.batchGet(recipientProfileIDs)).filter(p => p && p.role === UserRole.PATRON); // remove null / undefined profiles
      return messageService.createBroadcastConversation(senderProfile, recipientProfiles, broadcastName);
    },

    createBroadcastMessage: async (event) => {
      const { messageDetail, conversationID } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      return messageService.createBroadcastMessage(senderProfile, conversationID, messageDetail);
    },

    updateBroadcastConversation: async (event) => {
      const { id, broadcastName } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      await messageService.validateBroadcastConversation(senderProfile.id, id);
      return messageService.updateBroadcastConversation(id, { broadcastName });
    },

    createPatronsInBroadcastConversation: async (event) => {
      const { patronIDs, conversationID } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      const conversation = await messageService.validateBroadcastConversation(senderProfile.id, conversationID);
      await messageService.createPatronsInBroadcastConversation(conversation, patronIDs);
      return true;
    },

    updatePatronsInBroadcastConversation: async (event) => {
      const { patronIDs, conversationID } = event.arguments.input;
      const senderProfile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!senderProfile) {
        throw new BadRequestException("Staff not found");
      }
      if (!patronIDs.length) {
        throw new BadRequestException("Broadcast must have at least one Patron");
      }
      const conversation = await messageService.validateBroadcastConversation(senderProfile.id, conversationID);
      await messageService.updatePatronsInBroadcastConversation(conversation, patronIDs);
      return true;
    },

    sendMessage: async (event) => {
      const { messageDetail, recipientProfileID, role } = event.arguments.input;
      const senderProfile = await profileService.getProfileByUserID(event.identity.claims["custom:id"], role);
      if (!senderProfile) {
        throw new BadRequestException("Sender profile not found");
      }
      const recipientProfile = await profileService.get(recipientProfileID);
      if (!recipientProfile) {
        throw new BadRequestException("Recipient profile not found");
      }
      return messageService.sendMessage(senderProfile, recipientProfile, messageDetail);
    },

    createMessage: async (event) => {
      const { messageDetail, conversationID, role } = event.arguments.input;
      const senderProfile = await profileService.getProfileByUserID(event.identity.claims["custom:id"], role);
      if (!senderProfile) {
        throw new BadRequestException("Sender profile not found");
      }
      return messageService.sendMessageToConversation(senderProfile, conversationID, messageDetail);
    },
  }
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