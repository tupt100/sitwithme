/* Amplify Params - DO NOT EDIT
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAM
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { Post } from '@swm-core/interfaces/post.interface';
import { ProfileService } from '@swm-core/services/profile.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const profileService = new ProfileService();

const insertRecordHandler = async (record: any) => {
  const { profileID } = record.new as Post;
  await Promise.all([
    profileService.updatePostCount(profileID, 1),
  ]);
};

const removeRecordHandler = async (record: any) => {
  const { profileID } = record.old as Post;
  await Promise.all([
    profileService.updatePostCount(profileID, -1),
  ]);
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
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
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
