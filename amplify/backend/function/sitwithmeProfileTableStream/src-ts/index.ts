/* Amplify Params - DO NOT EDIT
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_FOLLOWINGREPORTTABLE_ARN
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PROFILELEADERBOARDTABLE_ARN
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_STAFFLEADERBOARDTABLE_ARN
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import { OnboardingService } from '@swm-core/services/onboarding.service';
import { PostService } from '@swm-core/services/post.service';
import { GsiHash } from '@swm-core/interfaces/profile-leaderboard.interface';
import { ProfileLeaderboardService } from '@swm-core/services/profile-leaderboard.service';
import { SNSService } from '@swm-core/services/sns-service';
import { StaffLeaderboardService } from '@swm-core/services/staff-leaderboard.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { isArrayChanged } from '@swm-core/utils/comparison.util';
import { ProfileService } from '@swm-core/services/profile.service';
import { FollowingReportService } from '@swm-core/services/following-report.service';

const {
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const staffLeaderboardService = new StaffLeaderboardService();
const profileLeaderboardService = new ProfileLeaderboardService();
const exploreProfileService = new ExploreProfileService();
const snsService = new SNSService();
const postService = new PostService();
const onboardingService = new OnboardingService();
const profileService = new ProfileService();
const followingReportService = new FollowingReportService();

// notify to all followers
const notifyPresenceStatus = async (profile: Profile) => {
  try {
    const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.PROFILE_PRESENCE_STATUS, body: profile };
    await snsService.publish({
      Message: JSON.stringify(notificationSNSMessage),
      TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
    });
  } catch (e) {
    console.log('ERROR when notifyPresenceStatus - push notification: ', e);
  }
};

const insertRecordHandler = async (record: any) => {
  const profile: Profile = record.new;

  // 1. Sync to leaderboard
  if (profile.role === UserRole.STAFF) {
    await staffLeaderboardService.create({ staffID: profile.id, connectionCount: 0 });
  }
  const gsiHash = profile.role === UserRole.STAFF ? GsiHash.StaffLeaderboard : GsiHash.PatronLeaderboard;
  await profileLeaderboardService.create({ profileID: profile.id, connectionCount: 0, gsiHash });

  // 2. Handle privacy behavior
  if (profile.privacy) {
    // sync privacy to post table to prevent search Posts
    await postService.syncPrivacyToProfilePosts(profile.id, profile.privacy);
  }

  // 3. Sync to following report
  if (profile.role === UserRole.STAFF && profile.completedAt) {
    // Init report if staff finished onboarding
    await followingReportService.create({ staffID: profile.id });
  }
};

const updateRecordHandler = async (record: any) => {
  const oldProfile: Profile = record.old;
  const newProfile: Profile = record.new;

  // sync avatar updated
  if (exploreProfileService.canSyncProfileConnection(oldProfile, newProfile)) {
    // Currently, client app can get avatar from conversation -> profileConversations
    // await Promise.all([
    //   exploreProfileService.updateExploreProfileConnection({ profile: newProfile }),
    //   messageService.updateProfileConversationConnection({ profile: newProfile }),
    // ])
    await exploreProfileService.updateExploreProfileConnection({ profile: newProfile })
  }

  if (oldProfile.privacy !== newProfile.privacy) {
    // sync privacy to post table to prevent search Posts
    // or allow search Post
    await postService.syncPrivacyToProfilePosts(newProfile.id, newProfile.privacy);
  }

  // Send subscription when privacy change
  if (oldProfile.privacy !== newProfile.privacy || oldProfile.showInExplore !== newProfile.showInExplore) {
    await profileService.notifyChangePrivacy({
      profileID: newProfile.id,
      privacy: newProfile.privacy,
      showInExplore: newProfile.showInExplore,
    });
  }

  // Sync following profileIDs to post to handle privacy status
  if (isArrayChanged(oldProfile.followingProfileIDs?.values, newProfile.followingProfileIDs?.values)) {
    await postService.syncFollowingProfileIDsToPosts(newProfile.id, newProfile.followingProfileIDs);
  }

  // notify presence status
  if (oldProfile.presenceStatus !== newProfile.presenceStatus) {
    await notifyPresenceStatus(newProfile);
  }

  // Create patron profile if complete onboarding staff with no patron existed
  if (await onboardingService.canCreatePatronFromStaffProfile(oldProfile, newProfile)) {
    await onboardingService.createPatronFromStaffProfile(newProfile);
  }

  // Sync to following report
  if (newProfile.role === UserRole.STAFF && !oldProfile.completedAt && newProfile.completedAt) {
    // Init report if staff finished onboarding
    await followingReportService.create({ staffID: newProfile.id });
  }
};

const removeRecordHandler = async (record: any) => {
  const profile: Profile = record.old;
  if (profile.role === UserRole.STAFF) {
    await staffLeaderboardService.delete(profile.id);
  }

  await profileLeaderboardService.delete(profile.id);
};

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
          await updateRecordHandler(record);
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
