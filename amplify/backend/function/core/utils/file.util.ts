export const getFileUrlFromS3 = (baseUrl: string, s3Key: string): string => {
  return `${baseUrl}/${s3Key}`;
};

// s3 path: "s3://sitwithmevod-dev-output-06cs4ya0/SampleVideo_1280x720_10mb/SampleVideo_1280x720_10mb.m3u8"
export const getS3KeyFromS3Path = (s3Path: string): string => {
  const parts = s3Path.split('/');
  parts.splice(0, 3);
  return parts.join('/');
};