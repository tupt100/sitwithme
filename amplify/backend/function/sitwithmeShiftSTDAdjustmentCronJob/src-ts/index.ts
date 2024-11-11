/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
	API_SITWITHME_SHIFTTABLE_ARN
	API_SITWITHME_SHIFTTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { SavingTime } from "@swm-core/interfaces/shift.interface";
import { ShiftService } from "@swm-core/services/shift.service";

const shiftService = new ShiftService();

/**
 * Switch Shift event time from DST to STD timezone
 *
 * @param event from AWS Event Bridge
 */
export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  await shiftService.adjustAllShiftsToSavingTime(SavingTime.STD);
};
