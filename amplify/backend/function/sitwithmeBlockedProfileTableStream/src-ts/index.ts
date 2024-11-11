/* Amplify Params - DO NOT EDIT
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILERECENTVIEWTABLE_ARN
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { ProfileConversation } from '@swm-core/interfaces/message.interface';
import { FollowingService } from '@swm-core/services/following.service';
import { MessageService } from '@swm-core/services/message.service';
import { NotificationService } from '@swm-core/services/notification.service';
import { PostService } from '@swm-core/services/post.service';
import { ProfileRecentViewService } from '@swm-core/services/profile-recent-view.service';
import { ProfileService } from '@swm-core/services/profile.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const followingService = new FollowingService();
const messageService = new MessageService();
const profileService = new ProfileService();
const notificationService = new NotificationService();
const postService = new PostService();
const profileRecentViewService = new ProfileRecentViewService();

const insertRecordHandler = async (record: any) => {
  const { profileID, blockedProfileID } = record.new;

  await Promise.all([
    leaveFollowing(profileID, blockedProfileID),
    deleteProfileConversation(profileID, blockedProfileID),
    addBlockedProfileToProfile(profileID, blockedProfileID),
    addBlockedProfileToPost(profileID, blockedProfileID),
    deleteNotification(profileID, blockedProfileID),
    removeBlockedProfileFromProfileRecentView(profileID, blockedProfileID),
    sendBlockProfileNotification(profileID, blockedProfileID),
  ]);

};

const removeRecordHandler = async (record: any) => {
  const { profileID, blockedProfileID } = record.old;
  await Promise.all([
    removeBlockedProfileToProfile(profileID, blockedProfileID),
    removeBlockedProfileToPost(profileID, blockedProfileID),
  ]);
};

const sendBlockProfileNotification = async (profileID: string, blockedProfileID: string) => {
  console.log('#6: Start send blockProfileID notification');
  await Promise.all([
    profileService.notifyBlockProfile({ recipientProfileID: profileID, profileID: blockedProfileID }),
    profileService.notifyBlockProfile({ recipientProfileID: blockedProfileID, profileID: profileID }),
  ]);
}

const leaveFollowing = async (profileID: string, blockedProfileID: string) => {
  console.log('#1: Start leave Following');
  const existedFollowing = await followingService.get(profileID, blockedProfileID) || await followingService.get(blockedProfileID, profileID);
  if (existedFollowing) {
    await followingService.delete(existedFollowing.staffID, existedFollowing.patronID);
  }
}

const deleteProfileConversation = async (profileID: string, blockedProfileID: string) => {
  console.log('#2: Start delete Conversation');
  const profileConversations: ProfileConversation[] = await messageService.listProfileConversationsByParticipants(profileID, blockedProfileID);
  console.log('Start delete profile conversation, ', JSON.stringify(profileConversations, null, 2));
  await Promise.all(profileConversations.map(async (profileConversation) => {
    await messageService.updateProfileConversation(
      profileConversation.profileID,
      profileConversation.conversationID, {
      deletedAt: new Date().toISOString()
    })
  }));
}

const addBlockedProfileToProfile = async (profileID: string, blockedProfileID: string) => {
  console.log('#3: Start add blockedProfileID to Profile');
  await Promise.all([
    profileService.addBlockedProfiles(profileID, blockedProfileID),
    profileService.addBlockedProfiles(blockedProfileID, profileID)
  ]);
}

const addBlockedProfileToPost = async (profileID: string, blockedProfileID: string) => {
  console.log('#5: Start add blockedProfileID to Post');
  await Promise.all([
    postService.addBlockedProfileToConnection(profileID, blockedProfileID),
    postService.addBlockedProfileToConnection(blockedProfileID, profileID)
  ]);
}

const removeBlockedProfileToProfile = async (profileID: string, blockedProfileID: string) => {
  console.log('#1: Start remove blockedProfileID from Profile');
  await Promise.all([
    profileService.removeBlockedProfiles(profileID, blockedProfileID),
    profileService.removeBlockedProfiles(blockedProfileID, profileID)
  ]);
}

const removeBlockedProfileFromProfileRecentView = async (profileID: string, blockedProfileID: string) => {
  console.log('Start remove profile from profile recent view');
  await profileRecentViewService.deleteProfileRecentViewsTogether(profileID, blockedProfileID);
}

const removeBlockedProfileToPost = async (profileID: string, blockedProfileID: string) => {
  console.log('#2: Start remove blockedProfileID from Post');
  await Promise.all([
    postService.removeBlockedProfileToConnection(profileID, blockedProfileID),
    postService.removeBlockedProfileToConnection(blockedProfileID, profileID)
  ]);
}

const deleteNotification = async (profileID: string, blockedProfileID: string) => {
  console.log('#4: Start delete Notification');
  await Promise.all([
    notificationService.deleteNotificationBySenderProfileID(profileID, blockedProfileID),
    notificationService.deleteNotificationBySenderProfileID(blockedProfileID, profileID),
  ]);
}

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  const errors = [];

  const records = event.Records.map(record => ({
    eventName: record.eventName,
    new: DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
    old: DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
  }));

  console.info('records: ', JSON.stringify(records, null, 2));

  for (const record of records) {
    try {
      switch (record.eventName) {
        case 'INSERT':
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
