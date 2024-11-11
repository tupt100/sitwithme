import { Location } from './location.interface';
import { UserRole } from './profile.interface';

export interface User {
  id: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: Role;
  birthday?: string;
  gender?: Gender;
  phone?: string;
  rawPhone?: string;
  userLocation?: UserLocation;
  lastSeat?: UserRole;
  disabled?: boolean;
  deleted?: boolean;
  bakEmail?: string;
  bakUserName?: string;
//   profiles: [Profile!]
//   photos: [UserPhoto!]
}

export interface UserLocation {
  name: string;
  location: Location;
}

export interface InitUserInput {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  phone?: string;
  rawPhone?: string;
}

export interface UpdateUserInput {
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  birthday?: string;
  birthdayIndex?: string;
  gender?: Gender;
  phone?: string;
  rawPhone?: string;
  userLocation?: UserLocation;
  lastSeat?: UserRole;
  deleted?: boolean;
  bakEmail?: string;
  bakUserName?: string;
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NONBINARY = 'NONBINARY',
}

export enum UserConfirmationEvent {
  SIGN_UP = 'SIGN_UP'
}

export interface UserConfirmation {
  cognitoUsername: string;
  code: string;
  event: UserConfirmationEvent;
  retryAttempts: number;
  __typename: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserConfirmationInput {
  cognitoUsername: string;
  code: string;
  event: UserConfirmationEvent;
}