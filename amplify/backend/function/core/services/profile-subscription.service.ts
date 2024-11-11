import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from './dynamodb.service';
import { StepFunctionsService } from './step-functions.service';
import { ProfileSubscription, ProfileSubscriptionUpdateInput } from '@swm-core/interfaces/profile-subscription.interface';

const {
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
} = process.env;

const dynamoDBService = new DynamoDBService();
const stepFunctionsService = new StepFunctionsService();

export class ProfileSubscriptionService {

  async getProfileSubscriptionByProfileIDAndAppleProductID(profileID: string, appleProductID: string): Promise<ProfileSubscription> {
    const params = {
      TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
      IndexName: 'byProfileID',
      KeyConditionExpression: '#profileID = :profileID',
      FilterExpression: '#appleProductID = :appleProductID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
        '#appleProductID': 'appleProductID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
        ':appleProductID': appleProductID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as ProfileSubscription;
    }
  }

  async get(id: string): Promise<ProfileSubscription> {
    return <ProfileSubscription>(await dynamoDBService.get({
      TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async batchDelete(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
      keys.map(k => ({ id: k.id }))
    );
  }

  async allSubscriptionsByProfileID(profileID: string): Promise<ProfileSubscription[]> {
    const params = {
      TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
      IndexName: 'byProfileID',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };

    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      return result as ProfileSubscription[];
    }
    return [];
  }

  async update(id: string, input: ProfileSubscriptionUpdateInput): Promise<ProfileSubscription> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as ProfileSubscription;
  }

  async execAlarmStepFunc(profileSubscription: ProfileSubscription, stepFuncArn: string, alarmDate: Date, data: any = {}, date: Date = new Date()) {
    // ignore alarm if passing time
    if (alarmDate.getTime() < date.getTime()) {
      return;
    }

    console.log("[Alarm] execAlarmStepFunc");

    const execution = await stepFunctionsService.startExecution({
      stateMachineArn: stepFuncArn,
      name: uuidv4(),
      input: JSON.stringify({
        alarmDate: alarmDate.toISOString(),
        profileSubscriptionID: profileSubscription.id,
        type: data.type
      })
    });

    await this.update(profileSubscription.id, {
      stepFuncExecArn: execution.executionArn,
      stepFuncExecStartDate: execution.startDate.toISOString()
    });
  }

  async stopAlarm(profileSubscription: ProfileSubscription) {
    const tasks: Promise<any>[] = [];
    if (profileSubscription.stepFuncExecArn) {
      tasks.push(stepFunctionsService.stopExecution({ executionArn: profileSubscription.stepFuncExecArn }));

      tasks.push(this.update(profileSubscription.id, {
        stepFuncExecArn: null,
        stepFuncExecStartDate: null
      }));
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }
}