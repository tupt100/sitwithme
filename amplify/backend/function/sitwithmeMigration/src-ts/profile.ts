import { Post, PostProfileConnection } from '@swm-core/interfaces/post.interface';
import { MemberShip, NotificationSettings, Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import { User } from '@swm-core/interfaces/user.interface';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const exploreProfileService = new ExploreProfileService();

const {
  API_SITWITHME_PROFILETABLE_NAME,
  API_SITWITHME_FOLLOWINGTABLE_NAME,
  API_SITWITHME_USERTABLE_NAME,
  API_SITWITHME_POSTTABLE_NAME
} = process.env;

export const initProfileSittingWithTotal = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_not_exists(sittingWithTotal)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = await Promise.all(Items.map(async (item: Profile) => {
        let params: any = {
          TableName: API_SITWITHME_FOLLOWINGTABLE_NAME
        };
        if (item.role == UserRole.STAFF) {
          params.KeyConditionExpression = '#staffID = :staffID';
          params.ExpressionAttributeNames = { '#staffID': 'staffID' };
          params.ExpressionAttributeValues = { ':staffID': item.id };
        } else {
          params.IndexName = 'byPatronID';
          params.KeyConditionExpression = '#patronID = :patronID';
          params.ExpressionAttributeNames = { '#patronID': 'patronID' };
          params.ExpressionAttributeValues = { ':patronID': item.id };
        }

        const { Items } = await dynamoDBService.query(params);
        const len = Items.filter((item) => item.confirmedAt).length;
        return {
          ...item,
          sittingWithTotal: len
        }
      }));

      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const addProfileNotificationSettings = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Profile items
      console.log('Scan Items: ', API_SITWITHME_PROFILETABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with notificationSettings is not existed
        FilterExpression: 'attribute_not_exists(notificationSettings)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const notificationSettings: NotificationSettings = {
        muteMessage: false,
        muteSWMRequest: false,
        muteAll: false,
      };

      // 2. Add notificationSettings if null
      const putItems = Items.map(item => {
        return {
          ...item,
          notificationSettings
        }
      });

      // 4. Put item with new prop notificationSettings
      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const initProfileMemberShip = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Patron Profile items
      console.log('Scan Items: ', API_SITWITHME_PROFILETABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with memberShip is not existed
        FilterExpression: 'attribute_not_exists(memberShip) AND #role = :role',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':role': UserRole.PATRON
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Add memberShip if null
      const putItems = Items.map(item => {
        return {
          ...item,
          memberShip: MemberShip.NONE,
        }
      });

      // 4. Put item with new prop memberShip
      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const syncUserToProfile = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items: ', API_SITWITHME_USERTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_USERTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);
      let profileItems: Profile[] = [];
      await Promise.all(Items.map(async user => {
        let profilesByUserID = await profileService.listProfilesByUserID(user.id);
        profilesByUserID = profilesByUserID.map((profile: Profile) => {
          return {
            ...profile,
            userConnection: {
              fullName: `${user.firstName} ${user.lastName}`,
              userLocation: user.userLocation ? {
                ...user.userLocation,
                geolocation: {
                  lat: user.userLocation.location.latitude,
                  lon: user.userLocation.location.longitude,
                },
              } : null,
            }
          }
        });

        profileItems = [...profileItems, ...profilesByUserID];
      }));

      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, profileItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}

export const initProfilePostCount = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_not_exists(postCount)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = await Promise.all(Items.map(async (item: Profile) => {
        let params: any = {
          TableName: API_SITWITHME_POSTTABLE_NAME,
          IndexName: 'byProfileSortByCreatedAt',
          KeyConditionExpression: '#profileID = :profileID',
          ExpressionAttributeNames: { '#profileID': 'profileID' },
          ExpressionAttributeValues: { ':profileID': item.id },
        };

        const { Items } = await dynamoDBService.query(params);
        return {
          ...item,
          postCount: Items?.length || 0,
        }
      }));

      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const updateProfileConnectionToPosts = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_POSTTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = await Promise.all(Items.map(async (item: Post) => {
        const profile = await profileService.get(item.profileID);
        if (profile) {
          const blockedProfileIDs = profile.blockedProfileIDs?.values;
          const followingProfileIDs = profile.followingProfileIDs?.values;

          return {
            ...item,
            profileConnection: {
              privacy: profile.privacy,
              blockedProfileIDs: blockedProfileIDs?.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) as PostProfileConnection['blockedProfileIDs'] : null,
              followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as PostProfileConnection['followingProfileIDs'] : null,
              deleted: profile.userConnection.deleted,
            },
            updatedAt: now
          }
        }
        return item;
      }));

      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};


/**
 * Add username info to Profile table at column: userConnection.
 * The main purpose is for searching by username
 */
export const addProfileUsername = async () => {
  // 1. Query all users
  let lastEvalKey: any;
  do {
    try {
      console.log('Scan Items: ', API_SITWITHME_USERTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_USERTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);
      let profileItems: Profile[] = [];
      const syncExploreProfileConnectionTasks: Promise<any>[] = [];

      // 2. Added username infor to this user profiles
      await Promise.all(Items.map(async user => {
        let profilesByUserID = await profileService.listProfilesByUserID(user.id);
        let hasStaff = false;
        profilesByUserID = profilesByUserID.map((profile: Profile) => {
          if (profile.role === UserRole.STAFF) {
            hasStaff = true;
          }
          return {
            ...profile,
            userConnection: {
              ...profile.userConnection,
              userName: user.userName,
            }
          }
        });

        profileItems = [...profileItems, ...profilesByUserID];

        if (hasStaff) {
          syncExploreProfileConnectionTasks.push(
            exploreProfileService.updateExploreProfileConnection({ user: user as User })
          );
        }
      }));

      // 3. Added username infor to explore profiles
      if (syncExploreProfileConnectionTasks.length) {
        await Promise.all(syncExploreProfileConnectionTasks);
      }


      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, profileItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};
