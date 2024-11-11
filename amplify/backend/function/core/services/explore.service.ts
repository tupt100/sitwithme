import { ExploreConst } from '@swm-core/constants/explore.const';
import { YelpConst } from '@swm-core/constants/yelp.const';
import { ExploreProfileSortBy } from '@swm-core/interfaces/explore-profile.interface';
import { ExplorePatronProfilesInput, ExplorePostsInput, ExploreStaffProfilesInput, ExploreVenuesInput, SearchStaffProfilesInput } from '@swm-core/interfaces/explore.interface';
import { OnboardingStep, UserRole } from '@swm-core/interfaces/profile.interface';
import { SortDirection } from '@swm-core/interfaces/sort-direction.interface';
import { ModelExploreVenuesConnection, SearchYelpBusinessesRes, Venue, YelpBusinessRes } from '@swm-core/interfaces/workplace.interface';
import { removeEmptyArray, removeUndefined } from '@swm-core/utils/normalization.util';
import { ElasticSearchService } from './elasticsearch.service';
import { SSMService } from './ssm.service';
import { YelpService } from './yelp.service';

const {
  API_ES_ENDPOINT,
  YELP_API_KEY
} = process.env;

const ssmService = new SSMService();
let elasticSearchService;
const loadElasticSearchInstance = async (API_ES_ENDPOINT: string) => {
  if (!elasticSearchService) {
    elasticSearchService = await ElasticSearchService.createAsync(API_ES_ENDPOINT);
  }
  return elasticSearchService;
}
let yelpService;
const loadYelpInstance = async (keyName) => {
  // User SSM Parameter to get key
  // throw error if secret not found
  // use local variables to caching secret key during lambda lifetime
  if (!yelpService) {
    const secretKey = await ssmService.getParameter({
      Name: keyName,
      WithDecryption: true,
    });

    yelpService = new YelpService(secretKey.Parameter.Value);
  }
  return yelpService;
};
export class ExploreService {

