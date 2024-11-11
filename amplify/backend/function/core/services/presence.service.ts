import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { CreatePresenceInput, Presence } from '@swm-core/interfaces/presence.interface';
import { PresenceStatus } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from './dynamodb.service';
import { ProfileService } from './profile.service';
import { UserService } from './user.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_PRESENCETABLE_NAME,
  ENV
} = process.env;

const profileService = new ProfileService();

export class PresenceService {
  async get(id: string): Promise<Presence> {
    return <Presence>(await dynamoDBService.get({
      TableName: API_SITWITHME_PRESENCETABLE_NAME,
      Key: { id },
    })).Item;
  }

  async create(input: CreatePresenceInput): Promise<Presence> {
    const now = new Date().toISOString();
    const presence: Presence = {
      ...input,
      __typename: 'Presence',
      createdAt: input.createdAt ? input.createdAt.toISOString() : now
    };
    const params = {
      TableName: API_SITWITHME_PRESENCETABLE_NAME,
      Item: presence
    };
    await dynamoDBService.put(params);
    return presence;
  }

  async verifyClient(clientID: string) {
    const [env, id, profileID] = clientID.split(':');

    // validate
    if (!env || !id || !profileID) {
      throw new BadRequestException('clientID format is invalid. It should be `env:uuid:profileID`.');
    }

    if (env !== ENV) {
      throw new BadRequestException(`env ${env} is invalid.`);
    }

    const profile = await profileService.get(profileID);
    if (!profile) {
      throw new BadRequestException('Profile ID is invalid.');
    }
  }

  // clientID format: env:uuid:profileID
  async connect(clientID: string, date: Date): Promise<Presence> {
    await this.verifyClient(clientID);

    const [env, id, profileID] = clientID.split(':');
    const presence = await this.create({ id, profileID, createdAt: date });
    if (presence) {
      await profileService.update(profileID, { presenceStatus: PresenceStatus.ON, lastOnlineAt: date.toISOString() });
    }

    return presence;
  }

  // clientID format: env:uuid:profileID
  async disconnect(clientID: string, delay: number = 0) {
    await this.verifyClient(clientID);
    const now = new Date();

    const [env, id, profileID] = clientID.split(':');
    const presence = await this.get(id);
    if (presence) {
      const last = new Date(presence.createdAt);
      const dt = now.getTime() - last.getTime();
      if (dt >= delay) {
        await this.delete(id);
        const presences = await this.listProfilePresences(profileID);
        if (presences.length === 0) {
          await profileService.update(profileID, { presenceStatus: PresenceStatus.OFF, lastOnlineAt: now.toISOString() });
        }
      }
    }
  }

  async listProfilePresences(profileID: string): Promise<Presence[]> {
    const params = {
      TableName: API_SITWITHME_PRESENCETABLE_NAME,
      IndexName: 'byProfileID',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Presence[];
    }
    return [];
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_PRESENCETABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }
}
