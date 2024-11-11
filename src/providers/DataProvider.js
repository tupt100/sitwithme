import { API, GRAPHQL_AUTH_MODE, graphqlOperation } from "@aws-amplify/api";
import { Filter } from "./Filter";
import { Pagination } from "./Pagination";

const defaultOptions = {
  authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  enableAdminQueries: false,
};

const generateMonthRange = (date) => {
  // default value for filter
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - start.getTimezoneOffset() * 60 * 1000);

  let end = new Date(start.getTime());
  end.setMonth(end.getMonth() + 1);
  end = new Date(end.getTime() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}


export class DataProvider {
  static storageBucket;
  static storageRegion;

  constructor(operations, options) {
    this.queries = operations.queries;
    this.mutations = operations.mutations;
    this.subscriptions = operations.subscriptions;

    this.authMode = options?.authMode || defaultOptions.authMode;
    this.enableAdminQueries =
      options?.enableAdminQueries || defaultOptions.enableAdminQueries;

    DataProvider.storageBucket = options?.storageBucket;
    DataProvider.storageRegion = options?.storageRegion;
  }

  async getList(resource, params) {
    const { filter } = params;
    let queryName = Filter.getQueryName(this.queries, filter);
    let queryVariables = Filter.getQueryVariables(filter);


    // @FIXME: fix hard code here
    if (queryName === 'listReportedProfilesByStatus' && queryVariables.status === 'ALL') {
      queryName = 'listReportedProfilesByGroup';
      if (params.sort.field === 'listReportedProfilesByStatus') {
        params.sort.field = 'listReportedProfilesByGroup';
      }
      queryVariables = { group: 'ReportedProfile' };
    }

    if (!queryName && !queryVariables) {
      // Default list query without filter
      queryName = this.getQueryName("list", resource);
    }

    const query = this.getQuery(queryName);

    if (!queryVariables) {
      queryVariables = {};
    }


    // @FIXME: fix hard code here
    if (queryName === 'adminSearchUsers' && filter[queryName]) {
      queryVariables['filter'] = {
        ...queryVariables['filter'],
        ...filter[queryName]['filter']
      }
    } else if (queryName === 'listFollowingReports') {
      if (filter[queryName]) {
        let monthRange;
        if (filter[queryName]['filter'] && filter[queryName]['filter']['end']) {
          monthRange = generateMonthRange(new Date(filter[queryName]['filter']['end']));
        } else {
          monthRange = generateMonthRange(new Date());
        }

        queryVariables['filter'] = {
          ...queryVariables['filter'],
          ...{
            ...filter[queryName]['filter'],
            ...monthRange
          }
        };
      } else {
        queryVariables['filter'] = {
          ...queryVariables['filter'],
          ...generateMonthRange(new Date())
        };
      }
    }

    const { page, perPage } = params.pagination;


    // Defines a unique identifier of the query
    const querySignature = JSON.stringify({
      queryName,
      queryVariables,
      perPage,
    });

    const nextToken = Pagination.getNextToken(querySignature, page);

    // Checks if page requested is out of range
    if (typeof nextToken === "undefined") {
      return {
        data: [],
        total: 0,
      }; // React admin will redirect to page 1
    }

    // Adds sorting if requested
    if (params.sort.field === queryName) {
      queryVariables["sortDirection"] = params.sort.order;
    }

    // Executes the query]
    const queryData = (
      await this.graphql(query, {
        ...queryVariables,
        limit: perPage,
        nextToken,
      })
    )[queryName];


    // Saves next token
    Pagination.saveNextToken(queryData.nextToken, querySignature, page);

    // Computes total
    let total = (page - 1) * perPage + queryData.items.length;
    if (queryData.nextToken) {
      total++; // Tells react admin that there is at least one more page
    }

    return {
      data: queryData.items,
      total,
    };
  }

  async getOne(resource, params) {
    // if (this.enableAdminQueries && resource === "cognitoUsers") {
    //   return AdminQueries.getCognitoUser(params);
    // }

    const queryName = this.getQueryName("get", resource);
    const query = this.getQuery(queryName);

    // Executes the query
    const queryData = (await this.graphql(query, { id: params.id }))[queryName];

    return {
      data: queryData,
    };
  }

  async getMany(resource, params) {
    // if (this.enableAdminQueries && resource === "cognitoUsers") {
    //   return AdminQueries.getManyCognitoUsers(params);
    // }

    const queryName = this.getQueryName("get", resource);
    const query = this.getQuery(queryName);

    const queriesData = [];

    // Executes the queries
    for (const id of params.ids) {
      try {
        const queryData = (await this.graphql(query, { id }))[queryName];
        queriesData.push(queryData);
      } catch (e) {
        console.log(e);
      }
    }

    return {
      data: queriesData,
    };
  }

