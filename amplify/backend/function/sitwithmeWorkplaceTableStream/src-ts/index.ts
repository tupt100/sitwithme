/* Amplify Params - DO NOT EDIT
	API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { UpdateExploreProfileInput } from '@swm-core/interfaces/explore-profile.interface';
import { Workplace } from '@swm-core/interfaces/workplace.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import { ShiftService } from '@swm-core/services/shift.service';
import { changed } from '@swm-core/utils/comparison.util';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  API_SITWITHME_SHIFTTABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();
const shiftService = new ShiftService();
const exploreProfileService = new ExploreProfileService();

const removeRecordHandler = async (record: any) => {
  // Remove all Shifts related with Workplace
  const { id } = record.old;
  const shifts = await shiftService.listShiftsByWorkplaceID(id);
  await dynamoDBService.batchDelete(API_SITWITHME_SHIFTTABLE_NAME, shifts.map(s => ({ id: s.id })));
};

const updateRecordHandler = async (record: any) => {
  const oldWorkplace: Workplace = record.old;
  const newWorkplace: Workplace = record.new;

  // sync to explore profiles workplace information
  const oldAttr = {
    name: oldWorkplace.name,
    location: oldWorkplace.location,
    fullAddress: oldWorkplace.fullAddress,
    yelpCategories: oldWorkplace.yelpCategories,
    price: oldWorkplace.price,
    reviewCount: oldWorkplace.reviewCount,
    imageUrl: oldWorkplace.imageUrl,
    rating: oldWorkplace.rating
  };
  const newAttr = {
    name: newWorkplace.name,
    location: newWorkplace.location,
    fullAddress: newWorkplace.fullAddress,
    yelpCategories: newWorkplace.yelpCategories,
    price: newWorkplace.price,
    reviewCount: newWorkplace.reviewCount,
    imageUrl: newWorkplace.imageUrl,
    rating: newWorkplace.rating
  };
  if (changed(oldAttr, newAttr)) {
    const exploreProfiles = await exploreProfileService.listExploreProfilesByWorkplaceID(newWorkplace.id);
    if (exploreProfiles.length > 0) {
      const input: UpdateExploreProfileInput = {
        workplaceConnection: {
          ...exploreProfiles[0].workplaceConnection,
          ...newAttr
        }
      };
      const tasks = exploreProfiles.map((ep) => exploreProfileService.updateExploreProfile(ep.profileID, ep.workplaceID, ep.jobID, input));

      console.log(`Sync from workplace ${newWorkplace.id} to explore profile...`);
      await Promise.all(tasks);
    }
  }
};

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  const errors = [];

  const records = event.Records.map(record => ({
    eventName: record.eventName,
    new: DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
    old: DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
  }));

  console.info('records: ', JSON.stringify(records, null, 2));

  for (const record of records) {
    try {
      switch (record.eventName) {
        case 'INSERT':
          break;
        case 'MODIFY':
          await updateRecordHandler(record);
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
