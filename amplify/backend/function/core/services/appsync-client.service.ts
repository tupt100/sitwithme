/**
 *
 * Any nodejs client can use this to query on AppSync.
 * If we use lambda and AWS_IAM auth, then the lambda exec role must contains:
 * {
 *  "Effect": "Allow",
 *  "Action": "appsync:GraphQL",
 *  "Resource": "arn:aws:appsync:REGION:ACCOUNT_ID:apis/API_ID/types/Mutation/fields/test"
 * }
 *
 */

import { URL } from 'url';
import AWS, { Endpoint } from 'aws-sdk/global';
import SignerV4 from 'aws-sdk/lib/signers/v4';
import AWSUtil from 'aws-sdk/lib/util';
import { request } from '../utils/request.util';

export class AppSyncClientService {
  url: string;
  region: string;
  authType: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;

  // If we use for lambda, then the `region`, `accessKeyId`, `secretAccessKey`, `sessionToken`
  // can get by process.env AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
  constructor({ url, region, authType, accessKeyId, secretAccessKey, sessionToken }) {
    if (authType !== 'AWS_IAM') {
      throw new Error('Only support AWS_IAM auth for now');
    }

    this.url = url;
    this.region = region;
    this.authType = authType;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
  }

  // Exec mutation
  mutate(query: string, variables: object): Promise<any> {
    const body = { query, variables };
    const awsRequest = this.appsyncRequestSigned('POST', body);
    const uri = new URL(this.url);
    return request(awsRequest.body, {
      hostname: uri.host,
      path: uri.pathname,
      method: awsRequest.method,
      headers: awsRequest.headers
    });
  }

  private appsyncRequestSigned(method: string, body?: object): AWS.HttpRequest {
    const uri = new URL(this.url);
    const httpRequest = new AWS.HttpRequest(new Endpoint(this.url), this.region);
    httpRequest.headers.host = uri.host;
    httpRequest.headers['Content-Type'] = 'application/json';
    httpRequest.method = method;
    if (body) {
      httpRequest.body = JSON.stringify(body);
    }
    const signer = new SignerV4(httpRequest, 'appsync', true);
    const credentials = new AWS.Credentials(this.accessKeyId, this.secretAccessKey, this.sessionToken);
    signer.addAuthorization(credentials, AWSUtil.date.getDate());

    return httpRequest;
  }
}
