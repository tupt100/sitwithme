import { NotificationKind } from '@swm-core/interfaces/notification.interface';
import { Shift } from '@swm-core/interfaces/shift.interface';
import { Workplace } from '@swm-core/interfaces/workplace.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const {
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
  API_SITWITHME_FOLLOWINGTABLE_NAME,
  API_SITWITHME_WORKPLACETABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();

export const removeInvalidSWMNotifs = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: '#kind = :kind',
        ExpressionAttributeNames: {
          '#kind': 'kind'
        },
        ExpressionAttributeValues: {
          ':kind': NotificationKind.REQUEST_SITWITHME
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const notifIDs = [];
      for (const notif of Items) {
        const following = await dynamoDBService.get({
          TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
          Key: { staffID: notif.recipientProfileID, patronID: notif.senderProfileID },
        });
        if (!following || !following.Item || (following.Item && following.confirmedAt)) {
          notifIDs.push(notif.id);
        }
      }

      if (notifIDs.length) {
        console.log(`prepare to delete ${notifIDs.length} notifs`);
        await dynamoDBService.batchDelete(API_SITWITHME_SWMNOTIFICATIONTABLE_NAME, notifIDs.map(_id => ({ id: _id })));
      }
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const updateShiftAlert = async () => {
  let lastEvalKey;
  const tasks: Promise<any>[] = [];
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: '#kind = :kind1 OR #kind = :kind2',
        ExpressionAttributeNames: {
          '#kind': 'kind'
        },
        ExpressionAttributeValues: {
          ':kind1': NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
          ':kind2': NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      for (const notif of Items) {
        let shiftAlert = 30;
        let shiftWorkplaceName = null;
        if (notif.shiftID) {
          const shift = (await dynamoDBService.get({
            TableName: process.env.API_SITWITHME_SHIFTTABLE_NAME,
            Key: { id: notif.shiftID }
          })).Item as Shift;

          if (notif.kind === NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START) {
            shiftAlert = shift?.alert;
          }

          if (shift) {
            const workplace = (await dynamoDBService.get({
              TableName: API_SITWITHME_WORKPLACETABLE_NAME,
              Key: { id: shift.workplaceID },
            })).Item as Workplace;
            shiftWorkplaceName = workplace?.name;
          }
        }

        tasks.push(dynamoDBService.update({
          TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
          Key: { id: notif.id },
          ...dynamoDBService.buildUpdateExpression({ 'SET': { shiftAlert, shiftWorkplaceName } }),
        }));
      }
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);

  while (tasks.length) {
    await Promise.all(tasks.splice(0, 50));
  }
};


export const initNotificationCompositeSortKey = async () => {
  let lastEvalKey: any;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_not_exists(#readKind)',
        ExpressionAttributeNames: {
          '#readKind': 'readKind'
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = Items.map((item) => {
        return {
          ...item,
          readKind: `${item.read}#${item.kind}`
        };
      });
      await dynamoDBService.batchPut(API_SITWITHME_SWMNOTIFICATIONTABLE_NAME, putItems);

      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);

};
