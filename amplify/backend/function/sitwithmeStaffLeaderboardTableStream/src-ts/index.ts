/* Amplify Params - DO NOT EDIT
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';
const exploreProfileService = new ExploreProfileService();

const updateRecordHandler = async (record: any) => {
  const newStaffLeaderboard = record.new;
  await exploreProfileService.updateExploreProfileConnection({ staffLeaderboard: newStaffLeaderboard });
}

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
          break;

        default:
          console.log(`Unexpected record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
