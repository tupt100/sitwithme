import { Job } from '@swm-core/interfaces/job.interface';
import { DynamoDBService } from './dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_JOBTABLE_NAME
} = process.env;

export class JobService {
  async get(id: string): Promise<Job> {
    return <Job>(await dynamoDBService.get({
      TableName: API_SITWITHME_JOBTABLE_NAME,
      Key: { id },
    })).Item;
  }
}