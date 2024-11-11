import { ExploreConst } from '@swm-core/constants/explore.const';
import { removeEmptyArray, removeUndefined } from '@swm-core/utils/normalization.util';
import { ElasticSearchService } from './elasticsearch.service';

const {
  API_ES_ENDPOINT
} = process.env;

let elasticSearchService;
const loadElasticSearchInstance = async (API_ES_ENDPOINT: string) => {
  if (!elasticSearchService) {
    elasticSearchService = await ElasticSearchService.createAsync(API_ES_ENDPOINT);
  }
  return elasticSearchService;
}
export class ShiftSearchService {
  async listWorkingShiftsByYelpBusinessID(
    yelpBusinessID: string,
    limit: number = ExploreConst.maximumLimit,
    offset: number = 0
  ) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    let now = new Date().toISOString();
    const boolQueryMust: { [key: string]: any }[] = [];
    const boolQueryFilter: { [key: string]: any }[] = [
      {
        // 1. Profile must be have future shift event
        bool: {
          should: [
            { range: { endDate: { gte: now } } },
            { bool: { must_not: { exists: { field: 'endDate' } } } }
          ]
        }
      },
      {
        // 2. Profile must be working at yelp business id
        term: {
          'workplaceConnection.yelpBusinessID.keyword': yelpBusinessID
        }
      },
    ];
    const boolQueryMustNot: { [key: string]: any }[] = [
      // 3. Profile are deleted will be avoided
      {
        term: {
          'profileConnection.deleted': true
        }
      }
    ];

    const boolQuery = removeEmptyArray({
      must: boolQueryMust,
      filter: boolQueryFilter,
      must_not: boolQueryMustNot,
    });

    let hasNext = true;
    let shifts = [];
    do {
      let searchBody: { [key: string]: any } = removeUndefined({
        size: limit,
        from: offset,
        query: {
          bool: boolQuery,
        },
      });

      const result = await elasticSearchService.search('exploreprofile', searchBody);
      const items = (result?.body?.hits?.hits || []).map(item => item._source);
      shifts = [ ...shifts, ...items];

      const total = result?.body?.hits?.total || 0;
      hasNext = offset + limit < total;
      offset += limit;
    } while (hasNext);
    return shifts;
  }
}