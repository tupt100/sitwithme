import S3 from 'aws-sdk/clients/s3';

export class S3Service {
  s3: S3;

  constructor() {
    this.s3 = new S3({apiVersion: '2006-03-01'});
  }

  getObject(params: S3.GetObjectRequest): Promise<S3.GetObjectOutput> {
    return this.s3.getObject(params).promise();
  }

  putObject(params: S3.PutObjectRequest): Promise<S3.PutObjectOutput> {
    return this.s3.putObject(params).promise();
  }

  headObject(params: S3.HeadObjectRequest): Promise<S3.HeadObjectOutput> {
    return this.s3.headObject(params).promise();
  }
}