import { GsiHash } from '@swm-core/interfaces/profile-leaderboard.interface';
import { UserRole } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_PROFILETABLE_NAME,
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME,
  API_SITWITHME_FOLLOWINGTABLE_NAME
} = process.env;

const sleep = async (millis) => {
  return new Promise(resolve => setTimeout(resolve, millis));
};

export const initProfileLeaderboard = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = [];

      for (const item of Items) {
        let rs: DocumentClient.QueryOutput;
        if (item.role === UserRole.STAFF) {
          rs = await dynamoDBService.query({
            TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
            KeyConditionExpression: '#staffID = :staffID',
            FilterExpression: 'attribute_exists(#confirmedAt) AND #confirmedAt <> :confirmedAt',
            ExpressionAttributeNames: {
              '#staffID': 'staffID',
              '#confirmedAt': 'confirmedAt'
            },
            ExpressionAttributeValues: {
              ':staffID': item.id,
              ':confirmedAt': null
            }
          });
        } else {
          rs = await dynamoDBService.query({
            TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
            IndexName: 'byPatronID',
            KeyConditionExpression: '#patronID = :patronID',
            FilterExpression: 'attribute_exists(#confirmedAt) AND #confirmedAt <> :confirmedAt',
            ExpressionAttributeNames: {
              '#patronID': 'patronID',
              '#confirmedAt': 'confirmedAt'
            },
            ExpressionAttributeValues: {
              ':patronID': item.id,
              ':confirmedAt': null
            }
          });
        }

        putItems.push({
          profileID: item.id,
          connectionCount: rs.Items.length,
          __typename: 'ProfileLeaderboard',
          gsiHash: item.role === UserRole.STAFF ? GsiHash.StaffLeaderboard : GsiHash.PatronLeaderboard,
          createdAt: now,
          updatedAt: now
        });
      }

      await dynamoDBService.batchPut(API_SITWITHME_PROFILELEADERBOARDTABLE_NAME, putItems);
      console.log('DONE');
      await sleep(100);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};