import { Location } from './location.interface';
import { Profile } from './profile.interface';

export interface Workplace {
  id: string;
  __typename: string;
  name: string;
  yelpBusinessID: string;
  location: Location;
  fullAddress: string;
  categories?: string[];
  yelpCategories?: YelpCategory[];
  price?: number;
  reviewCount?: number;
  imageUrl?: string;
  rating?: number;
  profileID: string;
  profile?: Profile;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateWorkplaceInput {
  name?: string;
  location?: Location;
  fullAddress?: string;
  yelpCategories?: YelpCategory[];
  price?: number;
  reviewCount?: number;
  imageUrl?: string;
  rating?: number;
}

export interface YelpCategory {
  title: string;
  alias: string;
}

export interface WorkplaceInput {
  name: string;
  yelpBusinessID: string;
  location: Location;
  fullAddress: string;
  profileID: string;
}

export interface SearchYelpBusinessesInput {
  location: Location;
  keyword: string;
}

export interface YelpBusinessConnection {
  items: YelpBusiness[];
  hasNext: boolean;
}

export interface YelpBusiness {
  name: string;
  id: string;
  location: Location;
  fullAddress: string;
  categories?: string[];
  yelpCategories?: YelpCategory[];
  price?: number;
  reviewCount?: number;
  imageUrl?: string;
  rating?: number;
}

export interface SearchYelpBusinessesRes {
  businesses: YelpBusinessRes[];
  total: number;
}

export interface YelpBusinessRes {
  id: string;
  name: string;
  coordinates: Location;
  location: YelpBusinessLocation;
  categories?: { title: string, alias: string }[];
  price?: string;
  review_count?: number;
  image_url?: string;
  rating?: number;
}

export interface YelpBusinessLocation {
  city: string;
  state: string;
  address1: string;
}

export interface Venue {
  yelpBusinessID: string;
  name: string;
  location: Location;
  fullAddress: string;
  categories?: string[];
  yelpCategories?: YelpCategory[];
  price?: number;
  reviewCount?: number;
  imageUrl?: string;
  rating?: number;
}

export interface ModelExploreVenuesConnection {
  items: Venue[];
  offset?: number;
  hasNext?: boolean;
  nextToken?: string;
}

export interface Category {
  title: string;
  alias: string;
  parent_aliases: string[];
  subCategories?: Category[];
}
export interface CategoryRes {
  title: string;
  alias: string;
  subCategories: Category[];
}

export interface VenueFavorite {
  id: string;
  __typename: 'VenueFavorite';
  profileID: string;
  yelpBusinessID: string;
  venue: Venue;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVenueFavoriteInput {
  profileID: string;
  yelpBusinessID: string;
  venue: Venue;
}

export interface VenueFavoriteV2 {
  __typename: 'VenueFavoriteV2';
  profileID: string;
  yelpBusinessID: string;
  venue: Venue;
  createdAt?: string;
  updatedAt?: string;
}