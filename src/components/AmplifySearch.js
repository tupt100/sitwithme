import React, { useEffect } from "react";
import { Filter, useListContext } from "react-admin";

function getParams(filters) {
  const keys = {};

  for (const filter of filters) {
    if (filter === null || typeof filter !== "object") {
      throw new Error("AmplifyFilter children are invalid");
    }

    const input = filter;

    if (!input.props || !input.props.source) {
      throw new Error("AmplifyFilter children are invalid");
    }

    const source = input.props.source;
    // const sourceSplit = source.split(".");

    // A dot must seperate the query name and the key name
    // if (sourceSplit.length < 2) {
    //   throw new Error(
    //     `Source ${source} is not valid because a separation dot is missing`
    //   );
    // }

    const queryName = source;
    const params = input.props.meta;

    if (!keys[queryName]) {
      keys[queryName] = params;
    }

    // Case when there is only the hash key
    // if (sourceSplit.length === 2) {
    //   if (keys[queryName].hashKey !== "") {
    //     throw new Error(
    //       `Source ${source} is not valid because hash key is already defined by another input`
    //     );
    //   }

    //   keys[queryName].hashKey = keyName;

    //   continue;
    // }

    // keys[queryName].sortKey = keyName;
  }

  return keys;
}

let oldfilterValues = {};

export const AmplifySearch = ({
  children,
  defaultQuery,
  setQuery = null,
  ...propsRest
}) => {
  let filters;

  if (children !== null && typeof children === "object") {
    filters = [children];
  }

  if (Array.isArray(children)) {
    filters = children;
  }

  if (!filters) {
    throw new Error("AmplifySearch children are invalid");
  }

  const {
    resource,
    showFilter: showFilter1,
    hideFilter,
    setFilters: setFilters,
    displayedFilters,
    filterValues: filterValues,
  } = useListContext(propsRest);

  const rest = propsRest;
  // const filterValues = rest.filterValues;
  // const setFilters = rest.setFilters;
  const params = getParams(filters);

  // Determines which query will be executed depending on the filter
  let query = defaultQuery;
  let args = '';
  if (Object.keys(filterValues).length === 1) {
    query = Object.keys(filterValues)[0];
    // args = params[query];

  //   if (filterValues[query]) {
  //     const strArgs = JSON.stringify(args).replace('<value>', filterValues[query]);
  //     if (setFilters) {
  //       setFilters({ query, args: JSON.parse(strArgs), [query]: filterValues[query] });
  //       oldfilterValues[query] = filterValues[query];
  //     }
  //   }
  // } else if (Object.keys(filterValues).length === 3) {
  //   query = filterValues.query;
  //   args = params[query];

  //   if (filterValues[query] && oldfilterValues[query] !== filterValues[query]) {
  //     const strArgs = JSON.stringify(args).replace('<value>', filterValues[query]);
  //     if (setFilters) {
  //       setFilters({ query, args: JSON.parse(strArgs), [query]: filterValues[query] });
  //       oldfilterValues[query] = filterValues[query];
  //     }
  //   }
  }

  // Tells the list component about the query in order to know which fields are sortable
  useEffect(() => {
    setQuery && setQuery(query);
  }, [query, setQuery]);

  function showFilter(queryName) {
    return query === defaultQuery || query === queryName;
  }

  // Checks if filter has a value
  function notBlank(filter) {
    return !!filter.split(".").reduce((o, i) => (!o ? o : o[i]), filterValues);
  }

  function renderInput(filter) {
    const input = filter;

    const source = input.props.source;
    const sourceSplit = source.split(".");

    const queryName = sourceSplit[0];

    return showFilter(queryName) && input;

    // if (sourceSplit.length === 2) {
    //   return showFilter(queryName) && input;
    // }

    // const hashKeySource = `${queryName}.${keys[queryName].hashKey}`;

    // return showFilter(queryName) && notBlank(hashKeySource) && input;
  }

  return <Filter {...rest}>{filters.map(renderInput)}</Filter>;
};