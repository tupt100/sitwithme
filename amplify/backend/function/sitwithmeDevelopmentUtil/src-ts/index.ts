/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
	API_SITWITHME_JOBTABLE_ARN
	API_SITWITHME_JOBTABLE_NAME
	API_SITWITHME_PHOTOTABLE_ARN
	API_SITWITHME_PHOTOTABLE_NAME
	API_SITWITHME_PROFILETABLE_ARN
	API_SITWITHME_PROFILETABLE_NAME
	API_SITWITHME_SHIFTTABLE_ARN
	API_SITWITHME_SHIFTTABLE_NAME
	API_SITWITHME_USERTABLE_ARN
	API_SITWITHME_USERTABLE_NAME
	API_SITWITHME_WORKPLACETABLE_ARN
	API_SITWITHME_WORKPLACETABLE_NAME
	ENV
	REGION
  YELP_API_KEY
Amplify Params - DO NOT EDIT */

import { generateStaffProfiles } from "./generate-profiles";

const utilFunctions = {
  generateStaffProfiles: async (input: any) => {
    await generateStaffProfiles(input.number, input.lat, input.lon);
  }
};


export const handler = async (event) => {
  // event
  // {
  //   "method": "MethodName", /* Migration function name */
  //   "arguments": { /* Input data for util */ },
  // }
  console.info('Event: ', event);
  const utilFunction = utilFunctions[event.method];
  if (utilFunction) {
    try {
      return await utilFunction(event.arguments);
    } catch (e) {
      console.log('Migration failed: ', e);
      throw new Error('Migration failed');
    }
  }
  throw new Error('Resolver not found.');
};
