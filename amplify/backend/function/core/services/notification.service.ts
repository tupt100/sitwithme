import { v4 as uuidv4 } from 'uuid';
import { CreateAcceptSWMNotificationInput, CreateBirthdayNotificationInput, CreateDirectMessageNotifInput, CreateNoShiftsUpcomingNotifInput, CreateNotificationInput, CreatePatronShiftAlarmBeforeStartInput, CreateStaffShiftAlarmBeforeStartInput, CreateSWMNotificationInput, Notification, NotificationKind, NotificationUpdateInput } from '@swm-core/interfaces/notification.interface';
import { DynamoDBService } from './dynamodb.service';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { Profile } from '@swm-core/interfaces/profile.interface';

const {
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
} = process.env;

const dynamoDBService = new DynamoDBService();

export class NotificationService {
  async get(id: string): Promise<Notification> {
    return <Notification>(await dynamoDBService.get({
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    // validate first
    this.validateCreateNotificationInput(input);

    const now = new Date().toISOString();
    const notification: Notification = {
      ...input,
      id: uuidv4(),
      __typename: 'SWMNotification',
      read: false,
      readKind: `false#${input.kind}`,
      createdAt: now,
      eventUpdatedAt: now
    };
    const params = {
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      Item: notification
    };
    await dynamoDBService.put(params);
    return notification;
  }

  createRequestSWMN(input: CreateSWMNotificationInput): Promise<Notification> {
    if (!input.senderProfileID) {
      throw new BadRequestException('sender profile ID is required.');
    }

    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.REQUEST_SITWITHME
    };

    return this.create(createInput);
  }

  createDirectMessageNotif(input: CreateDirectMessageNotifInput): Promise<Notification> {
    if (!input.senderProfileID) {
      throw new BadRequestException('sender profile ID is required.');
    }
    if (!input.conversationID) {
      throw new BadRequestException('Conversation ID is required.');
    }

    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.DIRECT_MESSAGE
    };

    return this.create(createInput);
  }

  async updateDirectMessageNotifTime(id: string, date: Date): Promise<Notification> {
    const params = {
      eventUpdatedAt: date.toISOString()
    };
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': params }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Notification;
  }

  createAcceptSWMN(input: CreateAcceptSWMNotificationInput): Promise<Notification> {
    if (!input.senderProfileID) {
      throw new BadRequestException('sender profile ID is required.');
    }

    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.ACCEPT_REQUEST_SITWITHME
    };

    return this.create(createInput);
  }

  createNoShiftsUpcomingNotif(input: CreateNoShiftsUpcomingNotifInput): Promise<Notification> {
    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.NO_SHIFTS_UPCOMING
    };

