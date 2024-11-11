/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  ENV
  REGION
  API_ES_ENDPOINT
Amplify Params - DO NOT EDIT */

import { PlatformException } from "@swm-core/exceptions/platform.exception";
import { FollowingReportService } from "@swm-core/services/following-report.service";

const followingReportService = new FollowingReportService();

const resolvers = {
  Query: {
    listFollowingReports: async (event: any) => {
      const { filter, limit, nextToken } = event.arguments;
      const start = new Date(filter.start);
      const end = new Date(filter.end);
      return followingReportService.listFollowingReportsByDateRange(start, end, limit, nextToken, filter.term);
    }
  }
};

export const handler = async (event: any) => {
  // event
  // {
  //   "typeName": "Query", /* Filled dynamically based on @function usage location */
  //   "fieldName": "me", /* Filled dynamically based on @function usage location */
  //   "arguments": { /* GraphQL field arguments via $ctx.arguments */ },
  //   "identity": { /* AppSync identity object via $ctx.identity */ },
  //   "source": { /* The object returned by the parent resolver. E.G. if resolving field 'Post.comments', the source is the Post object. */ },
  //   "request": { /* AppSync request object. Contains things like headers. */ },
  //   "prev": { /* If using the built-in pipeline resolver support, this contains the object returned by the previous function. */ },
  // }
  console.info('Event: ', JSON.stringify(event, null, 2));
  const typeHandler = resolvers[event.typeName];
  if (typeHandler) {
    try {
      const resolver = typeHandler[event.fieldName];
      if (resolver) {
        return await resolver(event);
      }
    } catch (e) {
      if (e instanceof PlatformException) {
        const { message, errCode, errors } = e;
        return { error: { message, errCode, errors }};
      } else {
        console.log('ERROR: ', JSON.stringify(e, null, 2));
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
