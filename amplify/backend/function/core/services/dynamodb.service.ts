import DynamoDB, { DocumentClient } from 'aws-sdk/clients/dynamodb';

const { IS_MOCK } = process.env;

export class DynamoDBService {
  dbClient: DocumentClient;

  constructor() {
    let opts: DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
      apiVersion: '2012-08-10',
      convertEmptyValues: true,
    };

    if (IS_MOCK) {
      opts = {
        ...opts,
        endpoint: 'http://localhost:62224',
        region: 'us-fake-1',
        credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
      }
    }

    this.dbClient = new DynamoDB.DocumentClient(opts);
  }

  async get(params) {
    return this.dbClient.get(params).promise();
  }

  async query(params: DocumentClient.QueryInput): Promise<DocumentClient.QueryOutput> {
    return this.dbClient.query(params).promise();
  }

  async queryAll(params: DocumentClient.QueryInput): Promise<any[]> {
    let rs = [];
    let lastEvalKey: any;
    do {
      params.ExclusiveStartKey = lastEvalKey;

      const result = await this.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      rs = [...rs, ...result.Items];

    } while (lastEvalKey);

    return rs;
  }

  async scan(params) {
    return this.dbClient.scan(params).promise();
  }

  async put(params: DocumentClient.PutItemInput): Promise<DocumentClient.PutItemOutput> {
    if (!params.Item.updatedAt) {
      params.Item.updatedAt = new Date().toISOString();
    }
    return this.dbClient.put(params).promise();
  }

  /**
   * @TODO need handle max 100 items each calling batch get
   */
  async batchGet(tableName: string, items: object[]) {
    var params = {
      RequestItems: {
        [tableName]: {
          Keys: items
        }
      }
    };

    return await this.dbClient.batchGet(params).promise();
  }

  /**
   * Support 25 records per batchPut
   */
  async batchPut(tableName: string, items: object[]) {
    console.log(`BatchPut items to ${tableName}: `, items.length, items)
    const iterable = items.length / 25;
    const updatedAt = new Date().toISOString();
    for (let i = 0; i <= iterable; i++) {
      let batchWriteParams = items.splice(0, 25);
      if (batchWriteParams.length) {
        batchWriteParams = batchWriteParams.map(item => {
          return {
            PutRequest: {
              Item: { ...item, updatedAt },
            }
          }
        });
        console.log('batchWriteParams: ', batchWriteParams.length, JSON.stringify(batchWriteParams, null, 2));
        await this.dbClient.batchWrite({
          RequestItems: {
            [tableName]: batchWriteParams
          }
        }).promise();
      }
    }
  }

  async transactionWrite(params: DocumentClient.TransactWriteItemsInput): Promise<DocumentClient.TransactWriteItemsOutput> {
    return this.dbClient.transactWrite(params).promise();
  }

  /**
 * Support 25 records per batchDelete
 */
  async batchDelete(tableName: string, items: object[]) {
    console.log(`BatchDelete items to ${tableName}: `, items)
    const iterable = items.length / 25;
    for (let i = 0; i <= iterable; i++) {
      let batchWriteParams = items.splice(0, 25);
      if (batchWriteParams.length) {
        batchWriteParams = batchWriteParams.map(item => {
          return {
            DeleteRequest: {
              Key: item,
            }
          }
        });
        console.log('batchWriteParams: ', batchWriteParams);
        await this.dbClient.batchWrite({
          RequestItems: {
            [tableName]: batchWriteParams
          }
        }).promise();
      }
    }
  }

  delete(params: DocumentClient.DeleteItemInput): Promise<DocumentClient.DeleteItemOutput> {
    return this.dbClient.delete(params).promise();
  }

  async update(params: DocumentClient.UpdateItemInput): Promise<DocumentClient.UpdateItemOutput> {
    const keys = params.Key;
    const conditions = [];
    const conditionExpressionName = {};
    const conditionExpressionValue = {};
    for (const [k, v] of Object.entries(keys)) {
      /**
       * Remove sign (#) in expression attribute name and expression attribute value because
       * An expression attribute name must begin with a pound sign (#), and be followed by one or more alphanumeric characters.
       * An expression attribute value must begin with a colon (:) and be followed by one or more alphanumeric characters
       */
      const expressionAttribute = k.replace(/#/g, '');
      conditions.push(`#${expressionAttribute} = :${expressionAttribute}`);
      conditionExpressionName[`#${expressionAttribute}`] = k;
      conditionExpressionValue[`:${expressionAttribute}`] = v;
    }

    if (params.ConditionExpression) {
      params.ConditionExpression += ` AND ${conditions.join(' AND ')}`;
    } else {
      params.ConditionExpression = conditions.join(' AND ');
    }

    params.ExpressionAttributeNames = {
      ...params.ExpressionAttributeNames,
      ...conditionExpressionName
    };

    params.ExpressionAttributeValues = {
      ...params.ExpressionAttributeValues,
      ...conditionExpressionValue
    };

    try {
      return await this.dbClient.update(params).promise();
    } catch (e) {
      if (e.code === 'ConditionalCheckFailedException') {
        // Do nothing
        return {};
      }
      throw e;
    }
  }

  /**
   *
   * @param {object} params condition object need to increase value
   * [{
   *   total: 1
   * }]
   * @returns
   * {
   *  "UpdateExpression": "SET #total = total + :total",
   *  "ExpressionAttributeNames": { "#total": "total" },
   *  "ExpressionAttributeValues": { ":total": 1 }
   * }
   */
  buildAtomicCounter(params) {
    const rs = {
      UpdateExpression: 'SET #updatedAt = :updatedAt, ',
      ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':updatedAt': new Date().toISOString() },
    }

    const updateExpr = [];
    for (const [k, value] of Object.entries(params)) {
      updateExpr.push(`#${k} = ${k} + :${k}`);
      rs.ExpressionAttributeNames[`#${k}`] = k;
      rs.ExpressionAttributeValues[`:${k}`] = value;
    }
    rs.UpdateExpression += `${updateExpr.join(",")} `;
    rs.UpdateExpression = rs.UpdateExpression.trim();

    return rs;
  }

  /**
   *
   * @param {object} params condition object need to bind
   * {
   *   "ADD": {
   *     "countries": set(["US", "UK"])
   *   },
   *   "SET": {
   *     "price": 10,
   *     "category": "string"
   *   }
   * }
   * @returns
   * {
   *  "UpdateExpression": "SET #price = :price, #category = :category ADD #countries :countries",
   *  "ExpressionAttributeNames": { "#price": "price","#category": "category","#countries": "countries" },
   *  "ExpressionAttributeValues": { ":price": 10, ":category": "string", ":countries": set(["US", "UK"]) }
   * }
   */
  buildUpdateExpression(params = {}) {
    const rs = {
      UpdateExpression: "",
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
    };
    if (Object.keys(params).length === 0) {
      return rs;
    }
    let updateExpr = [];
    for (const [method, attr] of Object.entries(params)) {
      rs.UpdateExpression += `${method} `;

      for (const [k, v] of Object.entries(attr)) {
        if (method === 'ADD') {
          updateExpr.push(`#${k} :${k}`);
          rs.ExpressionAttributeNames[`#${k}`] = k;
          rs.ExpressionAttributeValues[`:${k}`] = (v === undefined || v === '') ? null : v;
        } else if (method === 'SET') {
          updateExpr.push(`#${k} = :${k}`);
          rs.ExpressionAttributeNames[`#${k}`] = k;
          rs.ExpressionAttributeValues[`:${k}`] = (v === undefined || v === '') ? null : v;
        } else if (method === 'REMOVE' && v) {
          updateExpr.push(`#${k}`);
          rs.ExpressionAttributeNames[`#${k}`] = k;
        }
      }

      if (method === 'SET') {
        updateExpr.push('#updatedAt = :updatedAt');
        rs.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
        rs.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
      }

      rs.UpdateExpression += `${updateExpr.join(",")} `;
      updateExpr = [];
    }

    rs.UpdateExpression = rs.UpdateExpression.trim();

    if (!params['SET'] && rs.UpdateExpression !== '') {
      rs.UpdateExpression += " SET #updatedAt = :updatedAt";
      rs.ExpressionAttributeNames["#updatedAt"] = "updatedAt";
      rs.ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
    }

    return rs;
  }
}
