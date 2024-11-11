import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { CreateUserNoteInput, UpdateUserNoteInput, UserNote } from '@swm-core/interfaces/user-note.interface';
import { ProfileService } from './profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const {
  API_SITWITHME_USERNOTETABLE_NAME,
} = process.env;

export class UserNoteService {
  /**
   * Create a record in Photo table. Include: s3 metadata and file url
   */
  async create(userID: string, input: CreateUserNoteInput): Promise<UserNote> {
    if (!input.title || !input.description) {
      throw new PlatformException('title and description are required.'); // error for developers see and fix.
    }

    const profile = await profileService.getProfileByUserID(userID, input.role);
    if (!profile) {
      throw new PlatformException(`Profile ${input.role} not found`);
    }

    const recipientProfile = await profileService.get(input.recipientProfileID);
    if (!recipientProfile) {
      throw new PlatformException(`Recipient profile not found`);
    }

    if(recipientProfile.id === profile.id) {
      throw new PlatformException(`Recipient profile must be different from the sender's profile`);
    }

    const userNote: UserNote = {
      id: uuidv4(),
      __typename: 'UserNote',
      userID: userID,
      title: input.title,
      description: input.description,
      createdAt: new Date().toISOString(),
      recipientProfileID: input.recipientProfileID,
    };
    const params = {
      TableName: API_SITWITHME_USERNOTETABLE_NAME,
      Item: userNote
    };
    await dynamoDBService.put(params);
    return userNote;
  }

  async update(id: string,input: UpdateUserNoteInput): Promise<UserNote> {
    const result = await dynamoDBService.update( {
      TableName: API_SITWITHME_USERNOTETABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW"
    });
    return result?.Attributes as UserNote;
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_USERNOTETABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }
}