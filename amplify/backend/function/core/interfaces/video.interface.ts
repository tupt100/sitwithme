import { S3Object } from "./file.interface";

export interface Video {
  id: string;
  __typename: string;
  s3Metadata: S3Object;
  url?: string;
  thumbnailUrl?: string;
  status: VideoStatus;
  createdAt?: string;
  updatedAt?: string;
}

export enum VideoStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface UpdateVideoAfterProcessingInput {
  status?: VideoStatus;
  key?: string;
  thumbnailKey?: string;
  s3Metadata: S3Object;
}

export interface VideoUpdateInput {
  url?: string;
  thumbnailUrl?: string;
  status?: VideoStatus;
  s3Metadata?: S3Object;
}
