import { Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { ProfileService } from '@swm-core/services/profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();

const {
  API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME
} = process.env;

// fecth all current profile device token and migrate device token
// to remain profile
export const migrateProfileDeviceTokenToUser = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME,
        ExclusiveStartKey: lastEvalKey
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = [];
      for (const item of Items) {
        // find remain profile
        const profile = await profileService.get(item.profileID);
        if (profile) {
          let remainProfile: Profile;
          if (profile.role === UserRole.PATRON) {
            remainProfile = await profileService.getStaffByUserID(profile.userID);
          } else if (profile.role === UserRole.STAFF) {
            remainProfile = await profileService.getPatronByUserID(profile.userID);
          }

          if (remainProfile) {
            putItems.push({
              profileID: remainProfile.id,
              deviceToken: item.deviceToken,
              __typename: 'ProfileDeviceToken',
              createdAt: now,
              updatedAt: now
            });
          }
        }
      }

      if (putItems.length > 0) {
        await dynamoDBService.batchPut(API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME, putItems);
      }

      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};
