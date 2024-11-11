import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { Category, SearchYelpBusinessesRes, YelpBusinessRes } from '@swm-core/interfaces/workplace.interface';
import axios from 'axios';

const END_POINT = 'https://api.yelp.com/v3';

export class YelpService {
  client: any;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: END_POINT,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
  }

  async searchBusiness(params: { [key: string]: any }): Promise<SearchYelpBusinessesRes> {
    try {
      const businessResponse = (await this.client.get('/businesses/search', { params })).data;
      console.log('Yelp Business Results: ', businessResponse);
      return {
        businesses: businessResponse.businesses,
        total: businessResponse.total,
      }
    } catch (e) {
      console.log('Search Yelp Business Error: ', e.response);
      return {
        businesses: [],
        total: 0,
      };
    }
  }

  async getBusiness(id: string): Promise<YelpBusinessRes> {
    try {
      const businessResponse = (await this.client.get(`/businesses/${id}`)).data;
      console.log('Yelp Business Detail: ', businessResponse);
      return businessResponse;
    } catch (e) {
      console.log('Get Yelp Business Error: ', e.response);
      if (e.response?.data?.error) {
        throw new PlatformException(e.response?.data?.error?.description);
      }
      throw new PlatformException('Cannot get business. Please help contact support.');
    }
  }

  async listCategories(): Promise<Category[]> {
    try {
      const categoryResponse = (await this.client.get('/categories', { locale: 'en_US' })).data;
      return categoryResponse.categories;
    } catch (e) {
      console.log('List Category Error: ', e.response);
      return [];
    }
  }
}
