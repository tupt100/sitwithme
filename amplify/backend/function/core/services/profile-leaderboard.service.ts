import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ProfileLeaderboard, CreateProfileLeaderboardInput, ListProfilesSortByConnectionCountFilter, UpdateProfileLeaderboardInput } from '@swm-core/interfaces/profile-leaderboard.interface';
import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const {
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
} = process.env;

export class ProfileLeaderboardService {
  async listProfilesSortByConnectionCount(userID: string, filter: ListProfilesSortByConnectionCountFilter, limit: number) {
    const profiles = await profileService.listProfilesByUserID(userID);
    const blockedProfileIDs = profiles.flatMap(p => p.blockedProfileIDs?.values).filter(p => p);

    let profileLeaderboardRes: ProfileLeaderboard[] = [];
    let lastEvalKeyInput: { [key: string]: any };

    // Filter out blocked profile and continues find other profile until enough total response
    while (profileLeaderboardRes.length < limit) {
      const { profileLeaderboard, lastEvalKey } = await this.listByGsiHashSortByConnectionCount(filter.gsiHash, limit, lastEvalKeyInput);
      if (!profileLeaderboard.length) {
        break;
      }
      profileLeaderboardRes = [...profileLeaderboardRes, ...profileLeaderboard.filter(profile => !blockedProfileIDs.includes(profile.profileID))];
      if (!lastEvalKey || lastEvalKey && lastEvalKeyInput?.profileID === lastEvalKey.profileID) {
        break;
      }
      lastEvalKeyInput = lastEvalKey;
    }

    if (profileLeaderboardRes.length > limit) {
      profileLeaderboardRes.length = limit;
    }

    return { items: profileLeaderboardRes }
  }

  async listByGsiHashSortByConnectionCount(gsiHash: string, limit?: number, lastEvalKey?: { [key: string]: any }): Promise<{ profileLeaderboard: ProfileLeaderboard[], lastEvalKey }> {
    const params: DocumentClient.QueryInput = {
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      IndexName: 'sortByConnectionCount',
      KeyConditionExpression: '#gsiHash = :gsiHash',
      ExpressionAttributeNames: {
        '#gsiHash': 'gsiHash'
      },
      ExpressionAttributeValues: {
        ':gsiHash': gsiHash
      },
      ExclusiveStartKey: lastEvalKey,
      ScanIndexForward: false,
    };

    if (limit) {
      params.Limit = limit;
    }

    const { Items, LastEvaluatedKey } = await dynamoDBService.query(params);
    return {
      profileLeaderboard: Items as ProfileLeaderboard[],
      lastEvalKey: LastEvaluatedKey
    };
  }

  async get(profileID: string): Promise<ProfileLeaderboard> {
    return <ProfileLeaderboard>(await dynamoDBService.get({
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      Key: { profileID },
    })).Item;
  }

  async create(input: CreateProfileLeaderboardInput): Promise<ProfileLeaderboard> {
    const now = new Date().toISOString();
    const profileLeaderboard: ProfileLeaderboard = {
      ...input,
      __typename: 'ProfileLeaderboard',
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      Item: profileLeaderboard
    };
    await dynamoDBService.put(params);
    return profileLeaderboard;
  }

  async update(profileID: string, input: UpdateProfileLeaderboardInput): Promise<ProfileLeaderboard> {
    const rs = await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      Key: { profileID },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW"
    });
    return rs.Attributes as ProfileLeaderboard;
  }

  async updateConnectionCount(profileID: string, inc: number) {
    return dynamoDBService.update({
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      Key: { profileID },
      ...dynamoDBService.buildUpdateExpression({ 'ADD': { connectionCount: inc } }),
      ReturnValues: "UPDATED_NEW",
    });
  }

  async delete(profileID: string) {
    const params = {
      TableName: API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
      Key: { profileID }
    };
    await dynamoDBService.delete(params);
  }
}