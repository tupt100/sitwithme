import { VenueLeaderboard, CreateVenueLeaderboardInput } from '@swm-core/interfaces/venue-leaderboard.interface';
import { DynamoDBService } from './dynamodb.service';
const {
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();

export class VenueLeaderboardService {
  async get(yelpBusinessID: string): Promise<VenueLeaderboard> {
    return <VenueLeaderboard>(await dynamoDBService.get({
      TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      Key: { yelpBusinessID },
    })).Item;
  }

  async create(input: CreateVenueLeaderboardInput): Promise<VenueLeaderboard> {
    const now = new Date().toISOString();
    const venueLeaderboard: VenueLeaderboard = {
      ...input,
      __typename: 'VenueLeaderboard',
      gsiHash: 'VenueLeaderboard',
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      Item: venueLeaderboard
    };
    await dynamoDBService.put(params);
    return venueLeaderboard;
  }

  async updateConnectionCount(yelpBusinessID: string, inc: number) {
    return dynamoDBService.update({
      TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      Key: { yelpBusinessID },
      ...dynamoDBService.buildUpdateExpression({ 'ADD': { favoriteCount: inc } }),
      ReturnValues: "UPDATED_NEW",
    });
  }

  async delete(yelpBusinessID: string) {
    const params = {
      TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      Key: { yelpBusinessID }
    };
    await dynamoDBService.delete(params);
  }
}