import { ProfileDeviceToken } from "@swm-core/interfaces/profile-devicetoken.interface";
import { DynamoDBService } from "./dynamodb.service";

const {
  API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME
} = process.env;

const dynamodbService = new DynamoDBService();

export class ProfileDeviceTokenService {
  async listProfileDeviceToken(profileID: string): Promise<ProfileDeviceToken[]> {
    const params = {
      TableName: API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamodbService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as ProfileDeviceToken[];
    }

    return [];
  }

  batchDelete(keys: any[]) {
    return dynamodbService.batchDelete(
      API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME,
      keys.map(key => ({ profileID: key.profileID, deviceToken: key.deviceToken }))
    );
  }

  async deleteAllTokensByProfileID(profileID: string) {
    // 1. List all tokens by profileID
    const deviceTokens = await this.listProfileDeviceToken(profileID);

    // 2. delete all tokens
    if (deviceTokens.length) {
      await this.batchDelete(deviceTokens.map(deviceToken => ({ profileID: deviceToken.profileID, deviceToken: deviceToken.deviceToken })));
    }
  }
}
