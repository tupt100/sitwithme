import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePostInput, Post, PostProfileConnection, PostType, UpdatePostInput } from '@swm-core/interfaces/post.interface';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { PhotoService } from './photo.service';
import { ProfileService } from './profile.service';
import { normalizeString, removeUndefined } from '@swm-core/utils/normalization.util';
import { VideoService } from './video.service';

const dynamoDBService = new DynamoDBService();
const photoService = new PhotoService();
const videoService = new VideoService();
const profileService = new ProfileService();

const {
  API_SITWITHME_POSTTABLE_NAME
} = process.env;

export class PostService {
  /**
   * Create a new post
   *
   * 1. Create a new record in Photo table
   * 2. Create a new record in Post table to connect Profile and Photo
   */
  async create(userID: string, params: CreatePostInput): Promise<Post> {
    const { role, photo, caption, video, postType } = params;
    const profile = await profileService.getProfileByUserID(userID, role);
    if (!profile) {
      throw new PlatformException(`Profile ${role} not found`);
    }

    if (postType === PostType.PHOTO && !photo) {
      throw new PlatformException('photo is required');
    } else if (postType === PostType.VIDEO && !video) {
      throw new PlatformException('video is required');
    }

    let uploadedPhoto: any;
    let uploadedVideo: any;
    if (postType === PostType.PHOTO || !postType) {
      // 1. Create a new record in Photo table
      uploadedPhoto = await photoService.create(photo);
    } else if (postType === PostType.VIDEO) {
      // 1. Create or Update a record in Video table
      uploadedVideo = await videoService.findOrCreate(video);
    }
    const blockedProfileIDs = profile.blockedProfileIDs?.values;
    const followingProfileIDs = profile.followingProfileIDs?.values;

    // 2. Create a new record in Post table to connect Profile and Photo/Video
    const post: Post = {
      id: uuidv4(),
      __typename: 'Post',
      profileID: profile.id,
      postType: postType || PostType.PHOTO,
      photoID: uploadedPhoto?.id,
      videoID: uploadedVideo?.id,
      caption,
      profileConnection: {
        privacy: profile.privacy,
        blockedProfileIDs: blockedProfileIDs?.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) as PostProfileConnection['blockedProfileIDs'] : null,
        followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as PostProfileConnection['followingProfileIDs'] : null,
      },
      createdAt: new Date().toISOString()
    };
    await dynamoDBService.put({
      TableName: API_SITWITHME_POSTTABLE_NAME,
      Item: post
    });
    return post;
  }

  /**
   * Update an existed post
   *
   * 1. Update a new record in Photo table
   * 2. Update a new record in Post table to connect Profile and Photo
   * 3. Delete old record in Photo table
   */
  async update(userID: string, params: UpdatePostInput): Promise<Post> {
    const { id, role, photo, caption } = params;
    const profile = await profileService.getProfileByUserID(userID, role);
    if (!profile) {
      throw new PlatformException(`Profile ${role} not found`);
    }
    const existedPost = await this.get(id);
    if (!existedPost) {
      throw new PlatformException(`Post not found`);
    }

    let updatePostParams: UpdatePostInput = this.normalizePostInput({ photo, caption });

    // 1. Update a new record in Photo table
    if (photo) {
      // Remove existed photo
      await photoService.delete(existedPost.photoID);
      const uploadedPhoto = await photoService.create(photo);
      updatePostParams = {
        ...updatePostParams,
        photoID: uploadedPhoto.id,
      }
    }

    // 2. Update a new record in Post table to connect Profile and Photo
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_POSTTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': updatePostParams }),
      ReturnValues: 'ALL_NEW',
    });

    // 3. Delete old record in Photo table
    if (photo) {
      await photoService.delete(existedPost.photoID);
    }

    return result.Attributes as Post;
  }

  normalizePostInput(post: UpdatePostInput): UpdatePostInput {
    post = normalizeString(post);
    const normalizedPost: UpdatePostInput = {
      caption: post.caption,
      photo: post.photo,
    };

    removeUndefined(normalizedPost);
    return normalizedPost;
  }

  async addBlockedProfileToConnection(profileID: string, blockedProfileID: string) {
    const posts: Post[] = await this.allPostsByProfileID(profileID);
    console.log('Start add blockedProfileID to Post: ', profileID, blockedProfileID, JSON.stringify(posts, null, 2));
    if (posts.length) {
      const putItems = posts.map((item: Partial<Post>) => {
        const blockedProfileIDs = item.profileConnection?.blockedProfileIDs?.values || [];
        if (blockedProfileID && !blockedProfileIDs.find(i => i === blockedProfileID)) {
          blockedProfileIDs.push(blockedProfileID);
        }
        return {
          ...item,
          profileConnection: {
            ...item.profileConnection,
            blockedProfileIDs: blockedProfileIDs.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs): null
          }
        }
      });
      console.log(JSON.stringify(putItems, null, 2));

      // Put item with new update connections
      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
    }
  }

  async removeBlockedProfileToConnection(profileID: string, blockedProfileID: string) {
    const posts: Post[] = await this.allPostsByProfileID(profileID);
    console.log('Start remove blockedProfileID from Post: ', profileID, blockedProfileID, JSON.stringify(posts, null, 2));
    if (posts.length) {
      const putItems = posts.map((item: Partial<Post>) => {
        const blockedProfileIDs = item.profileConnection?.blockedProfileIDs?.values?.filter(i => i !== blockedProfileID) || [];
        return {
          ...item,
          profileConnection: {
            ...item.profileConnection,
            blockedProfileIDs: blockedProfileIDs.length ? dynamoDBService.dbClient.createSet(blockedProfileIDs) : null
          }
        }
      });
      console.log(JSON.stringify(putItems, null, 2));

      // Put item with new update connections
      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
    }
  }

  async syncFollowingProfileIDsToPosts(profileID: string, followingProfileIDs: PostProfileConnection['followingProfileIDs']) {
    const posts = await this.allPostsByProfileID(profileID);
    const followingProfileIDValues = followingProfileIDs?.values;
    const putItems = posts.map((post) => {
      return {
        ...post,
        profileConnection: {
          ...post.profileConnection,
          followingProfileIDs: followingProfileIDValues?.length ? dynamoDBService.dbClient.createSet(followingProfileIDValues) as PostProfileConnection['followingProfileIDs'] : null,
        }
      }
    });
    if (putItems.length > 0) {
      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
    }
  }

  async allPostsByProfileID(profileID: string): Promise<Post[]> {
    let queryExpression: { [key: string]: any } = {};
    let postItems: Post[] = [];

    queryExpression = {
      IndexName: 'byProfileSortByCreatedAt',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
      },
    };

    let lastEvalKey;
    do {
      try {
        // Get all explore profiles items
        const { Items, LastEvaluatedKey } = await dynamoDBService.query({
          TableName: API_SITWITHME_POSTTABLE_NAME,
          ExclusiveStartKey: lastEvalKey,
          ...queryExpression
        });
        lastEvalKey = LastEvaluatedKey;
        postItems = postItems.concat(Items as Post[] || []);
      } catch (e) {
        console.log('ERROR: ', e);
      }
    } while (lastEvalKey);

    return postItems;
  }

  async get(id: string): Promise<Post> {
    const params = {
      TableName: API_SITWITHME_POSTTABLE_NAME,
      Key: { id }
    };
    const result = await dynamoDBService.get(params);
    return result?.Item as Post;
  }

  /**
   * Delete a post
   *
   * 1. Delete record in Photo table
   * 2. Delete record in Post table
   * 3. Delete image in S3
   */
  async delete(id: string) {
    const post = await this.get(id);

    if ((post.postType === PostType.PHOTO || !post.postType) && post.photoID) {
      // 1. Delete record in Photo table
      await photoService.delete(post.photoID);
    } else if (post.postType === PostType.VIDEO && post.videoID) {
      // 1. Delete record in Video table
      videoService.delete(post.videoID);
    }

    // 2. Delete record in post table
    await dynamoDBService.delete({
      TableName: API_SITWITHME_POSTTABLE_NAME,
      Key: { id }
    })

    // 3. Delete image in S3
  }

  async syncPrivacyToProfilePosts(profileID: string, privacy: boolean) {
    const posts = await this.allPostsByProfileID(profileID);
    const putItems = posts.map((post) => {
      return {
        ...post,
        profileConnection: {
          ...post.profileConnection,
          privacy
        }
      }
    });
    if (putItems.length > 0) {
      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
    }
  }

  async syncUserDeletedToProfilePosts(profileID: string, deleted: boolean) {
    const posts = await this.allPostsByProfileID(profileID);
    const putItems = posts.map((post) => {
      return {
        ...post,
        profileConnection: {
          ...post.profileConnection,
          deleted
        }
      }
    });
    if (putItems.length > 0) {
      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
    }
  }
}