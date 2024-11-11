import React, {useState} from "react";
import {
  Datagrid,
  DateField,
  List,
  TextField,
  SelectInput,
  FunctionField,
  BooleanField
} from "react-admin";
import { AmplifyFilter } from "react-admin-amplify";
import ResolveIssueButton from "./ResolveIssueButton";

const defaultQuery = 'listReportedProfilesByGroup';

const ReportedProfileFilter = (props) => (
  <AmplifyFilter {...props} defaultQuery={defaultQuery}>
    <SelectInput
      source="listReportedProfilesByStatus.status"
      choices={[
        { id: 'ALL', name: 'All' },
        { id: 'RESOLVED', name: 'Resolved' },
        { id: 'UNRESOLVED', name: 'Unresolved' }
      ]}
      allowEmpty={false}
      label="Status"
      alwaysOn
    />
  </AmplifyFilter>
);

const reasonMapping = {
  'SEXUAL': 'Sexual Content',
  'VIOLENT_OR_REPULSIVE': 'Violent or Repulsive Content',
  'HATEFUL_OR_ABUSIVE': 'Hateful or Abusive Content',
  'PRETENDING_TO_BE_SOMEONE': 'Pretending to be someone they are not',
  'HARASSMENT_OR_BULLYING': 'Harassment or Bullying'
};

export const ReportedProfileList = (props) => {
  const [query, setQuery] = useState(defaultQuery);

  return (
    <List {...props} bulkActionButtons={false} filters={<ReportedProfileFilter setQuery={setQuery} />} filterDefaultValues={{ listReportedProfilesByStatus: { status: 'UNRESOLVED' } }} sort={{ field: 'listReportedProfilesByStatus', order: 'DESC' }} >
      <Datagrid>
        <TextField label="Report Email" source="reporterProfileDetail.user.email" sortable={false} />
        <TextField label="Reported Email" source="reportedProfileDetail.user.email" sortable={false} />
        <TextField source="type" sortable={false} />
        <FunctionField label="Reason" render={record => (record.content && record.content.type) ? (reasonMapping[record.content.type] || record.content.type) : '' } />
        <DateField source="createdAt" sortBy="listReportedProfilesByStatus" sortable={true} />
        <BooleanField source="completedAt" label="Resolved" looseValue={true} sortable={false} />
        <ResolveIssueButton />
      </Datagrid>
    </List>
  );
};
