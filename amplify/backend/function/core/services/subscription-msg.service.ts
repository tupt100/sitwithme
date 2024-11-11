import { DateConst } from '@swm-core/constants/date.const';
import { CreateSubscriptionMsgInput, SubscriptionMsg } from '@swm-core/interfaces/subscription-msg.interface';
import { DynamoDBService } from './dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_SUBSCRIPTIONMSGTABLE_NAME
} = process.env;

export class SubscriptionMsgService {
  async get(hashKey: string, deliveredAt: Date): Promise<SubscriptionMsg> {
    return <SubscriptionMsg>(await dynamoDBService.get({
      TableName: API_SITWITHME_SUBSCRIPTIONMSGTABLE_NAME,
      Key: { hashKey, deliveredAt: deliveredAt.toISOString() },
    })).Item;
  }

  async create(input: CreateSubscriptionMsgInput): Promise<SubscriptionMsg> {
    const now = new Date();
    const subMsg: SubscriptionMsg = {
      ...input,
      deliveredAt: input.deliveredAt?.toISOString() || now.toISOString(),
      expiredAt: Math.floor((input.expiredAt || now.getTime() + 1 * DateConst.DateInUnix) / 1000) // expired 1 day
    };
    await dynamoDBService.put({
      TableName: API_SITWITHME_SUBSCRIPTIONMSGTABLE_NAME,
      Item: subMsg
    });
    return subMsg;
  }
}