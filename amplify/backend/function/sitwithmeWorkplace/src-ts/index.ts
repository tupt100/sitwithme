/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_GRAPHQLAPIENDPOINTOUTPUT
  API_SITWITHME_WORKPLACETABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_VENUELEADERBOARDTABLE_ARN
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
  API_SITWITHME_VENUEFAVORITEV2TABLE_ARN
  API_SITWITHME_VENUEFAVORITEV2TABLE_NAME
  API_SITWITHME_VENUEFAVORITETABLE_ARN
  API_SITWITHME_VENUEFAVORITETABLE_NAME
  YELP_API_KEY
  ENV
  REGION
Amplify Params - DO NOT EDIT */
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { UnauthorizedException } from '@swm-core/exceptions/unauthorized.exception';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { Venue, Workplace, WorkplaceInput } from '@swm-core/interfaces/workplace.interface';
import { ProfileService } from '@swm-core/services/profile.service';
import { VenueLeaderboardSearchService } from '@swm-core/services/venue-leaderboard-search.service';
import { WorkplaceService } from '@swm-core/services/workplace.service';

const workplaceService = new WorkplaceService();
const profileService = new ProfileService();
const venueLeaderboardSearchService = new VenueLeaderboardSearchService();

const resolvers = {
  Mutation: {
    createWorkplace: (event) => {
      return createWorkplace(event);
    },

    deleteWorkplace: (event) => {
      return deleteWorkplace(event);
    },

    favoriteVenue: async (event) => {
      const { yelpBusinessID } = event.arguments.input;
      const profile = await profileService.getPatronByUserID(event.identity.claims['custom:id']);
      if (!profile) {
        throw new BadRequestException('Patron does not existed');
      }
      await workplaceService.favoriteVenue(profile, yelpBusinessID);
      return true;
    },

    favoriteVenueV2: async (event) => {
      const { yelpBusinessID } = event.arguments.input;
      const profile = await profileService.getPatronByUserID(event.identity.claims['custom:id']);
      if (!profile) {
        throw new BadRequestException('Patron does not existed');
      }
      await workplaceService.favoriteVenueV2(profile, yelpBusinessID);
      return true;
    }
  },

  Query: {
    searchYelpBusinesses: (event) => {
      if (!event.arguments.filter?.keyword) {
        throw new BadRequestException(`Business's name is required`);
      }

      return workplaceService.searchYelpBusiness(event.arguments.filter, event.arguments.limit, event.arguments.offset);
    },

    getVenue: async (event) => {
      const { yelpBusinessID } = event.arguments.input;
      const yelpBusiness = await workplaceService.getYelpBusiness(yelpBusinessID);
      if (yelpBusiness) {
        const venue: Venue = { ...yelpBusiness, yelpBusinessID: yelpBusiness.id };
        return venue;
      }
    },

    listPopularVenues: async (event) => {
      return venueLeaderboardSearchService.listPopularVenues(5, event.arguments.input);
    },

    listCategories: async () => {
      return workplaceService.listCategories();
    }
  },

  VenueLeaderboard: {
    venue: async (event) => {
      const { yelpBusinessID } = event.source;
      const yelpBusiness = await workplaceService.getYelpBusiness(yelpBusinessID);
      if (yelpBusiness) {
        const venue: Venue = { ...yelpBusiness, yelpBusinessID: yelpBusiness.id };
        return venue;
      }
    }
  }
};

async function createWorkplace(event): Promise<Workplace> {
  const existedProfile: Profile = await profileService.getStaffByUserID(event.identity.claims['custom:id'])
  if (!existedProfile) {
    throw new BadRequestException('Profile does not existed');
  }

  const workplace: WorkplaceInput = {
    ...event.arguments.input,
    profileID: existedProfile.id,
  }
  return workplaceService.create(workplace);
}

async function deleteWorkplace(event): Promise<boolean> {
  const workplaceID: string = event.arguments.id;
  const userID: string = event.identity.claims['custom:id'];
  const existedWorkplace: Workplace = await workplaceService.get(workplaceID);
  if (!existedWorkplace) {
    return true;
  }

  const existedProfile: Profile = await profileService.getStaffByUserID(userID);
  if (existedWorkplace.profileID !== existedProfile?.id) {
    throw new UnauthorizedException();
  }

  await workplaceService.delete(workplaceID);
  return true;
}

export const handler = async (event) => {
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
        return { error: { message, errCode, errors } };
      } else {
        console.log("ERROR: ", e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
