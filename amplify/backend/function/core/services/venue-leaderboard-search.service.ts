import { ExploreConst } from '@swm-core/constants/explore.const';
import { Location } from '@swm-core/interfaces/location.interface';
import { VenueLeaderboard } from '@swm-core/interfaces/venue-leaderboard.interface';
import { Venue, YelpBusiness } from '@swm-core/interfaces/workplace.interface';
import { ElasticSearchService } from './elasticsearch.service';
import { WorkplaceService } from './workplace.service';

const {
  API_ES_ENDPOINT
} = process.env;

const workplaceService = new WorkplaceService();
let elasticSearchService;
const loadElasticSearchInstance = async (API_ES_ENDPOINT: string) => {
  if (!elasticSearchService) {
    elasticSearchService = await ElasticSearchService.createAsync(API_ES_ENDPOINT);
  }
  return elasticSearchService;
}
export class VenueLeaderboardSearchService {
  /**
   * 1. Get favorite venue by geoLocation
   * 2. If favorite venue in system are not enough, continue get more from Yelp
   */
  async listPopularVenues(limit: number, location?: Location): Promise<Venue[]> {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    const boolQueryFilter: { [key: string]: any }[] = [
      {
        term: {
          'gsiHash.keyword': 'VenueLeaderboard',
        }
      }
    ];

    // Venue will return in 3 miles
    if (location) {
      boolQueryFilter.push(
        {
          geo_distance: {
            distance: `${ExploreConst.distance}mi`,
            'venueConnection.geolocation': {
              lat: location.latitude,
              lon: location.longitude,
            },
          }
        }
      );
    }

    const boolQuery = {
      filter: boolQueryFilter,
    };
    const sort = [
      { 'favoriteCount': 'desc' },
    ];
    const searchBody: { [key: string]: any } = {
      size: limit,
      from: 0,
      query: {
        bool: boolQuery,
      },
      sort,
    };

    const result = await elasticSearchService.search('venueleaderboard', searchBody);
    const items = (result?.body?.hits?.hits || []).map(item => item._source);

    const venues: YelpBusiness[] = await Promise.all(items.map(async (v: VenueLeaderboard) => {
      return await workplaceService.getYelpBusiness(v.yelpBusinessID);
    }));

    let rs: Venue[] = [];
    for (const item of items) {
      const v = venues.find((_v) => _v.id === item.yelpBusinessID);
      if (v) {
        rs.push({ ...v, yelpBusinessID: v.id });
      }
    }

    // continue query Yelp if not enough data
    const remain = limit - rs.length;
    if (remain > 0 && location) {
      const yelpBusinesses = await workplaceService.listPopularYelpBusinesses(location, remain);
      rs = [ ...rs, ...yelpBusinesses ];
    }

    return rs;
  }
}