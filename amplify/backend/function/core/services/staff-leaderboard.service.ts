import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ListStaffsSortByConnectionCountInput } from '@swm-core/interfaces/profile.interface';
import { StaffLeaderboard, CreateStaffLeaderboardInput } from '@swm-core/interfaces/staff-leaderboard.interface';
import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const {
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
} = process.env;

export class StaffLeaderboardService {
  async listStaffsSortByConnectionCount(userID: string, filter: ListStaffsSortByConnectionCountInput, limit: number) {
    const patronProfile = await profileService.getPatronByUserID(userID);
    if (!patronProfile) {
      throw new BadRequestException('Patron does not existed');
    }

    const blockedProfileIDs = patronProfile.blockedProfileIDs;
    let staffLeaderboardRes: StaffLeaderboard[] = [];
    let lastEvalKeyInput: { [key: string]: any };

    // Filter out blocked profile and continues find other profile until enough total response
    while (staffLeaderboardRes.length < limit) {
      const { staffLeaderboard, lastEvalKey } = await this.listByGsiHashSortByConnectionCount(filter.gsiHash, limit, lastEvalKeyInput);
      if (!staffLeaderboard.length) {
        break;
      }
      staffLeaderboardRes = [...staffLeaderboardRes, ...staffLeaderboard.filter(profile => !blockedProfileIDs?.values?.includes(profile.staffID))];
      if (!lastEvalKey || lastEvalKey && lastEvalKeyInput?.staffID === lastEvalKey.staffID) {
        break;
      }
      lastEvalKeyInput = lastEvalKey;
    }

    if (staffLeaderboardRes.length > limit) {
      staffLeaderboardRes.length = limit;
    }

    return { items: staffLeaderboardRes }
  }

  async listByGsiHashSortByConnectionCount(gsiHash: string, limit?: number, lastEvalKey?: { [key: string]: any }): Promise<{ staffLeaderboard: StaffLeaderboard[], lastEvalKey }> {
    const params: DocumentClient.QueryInput = {
      TableName: API_SITWITHME_STAFFLEADERBOARDTABLE_NAME,
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
      staffLeaderboard: Items as StaffLeaderboard[],
      lastEvalKey: LastEvaluatedKey
    };
  }

  async get(staffID: string): Promise<StaffLeaderboard> {
    return <StaffLeaderboard>(await dynamoDBService.get({
      TableName: API_SITWITHME_STAFFLEADERBOARDTABLE_NAME,
      Key: { staffID },
    })).Item;
  }

  async create(input: CreateStaffLeaderboardInput): Promise<StaffLeaderboard> {
    const now = new Date().toISOString();
    const staffLeaderboard: StaffLeaderboard = {
      ...input,
      __typename: 'StaffLeaderboard',
      gsiHash: 'StaffLeaderboard',
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_STAFFLEADERBOARDTABLE_NAME,
      Item: staffLeaderboard
    };
    await dynamoDBService.put(params);
    return staffLeaderboard;
  }

  async updateConnectionCount(staffID: string, inc: number) {
    return dynamoDBService.update({
      TableName: API_SITWITHME_STAFFLEADERBOARDTABLE_NAME,
      Key: { staffID },
      ...dynamoDBService.buildUpdateExpression({ 'ADD': { connectionCount: inc } }),
      ReturnValues: "UPDATED_NEW",
    });
  }

  async delete(staffID: string) {
    const params = {
      TableName: API_SITWITHME_STAFFLEADERBOARDTABLE_NAME,
      Key: { staffID }
    };
    await dynamoDBService.delete(params);
  }
}