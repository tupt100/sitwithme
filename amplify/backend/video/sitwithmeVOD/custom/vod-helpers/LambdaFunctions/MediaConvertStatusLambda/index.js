const AWS = require('aws-sdk/global');
const SignerV4 = require('aws-sdk/lib/signers/v4');
const AWSUtil = require('aws-sdk/lib/util');
const https = require('https');

const {
  ENV,
  GRAPHQLEP,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN
} = process.env;

// s3 path: "s3://sitwithmevod-dev-output-06cs4ya0/SampleVideo_1280x720_10mb/SampleVideo_1280x720_10mb.m3u8"
const getS3KeyFromS3Path = (s3Path) => {
  const parts = s3Path.split('/');
  parts.splice(0, 3);
  return parts.join('/');
};

const getS3BucketFromS3Path = (s3Path) => {
  return s3Path.split('/')[2];
};

const getFilenameByS3Key = (key) => {
  return key.split('/').pop().split('.')[0];
};

const request = (data, options) => {
  options.port = 443;
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(responseBody));
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
};


class AppSyncClient {
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

  appsyncRequestSigned(method, body) {
    const uri = new URL(this.url);
    const httpRequest = new AWS.HttpRequest(new AWS.Endpoint(this.url), this.region);
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

  mutate(query, variables) {
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
}

const updateVideoAfterProcessing = `
  mutation updateVideoAfterProcessing($input: UpdateVideoAfterProcessingInput!) {
    updateVideoAfterProcessing(input: $input) {
      id
      thumbnailUrl
      url
      status
    }
  }
`;

const appSyncClient = new AppSyncClient({
  url: GRAPHQLEP,
  accessKeyId: AWS_ACCESS_KEY_ID,
  authType: 'AWS_IAM',
  region: AWS_REGION,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  sessionToken: AWS_SESSION_TOKEN
});

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  let message;
  try {
    message = JSON.parse(event.Records[0].Sns.Message);
  } catch (e) {
    console.log('[MediaConvertStatus] ERROR while parsing SNS message');
    return message;
  }

  const status = message && message.detail && message.detail.status;
  if (status === 'COMPLETE') {
    const outputGroupDetails = message.detail.outputGroupDetails;
    const input = { status: 'COMPLETED' };
    for (const output of outputGroupDetails) {
      if (output.type === 'HLS_GROUP') {
        // video processing
        const playlistFilePath = output.playlistFilePaths && output.playlistFilePaths[0];

        if (playlistFilePath) {
          const bucket = getS3BucketFromS3Path(playlistFilePath);
          if (!bucket.includes(ENV)) return; // reject if not map environment

          if (output.outputDetails && output.outputDetails[0]) { // only save the best quanlity video
            input.key = getS3KeyFromS3Path(output.outputDetails[0].outputFilePaths[0]);
            input.video = {
              bucket,
              region: AWS_REGION,
              key: input.key
            };
          } else {
            // fallback to save default video
            input.key = getS3KeyFromS3Path(playlistFilePath);
            input.video = {
              bucket,
              region: AWS_REGION,
              key: input.key
            };
          }
        }
      } else if (output.type === 'FILE_GROUP') {
        // thumbnail
        const outputDetail = output.outputDetails && output.outputDetails[0];
        const outputFilePath = outputDetail.outputFilePaths && outputDetail.outputFilePaths[0];
        if (outputFilePath) {
          const bucket = getS3BucketFromS3Path(outputFilePath);
          if (!bucket.includes(ENV)) return; // reject if not map environment

          // outputFilePath: "s3://sitwithmevod-dev-output-06cs4ya0/thumbnails/SampleVideo_1280x720_10mb_thumbnail.0000000.jpg"
          input.thumbnailKey = getS3KeyFromS3Path(outputFilePath);
        }
      }
    }

    // Call GraphQL to update video status after processing
    if (input.video) {
      console.log('update video status', JSON.stringify(input, null, 2));
      await appSyncClient.mutate(updateVideoAfterProcessing, { input });
    }
  } else {
    console.log(`[MediaConvertStatus]: ${status} was not handle`);
  }

  return message;
};
