/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_VENUELEADERBOARDTABLE_ARN
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { VenueLeaderboardService } from '@swm-core/services/venue-leaderboard.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const venueLeaderboardService = new VenueLeaderboardService();

const insertRecordHandler = async (record: any) => {
  const { yelpBusinessID, venue } = record.new;
  const venueConnection = {
    location: venue.location,
    geolocation: {
      lat: venue.location?.latitude,
      lon: venue.location?.longitude,
    },
  };
  const row = await venueLeaderboardService.get(yelpBusinessID);
  if (!row) {
    await venueLeaderboardService.create({ yelpBusinessID, venueConnection, favoriteCount: 1 });
  } else {
    await venueLeaderboardService.updateConnectionCount(yelpBusinessID, 1);
  }
};

const removeRecordHandler = async (record: any) => {
  const { yelpBusinessID } = record.old;
  const row = await venueLeaderboardService.get(yelpBusinessID);
  if (row && row.favoriteCount === 1) {
    await venueLeaderboardService.delete(yelpBusinessID);
  } else {
    await venueLeaderboardService.updateConnectionCount(yelpBusinessID, -1);
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
