import { Client } from '@elastic/elasticsearch'
import { createAWSConnection, awsGetCredentials } from '@acuris/aws-es-connection'

export class ElasticSearchService {
  client: any;

  public static createAsync = async (endpoint: string) => {
    const elasticSearchService = new ElasticSearchService();
    const awsCredentials = await awsGetCredentials();
    const awsConnection = createAWSConnection(awsCredentials);
    elasticSearchService.client = new Client({
      ...awsConnection,
      node: endpoint
    });
    return elasticSearchService;
  };

  async search(indexName: string, searchBody?: { [key: string]: any }): Promise<{[key: string]: any}> {
    const searchParams = {
      index: indexName,
      body: searchBody,
    };

    try {
      console.log('searchParams: ', JSON.stringify(searchParams, null, 2));
      return await this.client.search(searchParams);
    } catch (e) {
      // Return empty if index isn't created
      if (e.meta?.body?.error?.type === 'index_not_found_exception') {
        return {}
      }
      console.log('ES search error: ', e, JSON.stringify(e, null, 2), JSON.stringify(searchParams, null, 2));
    }
  }
}