    return this.create(createInput);
  }

  createStaffShiftAlarmBeforeStart(input: CreateStaffShiftAlarmBeforeStartInput): Promise<Notification> {
    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START
    };

    return this.create(createInput);
  }

  createPatronShiftAlarmBeforeStart(input: CreatePatronShiftAlarmBeforeStartInput): Promise<Notification> {
    if (!input.senderProfileID) {
      throw new BadRequestException('sender profile ID is required.');
    }

    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START
    };

    return this.create(createInput);
  }

  createBirthdayNotification(input: CreateBirthdayNotificationInput): Promise<Notification> {
    if (!input.senderProfileID) {
      throw new BadRequestException('profile ID is required.');
    }
    if (!input.recipientProfileID) {
      throw new BadRequestException('recipient profile ID is required');
    }

    const createInput: CreateNotificationInput = {
      ...input,
      kind: NotificationKind.BIRTHDAY
    };

    return this.create(createInput);
  }

  validateCreateNotificationInput(input: CreateNotificationInput) {
    const errors = { kind: [], recipientProfileID: []};
    if (!input.kind) {
      errors.kind.push('Notification kind is required');
    }
    if (!input.recipientProfileID) {
      errors.recipientProfileID.push('recipient profile ID is required');
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  async getSWMN(senderProfileID: string, recipientProfileID: string, kind: NotificationKind): Promise<Notification> {
    const params = {
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      IndexName: 'bySenderProfileIDSortByRecipientProfileID',
      KeyConditionExpression: '#senderProfileID = :senderProfileID AND #recipientProfileID = :recipientProfileID',
      FilterExpression: '#kind = :kind',
      ExpressionAttributeNames: {
        '#senderProfileID': 'senderProfileID',
        '#recipientProfileID': 'recipientProfileID',
        '#kind': 'kind'
      },
      ExpressionAttributeValues: {
        ':senderProfileID': senderProfileID,
        ':recipientProfileID': recipientProfileID,
        ':kind': kind
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as Notification;
    }
  }

  getDirectMessageNotif(senderProfileID: string, recipientProfileID: string): Promise<Notification> {
    return this.getSWMN(senderProfileID, recipientProfileID, NotificationKind.DIRECT_MESSAGE);
  }

  getRequestSWMN(senderProfileID: string, recipientProfileID: string): Promise<Notification> {
    return this.getSWMN(senderProfileID, recipientProfileID, NotificationKind.REQUEST_SITWITHME);
  }

  getAcceptSWMN(senderProfileID: string, recipientProfileID: string): Promise<Notification> {
    return this.getSWMN(senderProfileID, recipientProfileID, NotificationKind.ACCEPT_REQUEST_SITWITHME);
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }

  batchDelete(IDs: string[]) {
    return dynamoDBService.batchDelete(API_SITWITHME_SWMNOTIFICATIONTABLE_NAME, IDs.map(_id => ({ id: _id })));
  }

  async deleteNotificationBySenderProfileID(senderProfileID: string, recipientProfileID: string) {
    const notifications = await this.listNotifications(senderProfileID, recipientProfileID);
    if (notifications.length) {
      await dynamoDBService.batchDelete(API_SITWITHME_SWMNOTIFICATIONTABLE_NAME, notifications.map(notification => ({ id: notification.id })));
    }
  }

  canPushNotif(profile: Profile, kind: NotificationKind): boolean {
    if (profile.notificationSettings) {
      if (profile.notificationSettings.muteAll) {
        return false;
      }

      switch (kind) {
        case NotificationKind.ACCEPT_REQUEST_SITWITHME:
        case NotificationKind.REQUEST_SITWITHME:
          return !profile.notificationSettings.muteSWMRequest;
        case NotificationKind.DIRECT_MESSAGE:
          return !profile.notificationSettings.muteMessage;
      }
    }

    return true;
  }

  async listNotifications(senderProfileID: string, recipientProfileID: string): Promise<Notification[]> {
    const params = {
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      IndexName: 'bySenderProfileIDSortByRecipientProfileID',
      KeyConditionExpression: '#senderProfileID = :senderProfileID AND #recipientProfileID = :recipientProfileID',
      ExpressionAttributeNames: {
        '#senderProfileID': 'senderProfileID',
        '#recipientProfileID': 'recipientProfileID',
      },
      ExpressionAttributeValues: {
        ':senderProfileID': senderProfileID,
        ':recipientProfileID': recipientProfileID,
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Notification[];
    }
    return [];
  }

  async allNotificationsBySenderProfileID(senderProfileID: string): Promise<Notification[]> {
    let lastEvalKey: any;
    let notifications: Notification[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
        IndexName: 'bySenderProfileIDSortByRecipientProfileID',
        KeyConditionExpression: '#senderProfileID = :senderProfileID',
        ExpressionAttributeNames: {
          '#senderProfileID': 'senderProfileID'
        },
        ExpressionAttributeValues: {
          ':senderProfileID': senderProfileID
        }
      };
      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;
      if (result && result.Items.length > 0) {
        notifications = notifications.concat(result.Items as Notification[]);
      }
    }  while (lastEvalKey);

    return notifications;
  }

  async allNotificationsByRecipientProfileID(recipientProfileID: string): Promise<Notification[]> {
    let notifications: Notification[] = [];
    const params = {
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      IndexName: 'byRecipientProfileID',
      KeyConditionExpression: '#recipientProfileID = :recipientProfileID',
      ExpressionAttributeNames: {
        '#recipientProfileID': 'recipientProfileID'
      },
      ExpressionAttributeValues: {
        ':recipientProfileID': recipientProfileID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result && result.length > 0) {
      notifications = notifications.concat(result as Notification[]);
    }
    return notifications;
  }

  async allUnreadNotifsByRecipientProfileIDAndKind(recipientProfileID: string, kind: NotificationKind): Promise<Notification[]> {
    let lastEvalKey: any;
    let notifications: Notification[] = [];
    do {
      const params = {
        TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
        IndexName: 'byRecipientProfileIDSortByReadAndKind',
        KeyConditionExpression: '#recipientProfileID = :recipientProfileID AND #readKind = :readKind',
        ExpressionAttributeNames: {
          '#recipientProfileID': 'recipientProfileID',
          '#readKind': 'readKind',
        },
        ExpressionAttributeValues: {
          ':recipientProfileID': recipientProfileID,
          ':readKind': `false#${kind}`,
        }
      };

      const result = await dynamoDBService.query(params)
      lastEvalKey = result.LastEvaluatedKey;
      if (result.Items.length > 0) {
        notifications = notifications.concat(result.Items as Notification[]);
      }
    } while (lastEvalKey);

    return notifications;
  }

  async update(id: string, params: NotificationUpdateInput): Promise<Notification> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_SWMNOTIFICATIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': params }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Notification;
  }

  async markReadNotification(id: string) {
    await this.update(id, { read: true });
  }

  async markReadNotifications(notifications: Notification[]) {
    const putItems: Notification[] = notifications.map((n) => {
      return {
        ...n,
        read: true,
        readKind: `true#${n.kind}`
      }
    });
    await dynamoDBService.batchPut(API_SITWITHME_SWMNOTIFICATIONTABLE_NAME, putItems);
  }

  async allUnreadNotifsByRecipientProfileIDAndKinds(recipientProfileID: string, kinds: NotificationKind[]): Promise<Notification[]> {
    let notifications: Notification[] = [];
    let tasks: Promise<Notification[]>[] = [];
    for (const kind of kinds) {
      tasks.push(this.allUnreadNotifsByRecipientProfileIDAndKind(recipientProfileID, kind));
    }
    if (tasks.length > 0) {
      notifications = (await Promise.all(tasks)).flat();
    }
    return notifications;
  }

  /**
  * mark to read for these notifications belong to kinds
  */
  async markReadNotificationsByKinds(recipientProfileID: string, kinds: NotificationKind[]) {
    // 1. Get all notifications by kinds
    const notifications = await this.allUnreadNotifsByRecipientProfileIDAndKinds(recipientProfileID, kinds);

    // 2. Mark as read for these notifications
    await this.markReadNotifications(notifications);
  }

  async unreadNotificationsNumber(recipientProfileID: string, kinds: NotificationKind[]): Promise<number> {
    const notifs = await this.allUnreadNotifsByRecipientProfileIDAndKinds(recipientProfileID, kinds);
    return notifs.length;
  }
}
