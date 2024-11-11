import { v4 as uuidv4 } from 'uuid';
import { ErrorCodeConst } from "@swm-core/constants/error-code.const";
import { BadRequestException } from "@swm-core/exceptions/bad-request.exception";
import { CreateFollowingReportInput, FollowingReport, FollowingReportProfileConnection, UpdateFollowingReportInput } from "@swm-core/interfaces/following-report.interface";
import { removeEmptyArray } from "@swm-core/utils/normalization.util";
import { DynamoDBService } from "./dynamodb.service";
import { ElasticSearchService } from "./elasticsearch.service";
import { ProfileService } from './profile.service';
import { UserService } from './user.service';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { UserRole } from '@swm-core/interfaces/profile.interface';
import { User } from '@swm-core/interfaces/user.interface';

const {
  API_ES_ENDPOINT,
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME
} = process.env;

let elasticSearchService: ElasticSearchService;
const loadElasticSearchInstance = async (esEndpoint: string) => {
  if (!elasticSearchService) {
    elasticSearchService = await ElasticSearchService.createAsync(esEndpoint);
  }
  return elasticSearchService;
}

const VALIDATION_FAILED_MSG = 'Validation failed';
const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const userService = new UserService();

export class FollowingReportService {

  /**
   * Create new record in FollowingReport table
   *
   * @param input   following report information input
   * @returns new FollowingReport record
   */
  async create(input: CreateFollowingReportInput): Promise<FollowingReport> {
    // 1. Input validation
    this.validateCreateFollowingReportInput(input);

    // 2. Insert information to FollowingReport table
    const staffProfile = await profileService.get(input.staffID);
    if (!staffProfile) {
      // ignore if staff not found, maybe because this User was deleted
      return;
    }
    const userStaff = await userService.get(staffProfile.userID);
    if (!userStaff) {
      // ignore if staff not found, maybe because this User was deleted
      return;
    }
    const followingReport: FollowingReport = {
      ...input,
      id: uuidv4(),
      __typename: 'FollowingReport',
      staffProfileConnection: {
        email: userStaff.email,
        lastName: userStaff.lastName,
        firstName: userStaff.firstName,
        userName: userStaff.userName,
        completedAt: staffProfile.completedAt
      },
      confirmedAt: input.confirmedAt?.toISOString(),
      leftAt: input.leftAt?.toISOString(),
      createdAt: new Date().toISOString()
    };

    // 2.1 Insert patron information if needed
    if (input.patronID) {
      const patronProfile = await profileService.get(input.patronID);
      if (!patronProfile) {
        // ignore if patron not found, maybe because this User was deleted
        return;
      }
      const userPatron = await userService.get(patronProfile.userID);
      if (!userPatron) {
        // ignore if patron not found, maybe because this User was deleted
        return;
      }
      followingReport.patronID = input.patronID;
      followingReport.patronProfileConnection = {
        email: userPatron.email,
        lastName: userPatron.lastName,
        firstName: userPatron.firstName,
        userName: userPatron.userName,
        completedAt: patronProfile.completedAt
      };
    }

    await dynamoDBService.put({
      TableName: API_SITWITHME_FOLLOWINGREPORTTABLE_NAME,
      Item: followingReport
    });

    return followingReport;
  }

  /**
   * Validate following report information input for creating action.
   * Raise error if not pass validation.
   *
   * @param input   following report information input
   */
  validateCreateFollowingReportInput(input: CreateFollowingReportInput) {
    const errors = { staffID: [] };
    if (!input.staffID) {
      errors.staffID.push('Staff ID is required');
    }

    removeEmptyArray(errors);
    if (Object.keys(errors).length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }
  }

