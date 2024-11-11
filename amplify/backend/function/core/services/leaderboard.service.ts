import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { StaffLeaderboard } from '@swm-core/interfaces/staff-leaderboard.interface';
import { DynamoDBService } from './dynamodb.service';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
} = process.env;

export class LeaderboardService {
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
}