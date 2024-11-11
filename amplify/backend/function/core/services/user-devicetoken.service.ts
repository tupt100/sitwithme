import { UserDeviceToken } from "@swm-core/interfaces/user-devicetoken.interface";
import { DynamoDBService } from "./dynamodb.service";

const {
  API_SITWITHME_USERDEVICETOKENTABLE_NAME
} = process.env;

const dynamodbService = new DynamoDBService();

export class UserDeviceTokenService {
  async listUserDeviceTokens(userID: string): Promise<UserDeviceToken[]> {
    const params = {
      TableName: API_SITWITHME_USERDEVICETOKENTABLE_NAME,
      KeyConditionExpression: '#userID = :userID',
      ExpressionAttributeNames: {
        '#userID': 'userID'
      },
      ExpressionAttributeValues: {
        ':userID': userID
      }
    };
    const result = await dynamodbService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as UserDeviceToken[];
    }

    return [];
  }
}
