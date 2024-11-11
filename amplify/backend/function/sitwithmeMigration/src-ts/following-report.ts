import { v4 as uuidv4 } from 'uuid';
import { FollowingReport } from "@swm-core/interfaces/following-report.interface";
import { UserRole } from "@swm-core/interfaces/profile.interface";
import { DynamoDBService } from "@swm-core/services/dynamodb.service";
import { UserService } from "@swm-core/services/user.service";
import { FollowingReportService } from '@swm-core/services/following-report.service';

const dynamoDBService = new DynamoDBService();
const userService = new UserService();
const followingReportService = new FollowingReportService();

const {
  API_SITWITHME_PROFILETABLE_NAME,
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME,
  API_SITWITHME_FOLLOWINGTABLE_NAME
} = process.env;

/**
 * Init Following Report records for User already exists.
 * This migration should run once, it can't run continuous.
 */
export const initFollowingReport = async () => {
  // 1. Query all staff
  let lastEvalKey: any;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: '#role = :role',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':role': UserRole.STAFF
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);
      let followingReportItems: FollowingReport[] = [];

      // 2. Sync staff profile to FollowingReport table
      await Promise.all(Items.map(async profile => {
        const user = await userService.get(profile.userID);
        const followingReport: FollowingReport = {
          id: uuidv4(),
          __typename: 'FollowingReport',
          staffID: profile.id,
          staffProfileConnection: {
            email: user.email,
            lastName: user.lastName,
            firstName: user.firstName,
            userName: user.userName,
            completedAt: profile.completedAt
          },
          createdAt: new Date().toISOString()
        }

        followingReportItems.push(followingReport);
      }));

      if (followingReportItems.length) {
        await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGREPORTTABLE_NAME, followingReportItems);
      }
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

/**
 * Init Following Report records for Following records already exists.
 * This migration should run once, it can't run continuous.
 */
export const migrateFollowingReport = async () => {
  // Sync from Following table to FollowingReport table
  let lastEvalKey: any;
  const tasks: Promise<any>[] = [];
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_exists(#confirmedAt) AND #confirmedAt <> :confirmedAt',
        ExpressionAttributeNames: {
          '#confirmedAt': 'confirmedAt'
        },
        ExpressionAttributeValues: {
          ':confirmedAt': null
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Sync staff profile to FollowingReport table
      Items.forEach(following => {
        tasks.push(followingReportService.create({
          staffID: following.staffID,
          patronID: following.patronID,
          confirmedAt: new Date(following.confirmedAt)
        }));
      });
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);

  while (tasks.length) {
    await Promise.all(tasks.splice(0, 20));
  }
};
