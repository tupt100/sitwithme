/* Amplify Params - DO NOT EDIT
ENV
REGION
STORAGE_ASSETS_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * Defines the allowed dimensions and validate.
 * If request dimension doesn't match the list defined, then return default
 * image dimensions.
 *
 * Transform URL contains dimensions to s3 path. E.g:
 *   Request URL: /upload/<user-id>/avatar/image.png?w=100
 *   Transform to S3 path: /upload/<user-id>/avatar/100/image.png
 *
 */

import * as querystring from 'querystring';
import Sharp from 'sharp';
import S3 from 'aws-sdk/clients/s3';

const s3 = new S3({apiVersion: '2006-03-01'});
const allowImgFormats = ['jpe', 'jpeg', 'jpg', 'png', 'webp'];

const imgSizeMapping = {
  large: 1125,
  medium: 562,
  small: 375
};

const imgConfig = {
  avatar: {
    allowedScaleSizes: ['large', 'medium', 'small']
  },
  posts: {
    allowedScaleSizes: ['large', 'medium', 'small']
  }
};


/**
* Validate dimension with image config. If not valid, return default dimension
*
* @param {number} size  - img size
* @param {string} scope  - path scope for support image scale size
* @returns {number} best width choice
*/
const validateWidth = (size: string, scope: { allowedScaleSizes: string[] }) => {
  const scalingSizes = scope.allowedScaleSizes;
  if (!scalingSizes) return;

  const _size = scalingSizes.find((s) => {
    return s === size;
  });
  if (!_size) return;

  return imgSizeMapping[_size];
};

/**
* Fetch and resize image from s3 bucket.
* Throw error if have any exception such as image not found, or resize failure
*
* @param {string} bucket: S3 bucket
* @param {string} key: S3 bucket path
* @param {number} width: image width resize
*/
const fetchAndResizeS3Image = async (bucket: string, key: string, resizeKey: string, width: number) => {
  // get source image
  let originalImageObj: any;
  try {
    originalImageObj = await s3.getObject({ Bucket: bucket, Key: key}).promise();
    console.log('-- fetch original image success');
  } catch (e) {
    console.log('-- not found or not enough permission');
    return false;
  }

  // resize
  const sharpImageObj = Sharp(originalImageObj.Body);
  const buffer = await sharpImageObj.resize(width, null, { withoutEnlargement: true }).toBuffer();
  const imgMeta = await sharpImageObj.metadata();
  console.log('-- resizeKey', resizeKey);
  console.log('-- bucket', bucket);
  await s3.putObject({
    Body: buffer,
    Bucket: bucket,
    ContentType: `image/${imgMeta.format}`,
    Key: resizeKey,
    StorageClass: 'STANDARD'
  }).promise();
  console.log('-- put object success');

  return {
    buffer,
    mimeType: `image/${imgMeta.format}`
  };
};

const setResponseImageNotFound = (response: any) => {
  response.status = '404';
  response.headers['content-type'] = [{ key: 'Content-Type', value: 'text/plain' }];
  response.body = `File not found.`;
};

const setResponseImageFound = (response: any, redirectPath: string) => {
  response.status = '301';
  response.statusDescription = 'Moved Permanently';
  response.body = '';
  response.headers.location = [{ key: 'Location', value: redirectPath }];
};

const s3ObjectExists = async (bucket: string, key: string) => {
  try {
    await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (e) {
    return false;
  }
};

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const {response, request} = event.Records[0].cf;

  switch (response.status) {
    case '404':
    case '403':
    {
      // return not found
      setResponseImageNotFound(response);
      return response;
    }
    case '304':
    case '200':
      // keep going
      break;
    default:
      return response;
  }

  // fetch image and resize handler
  const s3Bucket = request.origin.s3.domainName.split('.')[0];
  const params: any = querystring.parse(request.querystring);
  console.log('-- params', params);

  // if there is no dimension attribute, just pass the response
  if (!params.size) {
    return response;
  }

  const uri = request.uri;
  console.log('-- uri', uri);

  // validate dimension from request
  const scaleSize = params.size;

  let s3Path = '';
  let prefix = '';
  let imgScope: { allowedScaleSizes: string[] };
  let image = '';
  // https://stackoverflow.com/questions/2678551/when-to-encode-space-to-plus-or-20
  const originalImagePath = decodeURIComponent(uri.substring(1).replace(/\+/g, '%20'));
  console.log('-- originalImagePath', originalImagePath);
  let width: number;

  // transform url to s3 path
  // Request URL: /upload/<user-id>/avatar/image.png?w=100
  // Transform to S3 path: /upload/<user-id>/avatar/100/image.png
  try {
    const match = originalImagePath.match(/^(.*)\/(.*)$/);
    prefix = match[1];
    const pathPieces = prefix.split('/');
    imgScope = imgConfig[pathPieces[pathPieces.length - 1]];

    // path not support for scaling, fw result to client
    if (!imgScope) {
      return response;
    }

    image = match[2];
    width = validateWidth(scaleSize, imgScope);

    // path not support for this scaling size, return 404 result to client
    if (!width) {
      setResponseImageNotFound(response);
      return response;
    }
    console.log('-- width', width);
    const imageNameParts = image.split('.');
    const format = imageNameParts[imageNameParts.length - 1];

    // file type not support, return 404 result to client
    if (!allowImgFormats.includes(format)) {
      return false;
    }

    s3Path = `${prefix}/${scaleSize}/${image}`;
    console.log('-- s3Path: ', s3Path);
  } catch (e) {
    // Can't fetch prefix + image from url, return 404
    console.log('Error while transfroming URL to S3 Path', e);
    return response;
  }

  // CloudFront may be invalidate cache.
  // Try to get image resized in s3 first, if not found then get source image
  // and resize.
  const imageExists = await s3ObjectExists(s3Bucket, s3Path);
  if (imageExists) {
    setResponseImageFound(response, `/${encodeURIComponent(s3Path)}`);
    return response;
  }

  console.log('Image resized not found. Will resize ...');
  // Get source image and resize
  try {
    const fileResized = await fetchAndResizeS3Image(s3Bucket, originalImagePath, s3Path, width);
    if (!fileResized) {
      setResponseImageNotFound(response);
      return response;
    }
    // success
    setResponseImageFound(response, `/${encodeURIComponent(s3Path)}`);
  } catch (e) {
    console.log('Error while resize image', e);
  }

  return response;
};
