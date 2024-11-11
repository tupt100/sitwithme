/* Amplify Params - DO NOT EDIT
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { ExploreProfile } from '@swm-core/interfaces/explore-profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { ShiftService } from '@swm-core/services/shift.service';
import { endOfDate, getNextDate, startOfDate } from '@swm-core/utils/date.util';

const { API_SITWITHME_EXPLOREPROFILETABLE_NAME } = process.env;
const dynamoDBService = new DynamoDBService();
const shiftService = new ShiftService();

exports.handler = async (event) => {
  console.log('ExploreProfile - Start daily sync up duty', event);
  let lastEvalKey;
  do {
    try {
      const now = new Date(event.time);
      // 1. Scan all explore profile items
      console.log('Scan ExploreProfile: ', API_SITWITHME_EXPLOREPROFILETABLE_NAME);
      let { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_EXPLOREPROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;

      // Filter out outdate explore profile
      Items = Items.filter(item => !item.endDate || new Date(item.endDate).getTime() >= now.getTime());
      console.log('Scanned Items: ', Items);

      if (Items.length) {
        const rangeEnd = endOfDate(now);
        const rangeStart = startOfDate(getNextDate(now, -1));
        const putItems = await Promise.all(Items.map(async (item: ExploreProfile) => {
          const shifts = await shiftService.listShiftsByExploreProfile(item.profileID, item.workplaceID, item.jobID);
          item.dutyRanges = shiftService.getDutyRangesFromShifts(shifts, rangeStart, rangeEnd);
          return item;
        }));

        await dynamoDBService.batchPut(API_SITWITHME_EXPLOREPROFILETABLE_NAME, putItems);
      }
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}