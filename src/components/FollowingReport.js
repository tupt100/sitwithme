import React, { useState } from "react";
import {
  Datagrid,
  List,
  TextField,
  TextInput,
} from "react-admin";
import { AmplifySearch } from "./AmplifySearch";
import { DateInput } from '@shinabr2/react-admin-date-inputs';

const defaultQuery = "listFollowingReports";



const FollowingReportFilter = (props) => {
  return (<AmplifySearch {...props} defaultQuery={defaultQuery}>
    <TextInput
      source="listFollowingReports.filter.term"
      label="Name or Email"
      alwaysOn
      resettable
    />
    <DateInput
      source="listFollowingReports.filter.end"
      label="Choose Month"
      options={{
        views: ['month', 'year'],
        clearable: true
      }}
      alwaysOn
    />
  </AmplifySearch>
  );
};

export const FollowingReportList = (props) => {
  const [query, setQuery] = useState(defaultQuery);

  return (
    <List {...props} bulkActionButtons={false} filters={<FollowingReportFilter setQuery={setQuery} />} filterDefaultValues={{ listFollowingReports: { filter: { end: new Date().toISOString() } } }}>
      <Datagrid>
        <TextField source="staffProfileConnection.email" label="Email" sortable={false} />
        <TextField source="staffProfileConnection.userName" label="Username" sortable={false} />
        <TextField source="staffProfileConnection.firstName" label="First name" sortable={false} />
        <TextField source="staffProfileConnection.lastName" label="Last name" sortable={false} />
        <TextField source="totalFollowers" sortable={false} />
        <TextField source="newFollowers" sortable={false} label="New Followers In Month" />
      </Datagrid>
    </List>
  );
};
