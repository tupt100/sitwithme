import { S3Object } from '@swm-core/interfaces/file.interface';
import { getFileUrlFromS3 } from '@swm-core/utils/file.util';
import { DynamoDBService } from './dynamodb.service';
import { UpdateVideoAfterProcessingInput, Video, VideoStatus, VideoUpdateInput } from '@swm-core/interfaces/video.interface';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { hasAttr } from '@swm-core/utils/validation.util';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_VIDEOTABLE_NAME,
  VIDEO_BASE_URL
} = process.env;

export class VideoService {

  /**
   * Create a record in Video table. Include: s3 metadata and file url
   */
  async create(input: S3Object): Promise<Video> {
    const { bucket, region, key } = input;
    if (!bucket || !region || !key) {
      throw new PlatformException('bucket, region, key are required.'); // error for developers see and fix.
    }
    const video: Video = {
      id: this.getFilenameByS3Object(input),
      __typename: 'Video',
      s3Metadata: { bucket, region, key },
      status: VideoStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    const params = {
      TableName: API_SITWITHME_VIDEOTABLE_NAME,
      Item: video
    };
    await dynamoDBService.put(params);
    return video;
  }

  /**
   * Create or Update a record in Video table. Include: s3 metadata and file url
   *
   * @param input
   */
  async findOrCreate(input: S3Object): Promise<Video> {
    const id = this.getVideoIDByS3Object(input);
    const video = await this.get(id);
    if (video) {
      return video;
    }

    // Create
    return this.create(input);
  }

  async get(id: string): Promise<Video> {
    const params = {
      TableName: API_SITWITHME_VIDEOTABLE_NAME,
      Key: { id }
    };
    const result = await dynamoDBService.get(params);
    return result?.Item as Video;
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_VIDEOTABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }

  async update(id: string, input: VideoUpdateInput): Promise<Video> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_VIDEOTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Video;
  }

  async updateVideoAfterProcessing(input: UpdateVideoAfterProcessingInput): Promise<Video> {
    const params: VideoUpdateInput = {
      s3Metadata: input.s3Metadata
    };
    if (hasAttr(input, 'status')) {
      params.status = input.status;
    }
    if (hasAttr(input, 'key')) {
      params.url = getFileUrlFromS3(VIDEO_BASE_URL, input.key);
    }
    if (hasAttr(input, 'thumbnailKey')) {
      params.thumbnailUrl = getFileUrlFromS3(VIDEO_BASE_URL, input.thumbnailKey);
    }

    const video = await this.findOrCreate(input.s3Metadata);
    return this.update(video.id, params);
  }

  getFilenameByS3Key(key: string) {
    return key.split('/').pop().split('.')[0];
  }

  getFilenameByS3Object(s3obj: S3Object) {
    return this.getFilenameByS3Key(s3obj.key);
  }

  getVideoIDByS3Object(s3obj: S3Object) {
    return this.getFilenameByS3Key(s3obj.key).split('_')[0];
  }
}