  async update(id: string, input: UpdateFollowingReportInput): Promise<FollowingReport> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_FOLLOWINGREPORTTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': input }),
      ReturnValues: 'ALL_NEW'
    });

    return result.Attributes as FollowingReport;
  }

  async allReportsByStaffID(staffID: string): Promise<FollowingReport[]> {
    let rs: FollowingReport[] = [];
    let lastEvalKey: any;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_FOLLOWINGREPORTTABLE_NAME,
        IndexName: 'byStaffID',
        KeyConditionExpression: '#staffID = :staffID',
        ExpressionAttributeNames: {
          '#staffID': 'staffID',
        },
        ExpressionAttributeValues: {
          ':staffID': staffID,
        },
        ExclusiveStartKey: lastEvalKey
      };
      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      if (result.Items.length > 0) {
        result.Items.forEach((item: FollowingReport) => {
          rs.push(item);
        });
      }
    } while (lastEvalKey);

    return rs;
  }

  async allReportsByPatronID(patronID: string): Promise<FollowingReport[]> {
    let rs: FollowingReport[] = [];
    let lastEvalKey: any;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_FOLLOWINGREPORTTABLE_NAME,
        IndexName: 'byPatronID',
        KeyConditionExpression: '#patronID = :patronID',
        ExpressionAttributeNames: {
          '#patronID': 'patronID',
        },
        ExpressionAttributeValues: {
          ':patronID': patronID,
        },
        ExclusiveStartKey: lastEvalKey
      };
      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      if (result.Items.length > 0) {
        result.Items.forEach((item: FollowingReport) => {
          rs.push(item);
        });
      }
    } while (lastEvalKey);

    return rs;
  }

  async updateStaffProfileConnection(staffID: string, staffProfileConnection: Partial<FollowingReportProfileConnection>) {
    const followingReports = await this.allReportsByStaffID(staffID);
    if (!followingReports.length) {
      return;
    }

    const putItems = followingReports.map((item: FollowingReport) => {
      return {
        ...item,
        staffProfileConnection: {
          ...item.staffProfileConnection,
          ...staffProfileConnection
        }
      }
    });
    await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGREPORTTABLE_NAME, putItems);
  }

  async updatePatronProfileConnection(patronID: string, patronProfileConnection: Partial<FollowingReportProfileConnection>) {
    const followingReports = await this.allReportsByPatronID(patronID);
    if (!followingReports.length) {
      return;
    }

    const putItems = followingReports.map((item: FollowingReport) => {
      return {
        ...item,
        patronProfileConnection: {
          ...item.patronProfileConnection,
          ...patronProfileConnection
        }
      }
    });
    await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGREPORTTABLE_NAME, putItems);
  }

  async syncProfileConnectionByUser(user: User) {
    const profiles = await profileService.listProfilesByUserID(user.id);

    // 1. Sync Staff Profile Connection
    const staff = profiles.find(p => p.role === UserRole.STAFF);
    if (staff && staff.completedAt) {
      await this.updateStaffProfileConnection(staff.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userName: user.userName,
        deleted: user.deleted
      });
    }

    // 2. Sync Patron Profile Connection
    const patron = profiles.find(p => p.role === UserRole.PATRON);
    if (patron && patron.completedAt) {
      await this.updatePatronProfileConnection(patron.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userName: user.userName,
        deleted: user.deleted
      });
    }
  }

  async syncProfileConnectionByUserID(userID: string) {
    const user = await userService.get(userID);
    return this.syncProfileConnectionByUser(user);
  }

  async listFollowingReportsByDateRange(start: Date, end: Date, limit: number = 20, nextToken?: string, term?: string) {
    elasticSearchService = await loadElasticSearchInstance(API_ES_ENDPOINT);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const searchBody: any = {
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                'staffProfileConnection.completedAt': {
                  lte: endStr
                }
              }
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must_not: [
                        { exists: { field: "confirmedAt" } },
                        { exists: { field: "leftAt" } }
                      ]
                    }
                  },
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            confirmedAt: { lte: endStr }
                          }
                        },
                        {
                          range: {
                            leftAt: { lte: endStr }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ],
          must_not: [
            {
              term: {
                'staffProfileConnection.deleted': true
              }
            }
          ]
        }
      },
      aggs: {
        staffID: {
          composite: {
            size: limit,
            sources: [
              {
                email: {
                  terms: {
                    field: 'staffProfileConnection.email.keyword'
                  }
                }
              }
            ]
          },

          aggs: {
            doc: {
              top_hits: {
                size: 1
              }
            },
            totalConfirmed: {
              value_count: {
                field: 'confirmedAt'
              }
            },
            totalLeft: {
              value_count: {
                field: 'leftAt'
              }
            },
            totalFollowers: {
              bucket_script: {
                buckets_path: {
                  confirmed: "totalConfirmed",
                  left: "totalLeft"
                },
                script: "params.confirmed - params.left"
              }
            },
            newConfirmed: {
              value_count: {
                script: {
                  source: `
                  if (doc.containsKey('confirmedAt') && doc['confirmedAt'].value != 'null'
                      && doc['confirmedAt'].value.getMillis() >= ZonedDateTime.parse('${startStr}').toInstant().toEpochMilli()
                      && doc['confirmedAt'].value.getMillis() <= ZonedDateTime.parse('${endStr}').toInstant().toEpochMilli()) { return 1; }
                  `
                }
              }
            },
            newLeft: {
              value_count: {
                script: {
                  source: `
                  if (doc.containsKey('leftAt') && doc['leftAt'].value != 'null'
                      && doc['leftAt'].value.getMillis() >= ZonedDateTime.parse('${startStr}').toInstant().toEpochMilli()
                      && doc['leftAt'].value.getMillis() <= ZonedDateTime.parse('${endStr}').toInstant().toEpochMilli()) { return 1; }
                  `
                }
              }
            },
            newFollowers: {
              bucket_script: {
                buckets_path: {
                  newConfirmed: "newConfirmed",
                  newLeft: "newLeft"
                },
                script: "params.newConfirmed - params.newLeft"
              }
            }
          }
        }
      }
    };
    if (nextToken) {
      searchBody.aggs.staffID.composite.after = { email: nextToken };
    }
    if (term) {
      searchBody.query.bool.must.push({
        query_string: {
          query: `*${term}*`,
          fields: [
            'staffProfileConnection.firstName',
            'staffProfileConnection.lastName',
            'staffProfileConnection.userName',
            'staffProfileConnection.email.keyword'
          ],
          type: "phrase_prefix"
        }
      });
    }

    const result = await elasticSearchService.search('followingreport', searchBody);
    const items = (result?.body?.aggregations?.staffID?.buckets || []).map((item: any) => {
      const source = item.doc.hits.hits[0]?._source;
      return {
        ...source,
        totalFollowers: item.totalFollowers.value,
        newFollowers: item.newFollowers.value,
        key: item.key
      };
    });

    return {
      items,
      nextToken: items[items.length - 1]?.key.email,
    };
  }
}
