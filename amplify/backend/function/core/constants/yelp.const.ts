export const YelpConst = {
  restrictCategoriesWithAllSub: 'restaurants,nightlife',
  restrictCategoriesWithSelectedSub: 'food',
  restrictSubCategoriesInFood: 'coffee,breweries',
  foodCategory: 'food',
  /**
   * Return:
   * - List of parent categories which selected all sub-categories inside it
   * - And some selected sub-categories from other categories
   */
  restrictCategoriesWithAllSubAndSubCategories: () => [
    YelpConst.restrictCategoriesWithAllSub,
    YelpConst.restrictSubCategoriesInFood
  ].join(),
  /**
   * Return:
   * - List of parent categories which selected all sub-categories inside it
   * - List of parent categories which selected some sub-categories inside it
   */
  restrictCategories: () => [
    YelpConst.restrictCategoriesWithAllSub,
    YelpConst.restrictCategoriesWithSelectedSub
  ].join(),
  defaultExploreDistance: 25,
  mileToMeters: 1609.34,
  maximumYelpDistance: 40000,
}