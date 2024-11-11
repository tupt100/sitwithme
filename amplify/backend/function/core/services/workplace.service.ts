import { v4 as uuidv4 } from 'uuid';

import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { Category, CategoryRes, CreateVenueFavoriteInput, SearchYelpBusinessesInput, SearchYelpBusinessesRes, UpdateWorkplaceInput, Venue, VenueFavorite, VenueFavoriteV2, Workplace, WorkplaceInput, YelpBusiness, YelpBusinessConnection, YelpBusinessRes } from '@swm-core/interfaces/workplace.interface';
import { DynamoDBService } from './dynamodb.service';
import { SSMService } from './ssm.service';
import { YelpService } from './yelp.service';
import { YelpConst } from '@swm-core/constants/yelp.const';
import { Location } from '@swm-core/interfaces/location.interface';
import { PatronProfile } from '@swm-core/interfaces/profile.interface';
import { SNSService } from './sns-service';
import { changed } from '@swm-core/utils/comparison.util';

const {
  API_SITWITHME_WORKPLACETABLE_NAME,
  API_SITWITHME_VENUEFAVORITETABLE_NAME,
  API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
  YELP_API_KEY,
  YELP_VENUE_SYNC_TOPIC_ARN,
} = process.env;

const dynamoDBService = new DynamoDBService();
const ssmService = new SSMService();
const snsService = new SNSService();

let yelpService: YelpService;
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

export class WorkplaceService {

  async create(workplace: WorkplaceInput): Promise<Workplace> {
    console.log('Start create workplace: ', workplace);

    await this.validateWorkplace(workplace);

    const yelpWorkplace: YelpBusiness = await this.getYelpBusiness(workplace.yelpBusinessID);
    if (!yelpWorkplace) {
      throw new BadRequestException('Workplace business not found');
    }

    const workplaceInput: Workplace = {
      ...workplace,
      id: uuidv4(),
      __typename: 'Workplace',
      createdAt: new Date().toISOString(),
      categories: yelpWorkplace.categories,
      yelpCategories: yelpWorkplace.yelpCategories,
      price: yelpWorkplace.price || 0,
      rating: yelpWorkplace.rating,
      imageUrl: yelpWorkplace.imageUrl,
      reviewCount: yelpWorkplace.reviewCount || 0,
    };
    const params = {
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      Item: workplaceInput,
    };
    await dynamoDBService.put(params);
    return workplaceInput;
  }

