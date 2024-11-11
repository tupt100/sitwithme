/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  ENV
  REGION
  API_ES_ENDPOINT
Amplify Params - DO NOT EDIT */
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { ExploreService } from '@swm-core/services/explore.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { ShiftService } from '@swm-core/services/shift.service';

const exploreService = new ExploreService();
const shiftService = new ShiftService();
const profileService = new ProfileService();

const resolvers = {
  ExploreProfile: {
    duty: async (event) => {
      const { source } = event;
      const date = event.arguments.date;
      console.log('Start get duty status: ', source);
      return shiftService.checkDutyFromExploreProfile(source, new Date(date));
    },
  },

  Query: {
    exploreStaffProfile: async (event) => {
      console.log('Starting explore profile: ', event.identity.claims["custom:id"]);
      const currentProfile: Profile = await profileService.getPatronByUserID(event.identity.claims["custom:id"]);
      console.log('currentProfile: ', JSON.stringify(currentProfile, null, 2));
      const { filter, limit, offset, sortBy, sortDirection } = event.arguments;
      return exploreService.exploreStaffProfiles({ ...filter, profileID: currentProfile.id }, limit, offset, sortBy, sortDirection );
    },
    searchStaffProfile: async (event) => {
      console.log('Starting search profile: ', event.identity.claims["custom:id"]);
      const currentProfile: Profile = await profileService.getPatronByUserID(event.identity.claims["custom:id"]);
      console.log('currentProfile: ', JSON.stringify(currentProfile, null, 2));
      const { filter, limit, offset } = event.arguments;
      return exploreService.searchStaffProfiles({ ...filter, profileID: currentProfile.id }, limit, offset);
    },
    exploreVenues: async (event) => {
      const { filter, limit, offset, nextToken } = event.arguments;
      if (filter.duty?.length || filter.jobType?.length) {
        return exploreService.exploreVenuesByProfileInfo(filter, limit, offset, nextToken);
      }
      return exploreService.exploreVenues(filter, limit, offset);
    },
    explorePhotos: async (event) => {
      const currentProfile = await profileService.getPatronByUserID(event.identity.claims["custom:id"]);
      const { filter, limit, offset } = event.arguments;
      return exploreService.explorePosts({ ...filter, profileID: currentProfile.id }, limit, offset);
    },
    explorePosts: async (event) => {
      const userID: string = event.identity.claims["custom:id"];
      const { filter, limit, offset } = event.arguments;
      const profile = await profileService.getProfileByUserID(userID, filter.role);
      if (!profile) {
        throw new BadRequestException('Profile not found.');
      }
      return exploreService.explorePosts({ ...filter, profileID: profile.id }, limit, offset);
    },
    explorePatronProfiles: async (event) => {
      console.log('Starting explore profile: ', event.identity.claims["custom:id"]);
      const profile: Profile = await profileService.getStaffByUserID(event.identity.claims["custom:id"]);
      if (!profile) {
        throw new BadRequestException('Profile not found.');
      }
      const { filter, limit, offset } = event.arguments;
      return exploreService.explorePatronProfiles({ ...filter, profileID: profile.id }, limit, offset);
    },
  }
};

exports.handler = async (event) => {
  // event
  // {
  //   "typeName": "Query", /* Filled dynamically based on @function usage location */
  //   "fieldName": "me", /* Filled dynamically based on @function usage location */
  //   "arguments": { /* GraphQL field arguments via $ctx.arguments */ },
  //   "identity": { /* AppSync identity object via $ctx.identity */ },
  //   "source": { /* The object returned by the parent resolver. E.G. if resolving field 'Post.comments', the source is the Post object. */ },
  //   "request": { /* AppSync request object. Contains things like headers. */ },
  //   "prev": { /* If using the built-in pipeline resolver support, this contains the object returned by the previous function. */ },
  // }
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
        return { error: { message, errCode, errors } };
      } else {
        console.log('ERROR: ', e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
