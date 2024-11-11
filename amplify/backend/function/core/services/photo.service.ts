import { S3Object } from '@swm-core/interfaces/file.interface';
import { getFileUrlFromS3 } from '@swm-core/utils/file.util';
import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { Photo } from '@swm-core/interfaces/photo.interface';
import { PlatformException } from '@swm-core/exceptions/platform.exception';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_PHOTOTABLE_NAME,
  ASSET_BASE_URL
} = process.env;

export class PhotoService {

  /**
   * Create a record in Photo table. Include: s3 metadata and file url
   */
  async create(input: S3Object): Promise<Photo> {
    const { bucket, region, key } = input;
    if (!bucket || !region || !key) {
      throw new PlatformException('bucket, region, key are required.'); // error for developers see and fix.
    }
    const photo: Photo = {
      id: uuidv4(),
      __typename: 'Photo',
      s3Metadata: { bucket, region, key },
      url: getFileUrlFromS3(ASSET_BASE_URL, key),
      createdAt: new Date().toISOString()
    };
    const params = {
      TableName: API_SITWITHME_PHOTOTABLE_NAME,
      Item: photo
    };
    await dynamoDBService.put(params);
    return photo;
  }

  async get(id: string): Promise<Photo> {
    const params = {
      TableName: API_SITWITHME_PHOTOTABLE_NAME,
      Key: { id }
    };
    const result = await dynamoDBService.get(params);
    return result?.Item as Photo;
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_PHOTOTABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }
}