  async update(id: string, input: UpdateWorkplaceInput): Promise<Workplace> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Workplace;
  }

  async syncWorkplacesFromYelpBusiness(yelpBusiness: YelpBusiness) {
    const workplaces = await this.listWorkplacesByYelpBusinessID(yelpBusiness.id);
    if (workplaces.length > 0) {
      const input: UpdateWorkplaceInput = {
        name: yelpBusiness.name,
        location: yelpBusiness.location,
        fullAddress: yelpBusiness.fullAddress,
        yelpCategories: yelpBusiness.yelpCategories,
        price: yelpBusiness.price || 0,
        reviewCount: yelpBusiness.reviewCount || 0,
        imageUrl: yelpBusiness.imageUrl || null,
        rating: yelpBusiness.rating || null
      };
      const workplace = workplaces[0];
      const workplaceAttr = {
        name: workplace.name,
        location: workplace.location,
        fullAddress: workplace.fullAddress,
        yelpCategories: workplace.yelpCategories,
        price: workplace.price || 0,
        reviewCount: workplace.reviewCount || 0,
        imageUrl: workplace.imageUrl || null,
        rating: workplace.rating || null
      };

      if (changed(workplaceAttr, input)) {
        console.log('workplaceAttr: ', JSON.stringify(workplaceAttr, null, 2));
        console.log('yelpBusiness: ', JSON.stringify(input, null, 2));
        console.log('Changed detect. Updated...');
        const tasks = workplaces.map((w) => this.update(w.id, input));
        await Promise.all(tasks);
      } else {
        console.log('Not changed. Skip.');
      }
    }
  }

  async listWorkplacesByYelpBusinessID(yelpBusinessID: string): Promise<Workplace[]> {
    const params = {
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      IndexName: 'byYelpBusinessID',
      KeyConditionExpression: '#yelpBusinessID = :yelpBusinessID',
      ExpressionAttributeNames: {
        '#yelpBusinessID': 'yelpBusinessID',
      },
      ExpressionAttributeValues: {
        ':yelpBusinessID': yelpBusinessID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Workplace[];
    }
    return [];
  }

  async getWorkplaceByYelpBusinessID(yelpBusinessID: string): Promise<Workplace> {
    return (await this.listWorkplacesByYelpBusinessID(yelpBusinessID))[0] as Workplace;
  }

  async listVenueFavoriteByYelpBusinessID(yelpBusinessID: string): Promise<VenueFavoriteV2[]> {
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
      IndexName: 'byYelpBusinessID',
      KeyConditionExpression: '#yelpBusinessID = :yelpBusinessID',
      ExpressionAttributeNames: {
        '#yelpBusinessID': 'yelpBusinessID',
      },
      ExpressionAttributeValues: {
        ':yelpBusinessID': yelpBusinessID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as VenueFavoriteV2[];
    }
    return [];
  }

  async getVenueFavoriteByYelpBusinessID(yelpBusinessID: string): Promise<VenueFavoriteV2> {
    return (await this.listVenueFavoriteByYelpBusinessID(yelpBusinessID))[0] as VenueFavoriteV2;
  }

  async getWorkplaceByYelpBusinessIDAndProfileID(profileID: string, yelpBusinessID: string): Promise<Workplace> {
    const params = {
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      IndexName: 'byYelpBusinessID',
      KeyConditionExpression: '#yelpBusinessID = :yelpBusinessID',
      FilterExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#yelpBusinessID': 'yelpBusinessID',
        '#profileID': 'profileID',
      },
      ExpressionAttributeValues: {
        ':yelpBusinessID': yelpBusinessID,
        ':profileID': profileID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      console.log('getWorkplaceByYelpBusinessIDAndProfileID: ', params, result.Items);
      return result.Items[0] as Workplace;
    }
  }

  async searchYelpBusiness(params: SearchYelpBusinessesInput, limit: number = 20, offset: number = 0): Promise<YelpBusinessConnection> {
    if (
      !params.location ||
      !params.location?.latitude ||
      !params.location?.longitude
    ) {
      throw new BadRequestException('Location is required');
    }

    const searchParams = {
      latitude: params.location?.latitude,
      longitude: params.location?.longitude,
      term: params.keyword,
      categories: YelpConst.restrictCategoriesWithAllSubAndSubCategories(),
      limit,
      offset,
    }
    console.log('Start Search Yelp Business: ', searchParams);

    const yelpService = await loadYelpInstance(YELP_API_KEY);
    const searchYelpBusinessesRes: SearchYelpBusinessesRes = await yelpService.searchBusiness(searchParams);
    // Filter out business which missing geolocation
    let businesses: YelpBusiness[] = searchYelpBusinessesRes.businesses.map((business: YelpBusinessRes) => {
      if (business.coordinates?.latitude && business.coordinates?.longitude) {
        return {
          id: business.id,
          name: business.name,
          location: {
            latitude: business.coordinates?.latitude,
            longitude: business.coordinates?.longitude,
          },
          fullAddress: `${business.location?.address1}, ${business.location?.city}, ${business.location?.state}`,
        }
      }
      return null;
    });
    businesses = businesses.filter(item => item);
    const hasNext: boolean = searchYelpBusinessesRes.total - offset > limit;

    return {
      items: businesses,
      hasNext,
    }
  }

  serializeBusiness(business: YelpBusinessRes): YelpBusiness {
    return {
      id: business.id,
      name: business.name,
      location: {
        latitude: business.coordinates?.latitude,
        longitude: business.coordinates?.longitude,
      },
      fullAddress: `${business.location?.address1}, ${business.location?.city}, ${business.location?.state}`,
      categories: business.categories?.map(category => category.title),
      yelpCategories: business.categories,
      price: business.price?.length || 0,
      rating: business.rating,
      imageUrl: business.image_url,
      reviewCount: business.review_count || 0,
    }
  }

  async getYelpBusiness(id: string, sync: boolean = true): Promise<YelpBusiness> {
    const yelpService = await loadYelpInstance(YELP_API_KEY);
    const business: YelpBusinessRes = await yelpService.getBusiness(id);
    console.log('business: ', business);
    if (business) {
      // sync yelp data to our DB
      const yelpBusiness = this.serializeBusiness(business);
      if (sync) {
        try {
          await snsService.publish({
            Message: JSON.stringify(yelpBusiness),
            TopicArn: YELP_VENUE_SYNC_TOPIC_ARN,
          });
        } catch (e) {
          // silent errors
          console.log('ERROR when sync from Yelp', e);
        }
      }

      return yelpBusiness;
    }
  }

  async listPopularYelpBusinesses(location: Location, limit: number): Promise<Venue[]> {
    const yelpService = await loadYelpInstance(YELP_API_KEY);
    const businesses: SearchYelpBusinessesRes = await yelpService.searchBusiness({
      latitude: location.latitude,
      longitude: location.longitude,
      categories: YelpConst.restrictCategoriesWithAllSubAndSubCategories(),
      limit,
      attributes: 'hot_and_new'
    });
    return businesses.businesses.map((business: YelpBusinessRes) => {
      return {
        yelpBusinessID: business.id,
        name: business.name,
        location: {
          latitude: business.coordinates?.latitude,
          longitude: business.coordinates?.longitude,
        },
        fullAddress: `${business.location?.address1}, ${business.location?.city}, ${business.location?.state}`,
        categories: business.categories?.map(category => category.title),
        yelpCategories: business.categories,
        price: business.price?.length || 0,
        rating: business.rating,
        imageUrl: business.image_url,
        reviewCount: business.review_count || 0,
      }
    });
  }

  /**
   * List categories are restrict to match with business requirement: food, restaurants, nightlife
   */
  async listCategories(): Promise<CategoryRes[]> {
    const yelpService = await loadYelpInstance(YELP_API_KEY);
    const categories: Category[] = await yelpService.listCategories();
    if (!categories.length) {
      return [];
    }

    const restrictCategories: string[] = YelpConst.restrictCategories().split(',');
    // List category are restrict to match with business requirement: food, restaurant, nightlife
    const parentCategories: Category[] = categories.filter(item => restrictCategories.includes(item.alias));
    const categoryRes: CategoryRes[] = [];
    parentCategories.forEach(parentCategory => {
      categoryRes.push({
        ...parentCategory,
        subCategories: this.getSubCategories(categories, parentCategory)
      })
    });
    return categoryRes;
  }

  // Get subCategories for a category
  getSubCategories(categories: Category[], parentCategory): Category[] {
    let subCategories: Category[] = categories.filter(item => {
      // Only pick the restricted sub categories in food
      if (parentCategory.alias === YelpConst.foodCategory) {
        const restrictFoodCategories = YelpConst.restrictSubCategoriesInFood.split(',');
        return item.parent_aliases?.find(i => i === parentCategory.alias) && restrictFoodCategories.includes(item.alias);
      }
      return item.parent_aliases?.find(i => i === parentCategory.alias);
    });

    if (subCategories.length) {
      subCategories = subCategories.map(item => {
        item.subCategories = this.getSubCategories(categories, item);
        return item;
      })
    }
    return subCategories;
  }

  async validateWorkplace(workplace: WorkplaceInput): Promise<void> {
    console.log('Start validation workplace: ', workplace);
    let errors: { [key: string]: string[] } = {
      name: [],
      yelpBusinessID: [],
      location: [],
      fullAddress: [],
    };

    if (!workplace.name) {
      errors.name.push(`Workplace's name is required`);
    }
    if (!workplace.yelpBusinessID) {
      errors.yelpBusinessID.push(`Business's id is required`);
    }
    if (workplace.yelpBusinessID) {
      const existedWorkplace = await this.getWorkplaceByYelpBusinessIDAndProfileID(workplace.profileID, workplace.yelpBusinessID);
      if (existedWorkplace) {
        errors.yelpBusinessID.push(`Business ${workplace.name} is existed`);
      }
    }
    if (!workplace.location?.latitude || !workplace.location?.longitude) {
      errors.location.push(`Workplace's location is required`);
    }
    if (!workplace.fullAddress) {
      errors.fullAddress.push(`Workplace's address is required`);
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });

    console.log('End validation workplace: ', errors);
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  async delete(id: string): Promise<void> {
    await dynamoDBService.delete({
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      Key: { id },
    });
  }

  async batchDelete(IDs: string[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_WORKPLACETABLE_NAME,
      IDs.map(_id => ({ id: _id }))
    );
  }

  async deleteVenueFavories(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
      keys.map(key => ({ profileID: key.profileID, yelpBusinessID: key.yelpBusinessID }))
    );
  }

  async get(id: string): Promise<Workplace> {
    return <Workplace>(await dynamoDBService.get({
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      Key: { id },
    })).Item;
  }

  async allWorkplacesByProfileID(profileID: string): Promise<Workplace[]> {
    let workplaces: Workplace[] = [];
    const params = {
      TableName: API_SITWITHME_WORKPLACETABLE_NAME,
      IndexName: 'byProfile',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      workplaces = result as Workplace[];
    }

    return workplaces;
  }

  async getVenueFavorite(profileID: string, yelpBusinessID: string): Promise<VenueFavorite> {
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITETABLE_NAME,
      IndexName: 'byProfileSortByYelpBusinessID',
      KeyConditionExpression: '#profileID = :profileID AND #yelpBusinessID = :yelpBusinessID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
        '#yelpBusinessID': 'yelpBusinessID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
        ':yelpBusinessID': yelpBusinessID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as VenueFavorite;
    }
  }

  async getVenueFavoriteV2(profileID: string, yelpBusinessID: string): Promise<VenueFavoriteV2> {
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
      Key: {
        profileID,
        yelpBusinessID
      }
    };
    const result = await dynamoDBService.get(params);
    return result?.Item as VenueFavoriteV2
  }

  async createVenueFavorite(input: CreateVenueFavoriteInput): Promise<VenueFavorite> {
    // validate first
    this.validateVenueFavorite(input);

    const now = new Date().toISOString();
    const venueFavorite: VenueFavorite = {
      ...input,
      id: uuidv4(),
      __typename: 'VenueFavorite',
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITETABLE_NAME,
      Item: venueFavorite
    };
    await dynamoDBService.put(params);
    return venueFavorite;
  }

  async createVenueFavoriteV2(input: CreateVenueFavoriteInput): Promise<VenueFavoriteV2> {
    // validate first
    this.validateVenueFavorite(input);

    const now = new Date().toISOString();
    const venueFavorite: VenueFavoriteV2 = {
      ...input,
      __typename: 'VenueFavoriteV2',
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
      Item: venueFavorite
    };
    await dynamoDBService.put(params);
    return venueFavorite;
  }

  validateVenueFavorite(input: CreateVenueFavoriteInput) {
    const errors = { profileID: [], yelpBusinessID: [], venue: [] };
    if (!input.profileID) {
      errors.profileID.push('Profile ID is required');
    }
    if (!input.yelpBusinessID) {
      errors.yelpBusinessID.push('yelp Business ID is required');
    }
    if (!input.venue) {
      errors.venue.push('Venue detail is required');
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  async favoriteVenue(profile: PatronProfile, yelpBusinessID: string): Promise<VenueFavorite> {
    // 1. If this profile already favorite this business, then throw error
    const profileID = profile.id;
    const venueFavorite = await this.getVenueFavoriteV2(profileID, yelpBusinessID);
    if (venueFavorite) {
      throw new BadRequestException('You already favorited this Venue.');
    }

    // 2. Query Yelp to get business detail and insert to DB
    const yelpBusiness = await this.getYelpBusiness(yelpBusinessID);
    if (yelpBusiness) {
      const venue: Venue = { ...yelpBusiness, yelpBusinessID: yelpBusiness.id };
      await this.createVenueFavoriteV2({ profileID, venue, yelpBusinessID });
      return this.createVenueFavorite({ profileID, venue, yelpBusinessID });
    }

    throw new BadRequestException('Unknown Error. Please try again.');
  }

  async favoriteVenueV2(profile: PatronProfile, yelpBusinessID: string): Promise<VenueFavoriteV2> {
    // 1. If this profile already favorite this business, then throw error
    const profileID = profile.id;
    const venueFavorite = await this.getVenueFavoriteV2(profileID, yelpBusinessID);
    if (venueFavorite) {
      throw new BadRequestException('You already favorited this Venue.');
    }

    // 2. Query Yelp to get business detail and insert to DB
    const yelpBusiness = await this.getYelpBusiness(yelpBusinessID);
    if (yelpBusiness) {
      const venue: Venue = { ...yelpBusiness, yelpBusinessID: yelpBusiness.id };
      return this.createVenueFavoriteV2({ profileID, venue, yelpBusinessID });
    }

    throw new BadRequestException('Unknown Error. Please try again.');
  }

  async allFavoriteVenuesV2ByProfileID(profileID: string): Promise<VenueFavoriteV2[]> {
    const params = {
      TableName: API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
      }
    };

    const result = await dynamoDBService.queryAll(params);
    if (result.length > 0) {
      return result as VenueFavoriteV2[];
    }
    return [];
  }
}