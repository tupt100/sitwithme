import React from "react";
import {
  Datagrid,
  Edit,
  EditButton,
  List,
  required,
  SimpleForm,
  TextField,
  TextInput,
  BooleanInput,
  useNotify,
  useRefresh,
  useRedirect,
  Toolbar,
  SaveButton,
  BooleanField
} from "react-admin";

export const AppVersionList = (props) => {

  return (
    <List {...props} bulkActionButtons={false} >
      <Datagrid>
        <TextField source="id" sortable={false} />
        <TextField source="currentAppVersion" sortable={false} />
        <BooleanField source="forceUpdated" label="Force Update" looseValue={true} sortable={false} />
        <EditButton />
      </Datagrid>
    </List>
  );
};

const validateCurrentAppVersion = [required()];
const validateForceUpdated = [required()];

const AppVersionEditToolbar = props => {
  return (
    <Toolbar {...props}>
      <SaveButton mutationMode="pessimistic" />
    </Toolbar>
  );
};

export const AppVersionEdit = (props) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  const onSuccess = () => {
    notify('ra.appVersion.updated');
    redirect('/appVersions');
    refresh();
  };

  return (
    <Edit
      {...props}
      mutationMode="pessimistic"
      onSuccess={onSuccess}
    >
      <SimpleForm toolbar={<AppVersionEditToolbar />}>
        <TextInput source="currentAppVersion" validate={validateCurrentAppVersion} />
        <BooleanInput source="forceUpdated" validate={validateForceUpdated} />
      </SimpleForm>
    </Edit>
  );
};
