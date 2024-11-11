import { Following, UpdatePatronProfileConnectionInput, UpdateStaffProfileConnectionInput } from '@swm-core/interfaces/following.interface';
import { Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();

const {
  API_SITWITHME_FOLLOWINGTABLE_NAME
} = process.env;

export class FollowingService {
  async get(staffID: string, patronID: string): Promise<Following> {
    return <Following>(await dynamoDBService.get({
      TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
      Key: { staffID, patronID },
    })).Item;
  }

  async updateStaffFollowingConnections(input: UpdateStaffProfileConnectionInput) {
    let lastEvalKey;
    do {
      try {
        // Get all explore profiles items
        const { Items, LastEvaluatedKey } = await dynamoDBService.query({
          TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
          KeyConditionExpression: '#staffID = :staffID',
          ExpressionAttributeNames: { '#staffID': 'staffID' },
          ExpressionAttributeValues: { ':staffID': input.staffID },
          ExclusiveStartKey: lastEvalKey
        });
        lastEvalKey = LastEvaluatedKey;

        if (!Items.length) {
          break;
        }

        // Put new connection change
        const putItems = Items.map((item: Partial<Following>) => {
          return {
            ...item,
            staffProfileConnection: input.staffProfileConnection
          }
        });
        console.log(JSON.stringify(putItems, null, 2));

        // Put item with new update connections
        await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGTABLE_NAME, putItems);
      } catch (e) {
        console.log('ERROR: ', e);
      }
    } while (lastEvalKey);
  }

  async updatePatronFollowingConnections(input: UpdatePatronProfileConnectionInput) {
    let lastEvalKey;
    do {
      try {
        // Get all explore profiles items
        const { Items, LastEvaluatedKey } = await dynamoDBService.query({
          TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
          IndexName: 'byPatronID',
          KeyConditionExpression: '#patronID = :patronID',
          ExpressionAttributeNames: { '#patronID': 'patronID' },
          ExpressionAttributeValues: { ':patronID': input.patronID },
          ExclusiveStartKey: lastEvalKey
        });
        lastEvalKey = LastEvaluatedKey;

        if (!Items.length) {
          break;
        }

        // Put new connection change
        const putItems = Items.map((item: Partial<Following>) => {
          return {
            ...item,
            patronProfileConnection: input.patronProfileConnection
          }
        });
        console.log(JSON.stringify(putItems, null, 2));

        // Put item with new update connections
        await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGTABLE_NAME, putItems);
      } catch (e) {
        console.log('ERROR: ', e);
      }
    } while (lastEvalKey);
  }

  async addFollowingProfileIDsToProfile(profileID: string, followingProfileID: string) {
    try {
      const existedProfile: Profile = await profileService.get(profileID);
      console.log('Start add followingProfileID to followingProfileIDs: ', JSON.stringify(existedProfile, null, 2));
      const followingProfileIDs = existedProfile?.followingProfileIDs?.values || [];
      if (existedProfile) {
        if (followingProfileID && !followingProfileIDs.find(i => i === followingProfileID)) {
          followingProfileIDs.push(followingProfileID);
        }
        console.log('Start create set followingProfileIDs: ', followingProfileIDs);
        await profileService.update(profileID, { followingProfileIDs: followingProfileIDs.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) : null });
      }
    } catch (e) {
      console.log("ERROR - addFollowingProfileIDsToProfile: ", JSON.stringify(e, null, 2));
      throw new Error(e);
    }
  }

  async removeFollowingProfileIDsFromProfile(profileID: string, followingProfileID: string) {
    try {
      const existedProfile: Profile = await profileService.get(profileID);
      console.log('Start remove followingProfileID to followingProfileIDs: ', JSON.stringify(existedProfile, null, 2));

      if (existedProfile) {
        const followingProfileIDs = existedProfile.followingProfileIDs?.values?.filter(i => i !== followingProfileID) || [];
        console.log('Start create set followingProfileIDs: ', followingProfileIDs);
        await profileService.update(profileID, { followingProfileIDs: followingProfileIDs.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) : null });
      }
    } catch (e) {
      console.log("ERROR - removeFollowingProfileIDsFromProfile: ", JSON.stringify(e, null, 2));
      throw new Error(e);
    }
  }

  async listFollowingConfirmedProfileID(profileID: string, role: UserRole): Promise<string[]> {
    if (role === UserRole.STAFF) {
      const following = await this.listFollowingConfirmedByStaffID(profileID);
      return following.map(item => item.patronID);
    }
    if (role === UserRole.PATRON) {
      const following = await this.listFollowingConfirmedByPatronID(profileID);
      return following.map(item => item.staffID);
    }
  }

  async listFollowingConfirmedByStaffID(staffID: string): Promise<Following[]> {
    let lastEvalKey;
    let followings: Following[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        KeyConditionExpression: '#staffID = :staffID',
        FilterExpression: 'attribute_exists(#confirmedAt) AND #confirmedAt <> :confirmedAt',
        ExpressionAttributeNames: {
          '#staffID': 'staffID',
          '#confirmedAt': 'confirmedAt'
        },
        ExpressionAttributeValues: {
          ':staffID': staffID,
          ':confirmedAt': null
        },
      };
      const { Items, LastEvaluatedKey }  = await dynamoDBService.query(params);
      lastEvalKey = LastEvaluatedKey;

      if (Items && Items.length > 0) {
        followings = [...followings, ...Items as Following[]];
      }
    } while (lastEvalKey);
    return followings;
  }

  async listFollowingConfirmedByPatronID(patronID: string): Promise<Following[]> {
    let lastEvalKey;
    let followings: Following[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        IndexName: 'byPatronID',
        ExclusiveStartKey: lastEvalKey,
        KeyConditionExpression: '#patronID = :patronID',
        FilterExpression: 'attribute_exists(#confirmedAt) AND #confirmedAt <> :confirmedAt',
        ExpressionAttributeNames: {
          '#patronID': 'patronID',
          '#confirmedAt': 'confirmedAt'
        },
        ExpressionAttributeValues: {
          ':patronID': patronID,
          ':confirmedAt': null
        }
      };
      const { Items, LastEvaluatedKey } = await dynamoDBService.query(params);
      lastEvalKey = LastEvaluatedKey;

      if (Items && Items.length > 0) {
        followings = [...followings, ...Items as Following[]];
      }
    } while (lastEvalKey);
    return followings;
  }

  async allSWMRequestedByPatronID(patronID: string): Promise<Following[]> {
    let lastEvalKey: any;
    let followings: Following[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        IndexName: 'byPatronID',
        ExclusiveStartKey: lastEvalKey,
        KeyConditionExpression: '#patronID = :patronID',
        FilterExpression: '#requestedBy = :requestedBy AND (attribute_not_exists(#confirmedAt) OR #confirmedAt = :confirmedAt)',
        ExpressionAttributeNames: {
          '#patronID': 'patronID',
          '#confirmedAt': 'confirmedAt',
          '#requestedBy': 'requestedBy'
        },
        ExpressionAttributeValues: {
          ':patronID': patronID,
          ':confirmedAt': null,
          ':requestedBy': patronID
        }
      };
      const { Items, LastEvaluatedKey } = await dynamoDBService.query(params);
      lastEvalKey = LastEvaluatedKey;

      if (Items && Items.length > 0) {
        followings = [...followings, ...Items as Following[]];
      }
    } while (lastEvalKey);
    return followings;
  }

  async allSWMRequestedByStaffID(staffID: string): Promise<Following[]> {
    let lastEvalKey: any;
    let followings: Following[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        KeyConditionExpression: '#staffID = :staffID',
        FilterExpression: '#requestedBy = :requestedBy AND (attribute_not_exists(#confirmedAt) OR #confirmedAt = :confirmedAt)',
        ExpressionAttributeNames: {
          '#staffID': 'staffID',
          '#confirmedAt': 'confirmedAt',
          '#requestedBy': 'requestedBy'
        },
        ExpressionAttributeValues: {
          ':staffID': staffID,
          ':confirmedAt': null,
          ':requestedBy': staffID
        }
      };
      const { Items, LastEvaluatedKey } = await dynamoDBService.query(params);
      lastEvalKey = LastEvaluatedKey;

      if (Items && Items.length > 0) {
        followings = [...followings, ...Items as Following[]];
      }
    } while (lastEvalKey);
    return followings;
  }

  async allFollowingByStaffID(staffID: string): Promise<Following[]> {
    let followings: Following[] = [];
    const params = {
      TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
      KeyConditionExpression: '#staffID = :staffID',
      ExpressionAttributeNames: {
        '#staffID': 'staffID'
      },
      ExpressionAttributeValues: {
        ':staffID': staffID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      followings = result as Following[];
    }

    return followings;
  }

  async allFollowingByPatronID(patronID: string): Promise<Following[]> {
    let followings: Following[] = [];
    const params = {
      TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
      IndexName: 'byPatronID',
      KeyConditionExpression: '#patronID = :patronID',
      ExpressionAttributeNames: {
        '#patronID': 'patronID'
      },
      ExpressionAttributeValues: {
        ':patronID': patronID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      followings = result as Following[];
    }

    return followings;
  }

  async delete(staffID: string, patronID: string): Promise<void> {
    await dynamoDBService.delete({
      TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
      Key: { staffID, patronID },
    });
  }

  batchDelete(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_FOLLOWINGTABLE_NAME,
      keys.map(key => ({ staffID: key.staffID, patronID: key.patronID })));
  }

  async deletePatronSWMRequest(patronID: string) {
    // 1. list all Patron SWM request
    const followings = await this.allSWMRequestedByPatronID(patronID);

    // 2. deleted SWM request
    if (followings.length) {
      await this.batchDelete(followings.map(f => ({ staffID: f.staffID, patronID: f.patronID }) ));
    }
  }

  async deleteStaffSWMRequest(staffID: string) {
    // 1. list all Staff SWM request
    const followings = await this.allSWMRequestedByStaffID(staffID);

    // 2. deleted SWM request
    if (followings.length) {
      await this.batchDelete(followings.map(f => ({ staffID: f.staffID, patronID: f.patronID }) ));
    }
  }
}
