/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_VIDEOTABLE_ARN
  API_SITWITHME_VIDEOTABLE_NAME
  AUTH_SITWITHME_USERPOOLID
  ENV
  REGION
  ASSET_BASE_URL
Amplify Params - DO NOT EDIT */

import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { UnauthorizedException } from '@swm-core/exceptions/unauthorized.exception';
import { PostService } from '@swm-core/services/post.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { VideoService } from '@swm-core/services/video.service';

const postService = new PostService();
const profileService = new ProfileService();
const videoService = new VideoService();

const resolvers = {
  Mutation: {
    createPost: (event) => {
      return postService.create(event.identity.claims["custom:id"], event.arguments.input);
    },

    createPostV2: (event) => {
      return postService.create(event.identity.claims["custom:id"], event.arguments.input);
    },

    deletePost: async (event) => {
      const input = event.arguments.input;
      const post = await postService.get(input.id);
      const userID = event.identity.claims['custom:id'];
      if (!post) {
        return true;
      }

      const profile = await profileService.get(post.profileID);
      if (!profile) {
        throw new PlatformException(`Profile not found`);
      }
      if (profile.userID !== userID) {
        throw new UnauthorizedException();
      }

      await postService.delete(input.id);
      return true;
    },

    updatePost: (event) => {
      return postService.update(event.identity.claims["custom:id"], event.arguments.input);
    },

    updateVideoAfterProcessing: (event) => {
      const { status, key, thumbnailKey, video } = event.arguments.input;
      return videoService.updateVideoAfterProcessing({
        status,
        key,
        thumbnailKey,
        s3Metadata: video
      });
    }
  }
};

exports.handler = async (event) => {
  console.info('Event: ', event);
  const typeHandler = resolvers[event.typeName];
  if (typeHandler) {
    try {
      const resolver = typeHandler[event.fieldName];
      if (resolver) {
        return await resolver(event);
      }
    } catch (e) {
      if (e instanceof PlatformException) {
        const { message, errCode, errors } = e;
        return { error: { message, errCode, errors }};
      } else {
        console.log('ERROR: ', e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
