import { S3Object } from './file.interface';
import { UserRole } from './profile.interface';

export interface Post {
  id: string;
  __typename: string;
  profileID: string;
  photoID?: string;
  videoID?: string;
  postType: PostType;
  caption?: string;
  profileConnection?: PostProfileConnection;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePostInput {
  id?: string;
  userID?: string;
  role?: UserRole;
  photo?: S3Object;
  photoID?: string;
  caption?: string;
}

export interface CreatePostInput {
  role: UserRole;
  photo?: S3Object;
  caption?: string;
  postType: PostType;
  video?: S3Object;
}

export enum PostType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO'
}

export interface PostProfileConnection {
  privacy?: boolean;
  deleted?: boolean;
  blockedProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  followingProfileIDs?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
}