  async getManyReference(resource, params) {
    const { filter = {}, id, pagination, sort, target } = params;
    const splitTarget = target.split(".");

    // splitTarget is used to build the filter
    // It must be like: queryName.resourceID
    if (splitTarget.length === 2) {
      if (!filter[splitTarget[0]]) {
        filter[splitTarget[0]] = {};
      }

      filter[splitTarget[0]][splitTarget[1]] = id;
    } else {
      const queryName = this.getQueryNameMany("list", resource, target);
      if (!filter[queryName]) {
        filter[queryName] = {};
      }
      filter[queryName][target] = id;
    }

    return this.getList(resource, { pagination, sort, filter });
  }

  async create(resource, params) {
    const queryName = this.getQueryName("create", resource);
    const query = this.getQuery(queryName);

    // Executes the query
    const queryData = (await this.graphql(query, { input: params.data }))[
      queryName
    ];

    return {
      data: queryData,
    };
  }

  async update(resource, params) {
    const queryName = this.getQueryName("update", resource);
    const query = this.getQuery(queryName);

    // Removes non editable fields
    const { data } = params;
    delete data._deleted;
    delete data._lastChangedAt;
    delete data.createdAt;
    delete data.updatedAt;

    // Executes the query
    const queryData = (await this.graphql(query, { input: data }))[queryName];

    return {
      data: queryData,
    };
  }

  // This may not work for API that uses DataStore because
  // DataStore works with a _version field that needs to be properly set
  async updateMany(resource, params) {
    const queryName = this.getQueryName("update", resource);
    const query = this.getQuery(queryName);

    // Removes non editable fields
    const { data } = params;
    delete data._deleted;
    delete data._lastChangedAt;
    delete data.createdAt;
    delete data.updatedAt;

    const ids = [];

    // Executes the queries
    for (const id of params.ids) {
      try {
        await this.graphql(query, { input: { ...data, id } });
        ids.push(id);
      } catch (e) {
        console.log(e);
      }
    }

    return {
      data: ids,
    };
  }

  async delete(resource, params) {
    const queryName = this.getQueryName("delete", resource);
    const query = this.getQuery(queryName);

    const { id, previousData } = params;
    const data = { id };

    if (previousData._version) {
      data._version = previousData._version;
    }

    // Executes the query
    const queryData = (await this.graphql(query, { input: data }))[queryName];

    return {
      data: queryData,
    };
  }

  async deleteMany(resource, params) {
    const queryName = this.getQueryName("delete", resource);
    const query = this.getQuery(queryName);

    const ids = [];

    // Executes the queries
    for (const id of params.ids) {
      try {
        await this.graphql(query, { input: { id } });
        ids.push(id);
      } catch (e) {
        console.log(e);
      }
    }

    return {
      data: ids,
    };
  }

  async disable(resource, params) {
    const queryName = this.getQueryName("disable", resource);
    const query = this.getQuery(queryName);

    // Executes the query
    const queryData = (await this.graphql(query, { input: params.data }))[
      queryName
    ];

    return {
      data: queryData,
    };
  }

  async enable(resource, params) {
    const queryName = this.getQueryName("enable", resource);
    const query = this.getQuery(queryName);

    // Executes the query
    const queryData = (await this.graphql(query, { input: params.data }))[
      queryName
    ];

    return {
      data: queryData,
    };
  }

  subscribeOnReportProfile(params) {
    const query = this.getQuery('onReportProfile');
    return API.graphql(graphqlOperation(query, params.data));
  }

  getQuery(queryName) {
    if (this.queries[queryName]) {
      return this.queries[queryName];
    }

    if (this.mutations[queryName]) {
      return this.mutations[queryName];
    }

    if (this.subscriptions[queryName]) {
      return this.subscriptions[queryName];
    }

    console.log(`Could not find query ${queryName}`);

    throw new Error("Data provider error");
  }

  getQueryName(operation, resource) {
    const pluralOperations = ["list"];
    if (pluralOperations.includes(operation)) {
      return `${operation}${
        resource.charAt(0).toUpperCase() + resource.slice(1)
      }`;
    }
    // else singular operations ["create", "delete", "get", "update"]
    return `${operation}${
      resource.charAt(0).toUpperCase() + resource.slice(1, -1)
    }`;
  }

  getQueryNameMany(operation, resource, target) {
    const queryName = this.getQueryName(operation, resource);

    return `${queryName}By${
      target.charAt(0).toUpperCase() + target.slice(1, -2)
    }Id`;
  }

  async graphql(query, variables) {
    const queryResult = await API.graphql({
      query,
      variables,
      authMode: this.authMode,
    });

    if (queryResult.errors || !queryResult.data) {
      throw new Error("Data provider error");
    }

    return queryResult.data;
  }
}
