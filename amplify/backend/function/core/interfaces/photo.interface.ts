import { S3Object } from "./file.interface";

export interface Photo {
  id: string;
  __typename: string;
  s3Metadata: S3Object;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}