  /**
   * Explore staff profile:
   * 1. Profile must be have future shift event - Deprecated: Client also want to show profile have old shift event
   * 2. Profile are blocked / deleted will be avoided
   * 3. Profile will return in distance||3 miles
   * 4. Privacy profile will be returned if have connection
   * 5. Privacy profile will be returned if allow show on Explore
   * 6. If filter input keyword: profile name must matched the keyword
   * 7. Order/Ranking:
   *    1) People in proximity (physical distance) || People most popular (by sitting with total)
   *    2) Profile name
   *    3) Avatar
   */
  async exploreStaffProfiles(
    filter: ExploreStaffProfilesInput,
    limit: number = ExploreConst.limit,
    offset: number = 0,
    sortBy: ExploreProfileSortBy = ExploreProfileSortBy.DISTANCE,
    sortDirection: SortDirection = SortDirection.ASC
  ) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    let now = new Date().toISOString();
    const boolQueryFilter: { [key: string]: any }[] = [
      {
        // 3. Profile will return in distance || 3 miles
        geo_distance: {
          distance: `${filter.geoLocation?.distance || ExploreConst.distance}mi`,
          'workplaceConnection.geolocation': {
            lat: filter.geoLocation.location.latitude,
            lon: filter.geoLocation.location.longitude,
          },
        }
      }
      // {
      //   // 1. Profile must be have future shift event - Deprecated
      //   bool: {
      //     should: [
      //       { range: { endDate: { gte: now } } },
      //       { bool: { must_not: { exists: { field: 'endDate' } } } }
      //     ]
      //   }
      // }
    ];
    const boolQueryMustNot: { [key: string]: any }[] = [
      // 2. Profile are blocked / deleted will be avoided
      {
        term: {
          'profileConnection.blockedProfileIDs.keyword': filter.profileID
        }
      },
      {
        term: {
          'profileConnection.deleted': true
        }
      },
    ];
    let boolQueryShould: { [key: string]: any }[] = [];
    const boolQueryFilterPrivacy: { [key: string]: any }[] = [
      // 4. Privacy profile will be returned if have connection
      {
        bool: {
          filter: [
            {
              term: {
                'profileConnection.privacy': true
              }
            },
            {
              term: {
                'profileConnection.followingProfileIDs.keyword': filter.profileID
              }
            }
          ]
        }
      },
      // 5. Privacy profile will be returned if allow show on Explore
      {
        bool: {
          filter: [
            {
              term: {
                'profileConnection.privacy': true
              }
            },
            {
              term: {
                'profileConnection.showInExplore': true
              }
            }
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              term: {
                'profileConnection.privacy': true
              }
            }
          ]
        }
      }
    ];
    let sort: any[] = [
      'profileConnection.fullName.keyword',
      {
        '_script': {
          'type': 'number',
          'script': {
            'source': "if (doc['profileConnection.avatarID.keyword'].value != 'null') return 1; return 0",
          },
          'order': 'desc'
        }
      },
    ];
    let scriptFields: { [key: string]: any } = {
      distance: {
        script: {
          params: {
            lat: filter.geoLocation.location.latitude,
            lon: filter.geoLocation.location.longitude
          },
          inline: "doc['workplaceConnection.geolocation'].arcDistance(params.lat,params.lon)"
        }
      }
    };

    if (sortBy === ExploreProfileSortBy.DISTANCE) {
      sort.unshift({
        _geo_distance: {
          'workplaceConnection.geolocation': `${filter.geoLocation.location.latitude}, ${filter.geoLocation.location.longitude}`,
          order: sortDirection.toLowerCase(),
          unit: 'mi',
          distance_type: 'arc'
        }
      });
    }
    if (sortBy === ExploreProfileSortBy.POPULAR) {
      sort.unshift({
        'profileConnection.connectionCount': {
          order: sortDirection.toLowerCase(),
        }
      });
    }

    if (filter.price?.length) {
      boolQueryFilter.push({
        terms: {
          'workplaceConnection.price': filter.price,
        }
      });
    }

    if (filter.jobType?.length) {
      boolQueryFilter.push({
        terms: {
          'jobConnection.name.keyword': filter.jobType,
        }
      });
    }

    if (filter.cuisine?.length) {
      boolQueryFilter.push({
        terms: {
          'workplaceConnection.categories.keyword': filter.cuisine,
        }
      });
    }

    // 6. If filter input keyword: profile name must matched the keyword
    if (filter.keyword) {
      boolQueryFilter.push({
        query_string: {
          query: filter.keyword,
          default_field: 'profileConnection.fullName',
          minimum_should_match: '3<75%',
          type: 'phrase_prefix'
        }
      });
    }
    boolQueryFilter.push({ bool: { should: boolQueryFilterPrivacy } });

    /**
     * Trigger filter by duty only have one value: ON or OFF
     * If filter explore by off duty, need to filter by must_not
     */
    if (filter.duty?.length === 1) {
      (filter.duty[0] ? boolQueryFilter : boolQueryMustNot).push({
        nested: {
          path: 'dutyRanges',
          query: {
            bool: {
              must: [
                {
                  range: {
                    'dutyRanges.start': {
                      lte: now
                    }
                  }
                },
                {
                  range: {
                    'dutyRanges.end': {
                      gte: now
                    }
                  }
                }
              ]
            }
          }
        }
      });
    }

    const boolQuery = removeEmptyArray({
      should: boolQueryShould,
      filter: boolQueryFilter,
      must_not: boolQueryMustNot,
    });

    const searchBody: { [key: string]: any } = removeUndefined({
      size: limit,
      from: offset,
      query: {
        bool: boolQuery,
      },
      sort,
      script_fields: scriptFields,
      stored_fields: '_source',
    });

    const result = await elasticSearchService.search('exploreprofile', searchBody);
    const items = (result?.body?.hits?.hits || []).map(item => {
      return { ...item._source, ...item.fields }
    });
    const total = result?.body?.hits?.total || 0;
    return {
      items,
      offset,
      hasNext: offset + limit < total,
    }
  }

  /**
   * Search staff profile:
   * 1. Profile in connection will be consider to higher ranking (score for sorting)
   * 2. Profile are blocked / deleted will be avoided
   * 3. If filter input geoLocation: profile will return in distance||3 miles
   * 4. If filter input keyword: profile name or workplace name must matched the keyword
   * 5. Order/Ranking:
   *    1) People in my network will show up first.
   *    2) People in proximity (physical distance)
   *    3) Popular profiles - profile pic -> number of connections -> number of posts
   *    4) Anybody else that match the query
   */
  async searchStaffProfiles(
    filter: SearchStaffProfilesInput,
    limit: number = ExploreConst.limit,
    offset: number = 0
  ) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    const boolQueryMust: { [key: string]: any }[] = [];
    const boolQueryFilter: { [key: string]: any }[] = [];
    const boolQueryMustNot: { [key: string]: any }[] = [
      // 2. Profile are blocked / deleted will be avoided
      {
        term: {
          'profileConnection.blockedProfileIDs.keyword': filter.profileID
        }
      },
      {
        term: {
          'profileConnection.deleted': true
        }
      }
    ];
    const boolQueryShould: { [key: string]: any }[] = [
      // 1. Profile in connection will be consider to higher ranking (score for sorting)
      {
        constant_score: {
          filter: {
            term: {
              'profileConnection.followingProfileIDs.keyword': filter.profileID
            }
          }
        }
      }
    ];
    let sort: any[] = ['_score'];
    let scriptFields: { [key: string]: any };

    // 3. If filter input geoLocation: profile will return in distance||3 miles
    if (filter.geoLocation) {
      boolQueryFilter.push(
        {
          geo_distance: {
            distance: `${filter.geoLocation?.distance || ExploreConst.distance}mi`,
            'workplaceConnection.geolocation': {
              lat: filter.geoLocation.location.latitude,
              lon: filter.geoLocation.location.longitude,
            },
          }
        }
      );

      sort.push({
        _geo_distance: {
          'workplaceConnection.geolocation': `${filter.geoLocation.location.latitude}, ${filter.geoLocation.location.longitude}`,
          order: 'asc',
          unit: 'mi',
          distance_type: 'arc'
        }
      });

      scriptFields = {
        distance: {
          script: {
            params: {
              lat: filter.geoLocation.location.latitude,
              lon: filter.geoLocation.location.longitude
            },
            inline: "doc['workplaceConnection.geolocation'].arcDistance(params.lat,params.lon)"
          }
        }
      };
    }

    // 4. If filter input keyword: profile name must matched the keyword
    if (filter.keyword) {
      boolQueryFilter.push(
        {
          multi_match: {
            query: filter.keyword,
            fields: ['profileConnection.fullName', 'workplaceConnection.name', 'profileConnection.userName'],
            minimum_should_match: '3<75%',
            type: 'phrase_prefix'
          }
        }
      );
    }

    const boolQuery = removeEmptyArray({
      must: boolQueryMust,
      filter: boolQueryFilter,
      should: boolQueryShould,
      must_not: boolQueryMustNot,
    });
    sort = [
      ...sort,
      {
        '_script': {
          'type': 'number',
          'script': {
            'source': "if (doc['profileConnection.avatarID.keyword'].value != 'null') return 1; return 0",
          },
          'order': 'desc'
        }
      },
      { 'profileConnection.connectionCount': 'desc' },
      { 'profileConnection.postCount': 'desc' },
      'profileConnection.fullName.keyword',
      'profileConnection.userName.keyword',
    ];

    let searchBody: { [key: string]: any } = removeUndefined({
      size: limit,
      from: offset,
      query: {
        bool: boolQuery,
      },
      sort,
      script_fields: scriptFields,
      stored_fields: '_source',
    });

    const result = await elasticSearchService.search('exploreprofile', searchBody);
    const items = (result?.body?.hits?.hits || []).map(item => {
      return { ...item._source, ...item.fields }
    });
    const total = result?.body?.hits?.total || 0;
    return {
      items,
      offset,
      hasNext: offset + limit < total,
    }
  }

  /**
   * 1. Default get all venues is 25 miles. Default unit Yelp support is meter (Max 40000)
   * 2. Default sort venues by distance
   * 3. List cuisines is Yelp business categories alias
   */
  async exploreVenues(filter: ExploreVenuesInput, limit: number = ExploreConst.limit, offset: number = 0): Promise<ModelExploreVenuesConnection> {
    // 1. Default get all venues is 25 miles. Default unit Yelp support is meter (Max 40000)
    let searchParams: {[key: string]: any} = {
      latitude: filter.geoLocation?.location.latitude,
      longitude: filter.geoLocation?.location.longitude,
      radius: Math.min(Math.round((filter.geoLocation?.distance || YelpConst.defaultExploreDistance) * YelpConst.mileToMeters), YelpConst.maximumYelpDistance),
      limit,
      offset,
      // 2. Default sort venues by distance
      sort_by: 'distance',
      categories: YelpConst.restrictCategoriesWithAllSubAndSubCategories(),
    };

    if (filter.keyword) {
      searchParams = {
        ...searchParams,
        term: filter.keyword,
      }
    }
    if (filter.price?.length) {
      searchParams = {
        ...searchParams,
        price: filter.price.join(','),
      }
    }
    // 3. List cuisines is yelp business categories alias
    if (filter.cuisine?.length) {
      searchParams = {
        ...searchParams,
        categories: filter.cuisine.join(','),
      }
    }

    console.log('Start Explore Yelp Business: ', searchParams);
    const yelpService = await loadYelpInstance(YELP_API_KEY);
    const searchVenueRes: SearchYelpBusinessesRes = await yelpService.searchBusiness(searchParams);
    console.log('searchVenueRes: ', JSON.stringify(searchVenueRes, null, 2));
    const venues: Venue[] = searchVenueRes.businesses.map((business: YelpBusinessRes) => {
      return {
        yelpBusinessID: business.id,
        name: business.name,
        location: {
          latitude: business.coordinates?.latitude,
          longitude: business.coordinates?.longitude,
        },
        fullAddress: `${business.location?.address1}, ${business.location?.city}, ${business.location?.state}`,
        imageUrl: business.image_url,
        categories: business.categories.map(item => item.title),
        yelpCategories: business.categories,
        price: business.price?.length || 0,
        rating: business.rating,
        reviewCount: business.review_count || 0,
      }
    });

    return {
      items: venues,
      hasNext: searchVenueRes.total - offset > limit,
      offset,
    }
  }

  /**
   * 1. Default get all venues is 25 miles.
   * 2. Default sort venues by distance
   * 3. List cuisines is Yelp business categories alias
   */
  async exploreVenuesByProfileInfo(filter: ExploreVenuesInput, limit: number = ExploreConst.limit, offset: number = 0, nextToken?: string): Promise<ModelExploreVenuesConnection> {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    let now = new Date().toISOString();
    const searchBody: {[key: string]: any} = {
      'size': 0,
      'query': {
        'bool': {
          'must': [
            {
              'match_all': {}
            }
          ],
          'filter': [
            {
              // 1. Default get all venues is 25 miles.
              'geo_distance': {
                'distance': `${filter.geoLocation?.distance || YelpConst.defaultExploreDistance}mi`,
                'workplaceConnection.geolocation': {
                  'lat': filter.geoLocation?.location.latitude,
                  'lon': filter.geoLocation?.location.longitude
                }
              }
            },
            {
              'bool': {
                'should': [
                  { 'range': { 'endDate': { 'gte': now } } },
                  { 'bool': { 'must_not': { 'exists': { 'field': 'endDate' } } } }
                ]
              }
            }

          ],
          must_not: [
            {
              term: {
                'profileConnection.deleted': true
              }
            }
          ]
        }
      },
      'aggs': {
        'venues': {
          'composite': {
            'size': limit,
            'sources': [
              {
                'distance': {
                  // 2. Default sort venues by distance
                  'histogram': {
                    'interval': 0.05, // Group by distance using histogram require to get closet distance
                    'script': {
                      'params': {
                        'lat': filter.geoLocation?.location.latitude,
                        'lon': filter.geoLocation?.location.longitude
                      },
                      'inline': "doc['workplaceConnection.geolocation'].arcDistance(params.lat,params.lon)"
                    },
                    'order': 'asc'
                  }
                }
              },
              {
                'yelpBusinessID.keyword': {
                  'terms': {
                    'field': 'yelpBusinessID.keyword'
                  }
                }
              }
            ]
          },
          'aggs': {
            'doc': {
              'top_hits': {
                'size': 1,
                '_source': {
                  'include': [
                    'workplaceConnection'
                  ]
                }
              }
            }
          }
        }
      }
    };

    // nextToken is combine value of distance and yelpBusinessID
    if (nextToken) {
      const token = nextToken.split(',');
      searchBody.aggs.venues.composite.after = {
        distance: token[0],
        'yelpBusinessID.keyword': token[1],
      }
    }

    if (filter.keyword) {
      searchBody.query.bool.must.push({
        query_string: {
          query: `*${filter.keyword}*`,
          default_field: 'workplaceConnection.name',
        }
      });
    }

    if (filter.price?.length) {
      searchBody.query.bool.must.push({
        terms: {
          'workplaceConnection.price': filter.price,
        }
      });
    }

    if (filter.jobType?.length) {
      searchBody.query.bool.must.push({
        terms: {
          'jobConnection.name.keyword': filter.jobType,
        }
      });
    }

    // 3. List cuisines is Yelp business categories alias
    if (filter.cuisine?.length) {
      searchBody.query.bool.must.push({
        nested: {
          path: 'workplaceConnection.categories',
          query: {
            bool: {
              must: [
                {
                  terms: { 'workplaceConnection.yelpCategories.alias.keyword': filter.cuisine }
                }
              ]
            }
          }
        }
      });
    }

    if (filter.duty?.length === 1) {
      searchBody.query.bool[filter.duty[0] ? 'must' : 'must_not'].push({
        nested: {
          path: 'dutyRanges',
          query: {
            bool: {
              must: [
                {
                  range: {
                    'dutyRanges.start': {
                      lte: now
                    }
                  }
                },
                {
                  range: {
                    'dutyRanges.end': {
                      gte: now
                    }
                  }
                }
              ]
            }
          }
        }
      });
    }

    const result = await elasticSearchService.search('exploreprofile', searchBody);
    const venueResults = result?.body?.aggregations?.venues;
    const venues: Venue[] = venueResults ? venueResults.buckets.map((item) => item.doc.hits.hits[0]?._source?.workplaceConnection) : [];
    // nextToken is combine value of distance and yelpBusinessID
    const lastKey = venues.length ? venueResults.buckets[venueResults.buckets.length - 1].key : null;
    return {
      items: venues,
      nextToken: lastKey ? Object.values(lastKey).join(',') : null,
      hasNext: !!lastKey,
      offset
    };
  }

  async explorePosts(filter: ExplorePostsInput, limit: number = ExploreConst.limit, offset: number = 0) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    const boolQueryMust: { [key: string]: any }[] = [];
    const boolQueryMustNot: { [key: string]: any }[] = [
      {
        term: {
          'profileConnection.blockedProfileIDs.keyword': filter.profileID
        }
      },
      {
        term: {
          'profileConnection.deleted': true
        }
      }
    ];
    // Post of privacy profile will be returned if have connection
    const boolQueryFilterPrivacy: { [key: string]: any }[] = [
      {
        bool: {
          filter: [
            {
              term: {
                'profileConnection.privacy': true
              }
            },
            {
              term: {
                'profileConnection.followingProfileIDs.keyword': filter.profileID
              }
            }
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              term: {
                'profileConnection.privacy': true
              }
            }
          ]
        }
      }
    ];
    const boolQueryFilter: { [key: string]: any }[] = [
      {
        bool: {
          should: boolQueryFilterPrivacy
        }
      }
    ];

    if (filter.keyword) {
      boolQueryMust.push({
        query_string: {
          query: filter.keyword,
          default_field: 'caption',
          minimum_should_match: '3<75%',
        }
      });
    }

    const boolQuery = removeEmptyArray({
      must: boolQueryMust,
      filter: boolQueryFilter,
      must_not: boolQueryMustNot,
    });

    let searchBody: { [key: string]: any } = removeUndefined({
      size: limit,
      from: offset,
      query: {
        bool: boolQuery,
      },
      stored_fields: '_source',
    });

    const result = await elasticSearchService.search('post', searchBody);
    const items = (result?.body?.hits?.hits || []).map(item => item._source);
    const total = result?.body?.hits?.total || 0;
    return {
      items,
      offset,
      hasNext: offset + limit < total,
    }
  }

  /**
   * Explore patron profile:
   * 1. Profile must be completed
   * 2. Profile in connection will be consider to higher ranking (score for sorting)
   * 3. Profile are Staff role or blocked / deleted will be avoided
   * 4. If filter input geoLocation: profile will return in distance||3 miles
   * 5. If filter input keyword: profile name must matched the keyword
   * 6. Order/Ranking:
   *    1) People in my network will show up first.
   *    2) People in proximity (physical distance)
   *    3) Popular profiles - profile pic -> number of connections -> number of posts
   *    4) Anybody else that match the query
   */
  async explorePatronProfiles(filter: ExplorePatronProfilesInput, limit: number = ExploreConst.limit, offset: number = 0) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    const boolQueryMust: { [key: string]: any }[] = [];
    const boolQueryFilter: { [key: string]: any }[] = [
      // 1. Profile must be completed
      {
        term: {
          'onboardingStep.keyword': OnboardingStep.COMPLETED,
        }
      }
    ];
    const boolQueryShould: { [key: string]: any }[] = [
      // 2. Profile in connection will be consider to higher ranking
      {
        constant_score: {
          filter: {
            term: {
              'followingProfileIDs.keyword': filter.profileID
            }
          }
        }
      }
    ];
    const boolQueryMustNot: { [key: string]: any }[] = [
      // 3. Profile are Staff role || blocked || deleted will be avoided
      {
        term: {
          'blockedProfileIDs.keyword': filter.profileID
        }
      },
      {
        term: {
          'role.keyword': UserRole.STAFF
        }
      },
      {
        term: {
          'userConnection.deleted': true
        }
      }
    ];
    let sort: any[] = ['_score'];
    let scriptFields: { [key: string]: any };

    // 4. If filter input geoLocation: profile will return in distance||3 miles
    if (filter.geoLocation) {
      boolQueryFilter.push(
        {
          geo_distance: {
            distance: `${filter.geoLocation?.distance || ExploreConst.distance}mi`,
            'userConnection.userLocation.geolocation': {
              lat: filter.geoLocation.location.latitude,
              lon: filter.geoLocation.location.longitude,
            },
          }
        }
      );

      sort.push({
        _geo_distance: {
          'userConnection.userLocation.geolocation': `${filter.geoLocation.location.latitude}, ${filter.geoLocation.location.longitude}`,
          order: 'asc',
          unit: 'mi',
          distance_type: 'arc'
        }
      });

      scriptFields = {
        distance: {
          script: {
            params: {
              lat: filter.geoLocation.location.latitude,
              lon: filter.geoLocation.location.longitude
            },
            inline: "doc['userConnection.userLocation.geolocation'].arcDistance(params.lat,params.lon)"
          }
        }
      };
    }

    // 5. If filter input keyword: profile name must matched the keyword
    if (filter.keyword) {
      boolQueryFilter.push(
        {
          query_string: {
            query: filter.keyword,
            fields: ['userConnection.fullName', 'userConnection.userName'],
            minimum_should_match: '3<75%',
            type: 'phrase_prefix'
          }
        }
      );
    }

    const boolQuery = removeEmptyArray({
      must: boolQueryMust,
      filter: boolQueryFilter,
      should: boolQueryShould,
      must_not: boolQueryMustNot,
    });
    sort = [
      ...sort,
      {
        '_script': {
          'type': 'number',
          'script': {
            'source': "if (doc['avatarID.keyword'].value != 'null') return 1; return 0",
          },
          'order': 'desc'
        }
      },
      { 'sittingWithTotal': 'desc' },
      { 'postCount': 'desc' },
      'userConnection.fullName.keyword',
      'userConnection.userName.keyword',
    ];

    let searchBody: { [key: string]: any } = removeUndefined({
      size: limit,
      from: offset,
      query: {
        bool: boolQuery,
      },
      sort,
      script_fields: scriptFields,
      stored_fields: '_source',
    });

    const result = await elasticSearchService.search('profile', searchBody);
    const items = (result?.body?.hits?.hits || []).map(item => {
      return { ...item._source, ...item.fields }
    });
    const total = result?.body?.hits?.total || 0;
    return {
      items,
      offset,
      hasNext: offset + limit < total,
    }
  }
}
