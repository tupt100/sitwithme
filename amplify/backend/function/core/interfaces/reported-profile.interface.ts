export enum ReportProfileType {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
}

export enum ReportContentType {
  SEXUAL = 'SEXUAL',
  VIOLENT_OR_REPULSIVE = 'VIOLENT_OR_REPULSIVE',
  HATEFUL_OR_ABUSIVE = 'HATEFUL_OR_ABUSIVE',
  PRETENDING_TO_BE_SOMEONE = 'PRETENDING_TO_BE_SOMEONE',
  HARASSMENT_OR_BULLYING = 'HARASSMENT_OR_BULLYING'
}

export interface ReportContent {
  type: ReportContentType
}

export enum ReportedProfileStatus {
  UNRESOLVED = 'UNRESOLVED',
  RESOLVED = 'RESOLVED'
}

export interface ReportedProfile {
  id: string;
  profileID: string;
  __typename: string;
  reportedProfileID: string;
  type: string;
  content?: ReportContent;
  archivedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  group: string;
  status: ReportedProfileStatus;
}