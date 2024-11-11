/* Amplify Params - DO NOT EDIT
  API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_FOLLOWINGREPORTTABLE_ARN
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MAILINGTABLE_ARN
  API_SITWITHME_MAILINGTABLE_NAME
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILEDEVICETOKENTABLE_ARN
  API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME
  API_SITWITHME_PROFILELEADERBOARDTABLE_ARN
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
  API_SITWITHME_PROFILERECENTVIEWTABLE_ARN
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_STAFFLEADERBOARDTABLE_ARN
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_TRANSACTIONTABLE_ARN
  API_SITWITHME_TRANSACTIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_VENUEFAVORITETABLE_ARN
  API_SITWITHME_VENUEFAVORITETABLE_NAME
  API_SITWITHME_VENUEFAVORITEV2TABLE_ARN
  API_SITWITHME_VENUEFAVORITEV2TABLE_NAME
  API_SITWITHME_VENUELEADERBOARDTABLE_ARN
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { removeInvalidConversation } from './conversation';
import { addFollowingProfileIDsToProfile } from './following';
import { initProfileLeaderboard } from './leaderboard';
import { addMuteUntil, addTotalMessage } from './message';
import { initNotificationCompositeSortKey, removeInvalidSWMNotifs, updateShiftAlert } from './notification';
import { updateDefaultProfileOnboardingStep } from './onboarding';
import { initPostType } from './post';
import { initProfileMemberShip, addProfileNotificationSettings, initProfileSittingWithTotal, syncUserToProfile, initProfilePostCount, updateProfileConnectionToPosts, addProfileUsername } from './profile';
import { migrateProfileDeviceTokenToUser } from './profile-devicetoken';
import { addShiftGeolocation, migrateShiftAlert, syncShiftToExploreProfile } from './shift';
import { initStaffLeaderboard } from './staff-leaderboard';
import { removeReceiptInTransaction } from './transaction';
import { migrateVenueFavoriteToV2 } from './venue-favorite';
import { addYelpCategories } from './workplace';
import { updateDefaultFollowingRequestedBy } from './following';
import { updateExpiredAtTTLToSecond } from './mailing';
import { addLocationToVenueLeaderboard } from './venue-leaderboard';
import { updateBirthdayIndex } from './user';
import { initProfileRecentView } from './profile-recent-view';
import { initFollowingReport, migrateFollowingReport } from './following-report';

const migrationFunctions = {
  migrateProfileOnboardingStep: async (onboardingStepInput) => {
    console.log('Start migration onboarding step', onboardingStepInput);
    await updateDefaultProfileOnboardingStep(onboardingStepInput);
  },
  migrateStaffLeaderboard: async () => {
    await initStaffLeaderboard();
  },
  migrateShiftGeoLocation: async () => {
    console.log('Start migration shift geolocation');
    await addShiftGeolocation();
  },
  syncShiftToExploreProfile: async () => {
    await syncShiftToExploreProfile();
  },
  migrateWorkplaceYelpCategories: async () => {
    await addYelpCategories();
  },
  migrateProfileConversationMuteUntil: async () => {
    await addMuteUntil();
  },
  removeInvalidSWMNotifs: async () => {
    await removeInvalidSWMNotifs();
  },
  migrateProfileConversationTotalMessage: async () => {
    await addTotalMessage();
  },
  initProfileSittingWithTotal: async () => {
    await initProfileSittingWithTotal();
  },
  removeInvalidConversation: async () => {
    await removeInvalidConversation();
  },
  addProfileNotificationSettings: async () => {
    await addProfileNotificationSettings();
  },
  updateShiftAlert: async () => {
    await updateShiftAlert();
  },
  initNotificationCompositeSortKey: async () => {
    await initNotificationCompositeSortKey();
  },
  initProfileMemberShip: async () => {
    await initProfileMemberShip();
  },
  removeReceiptInTransaction: async () => {
    await removeReceiptInTransaction();
  },
  initPostType: async () => {
    await initPostType();
  },
  syncUserToProfile: async () => {
    await syncUserToProfile();
  },
  migrateProfileLeaderboard: async () => {
    await initProfileLeaderboard();
  },
  migrateVenueFavoriteToV2: async () => {
    await migrateVenueFavoriteToV2();
  },
  addFollowingProfileIDsToProfile: async () => {
    await addFollowingProfileIDsToProfile();
  },
  migrateProfileDeviceTokenToUser: async () => {
    await migrateProfileDeviceTokenToUser();
  },
  updateDefaultFollowingRequestedBy: async () => {
    await updateDefaultFollowingRequestedBy();
  },
  updateExpiredAtTTLToSecond: async () => {
    await updateExpiredAtTTLToSecond();
  },
  initProfilePostCount: async () => {
    await initProfilePostCount();
  },
  addLocationToVenueLeaderboard: async () => {
    await addLocationToVenueLeaderboard();
  },
  updateProfileConnectionToPosts: async () => {
    await updateProfileConnectionToPosts();
  },
  updateBirthdayIndex: async () => {
    await updateBirthdayIndex();
  },
  initProfileRecentView: async () => {
    await initProfileRecentView();
  },
  migrateShiftAlert: async () => {
    await migrateShiftAlert();
  },
  migrateProfileUsername: async () => {
    await addProfileUsername();
  },
  initFollowingReport: async () => {
    await initFollowingReport();
  },
  migrateFollowingReport: async () => {
    await migrateFollowingReport();
  }
}

export const handler = async (event) => {
  // event
  // {
  //   "method": "MethodName", /* Migration function name */
  //   "arguments": { /* Input data for migration */ },
  // }
  console.info('Event: ', event);
  const migrateFunction = migrationFunctions[event.method];
  if (migrateFunction) {
    try {
      return await migrateFunction(event.arguments);
    } catch (e) {
      console.log('Migration failed: ', e);
      throw new Error('Migration failed');
    }
  }
  throw new Error('Resolver not found.');
};
