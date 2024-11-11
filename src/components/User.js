import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { fade } from '@material-ui/core/styles/colorManipulator';
import {
  Datagrid,
  DateField,
  List,
  ReferenceManyField,
  Show,
  ShowButton,
  TextField,
  TextInput,
  ReferenceField,
  ImageField,
  SingleFieldList,
  ChipField,
  TabbedShowLayout,
  Tab,
  TopToolbar,
  useMutation,
  Button,
  useNotify
} from "react-admin";
import { AmplifySearch } from "./AmplifySearch";

const useStyles = makeStyles(
  (theme) => ({
    disableButton: {
      color: theme.palette.error.main,
      '&:hover': {
          backgroundColor: fade(theme.palette.error.main, 0.12),
          // Reset on mouse devices
          '@media (hover: none)': {
              backgroundColor: 'transparent',
          },
      },
    },
    enableButton: {
      color: theme.palette.primary.main,
      '&:hover': {
          backgroundColor: fade(theme.palette.primary.main, 0.12),
          // Reset on mouse devices
          '@media (hover: none)': {
              backgroundColor: 'transparent',
          },
      },
    }
  }),
  { name: "RaDisableButton" }
);

const defaultQuery = "listUsers";

const UserFilter = (props) => {
  return (<AmplifySearch {...props} defaultQuery={defaultQuery}>
    <TextInput
      source="adminSearchUsers.filter.term"
      label="Name or Email"
      alwaysOn
      resettable
    />
  </AmplifySearch>
  );
};

export const UserList = (props) => {
  const [query, setQuery] = useState(defaultQuery);

  return (
    <List {...props} bulkActionButtons={false} filters={<UserFilter setQuery={setQuery} />}>
      <Datagrid>
        <TextField source="email" sortable={false} />
        <TextField source="firstName" sortable={false} />
        <TextField source="lastName" sortable={false} />
        <TextField source="userName" sortable={false} />
        <ReferenceManyField reference="profiles" target="listProfilesByUser.userID" label="Roles" sortable={false} >
          <SingleFieldList linkType={false}>
            <ChipField source="role" />
          </SingleFieldList>
        </ReferenceManyField>
        <ShowButton />
      </Datagrid>
    </List>
  );
};

const UserShowActions = (props) => {
  const classes = useStyles(props);
  console.log(classes);
  const data = props.data;

  const [mutate, { loading }] = useMutation();
  const notify = useNotify();
  let [action, setAction] = useState('disable');

  if (data && data.disabled) {
    action = 'enable';
  } else {
    action = 'disable';
  }

  const onActionSuccess = () => {
    notify('ra.notification.update_succeeded');

    if (action === 'disable') {
      setAction('enable');
      data.disabled = true;
    } else {
      setAction('disable');
      data.disabled = false;
    }
  };

  const onActionFailure = (response) => {
    const { errors } = response;
    let msg = 'There are something wrong. Please try again.';
    if (errors && errors[0]) {
      const error = errors[0];
      if (error.errorType === 'VALIDATION_ERROR' && error.errorInfo) {
        const field = Object.keys(error.errorInfo)[0];
        if (field && error.errorInfo[field][0]) {
          msg = error.errorInfo[field][0];
        }
      } else if (error.message) {
        msg = error.message;
      }
    }

    notify(msg, 'warning');
  };

  const handleClick = () => {
    return mutate({
      type: action,
      resource: 'users',
      payload: { data: { id: data ? data.id : null } }
    }, {
      undoable: false,
      onSuccess: onActionSuccess,
      onFailure: onActionFailure
    });
  };

  return (
    <TopToolbar>
      <Button label={action === 'enable' ? 'Enable' : 'Disable'} onClick={handleClick} disabled={loading} className={classes[`${action}Button`]} />
    </TopToolbar>
  );
};

export const UserShow = (props) => (
  <Show actions={<UserShowActions />} {...props}>
    <TabbedShowLayout>
      <Tab label="summary">
        <TextField source="id" />
        <TextField source="email" />
        <TextField source="firstName" />
        <TextField source="lastName" />
        <TextField source="userName" />
        <TextField source="birthday" emptyText="None" />
        <TextField source="gender" emptyText="None" />
        <TextField source="phone" emptyText="None" />
        <TextField source="userLocation.name" label="Location" emptyText="None" />
        <DateField source="createdAt" />
        <DateField source="updatedAt" />
      </Tab>

      <Tab label="roles" path="roles">
        <ReferenceManyField
          reference="profiles"
          target="listProfilesByUser.userID"
          label="Profiles">
          <Datagrid>
            <TextField source="role" sortable={false} />
            <TextField source="bio" sortable={false} />
            <ReferenceField
              source="avatarID"
              reference="photos"
              label="Avatar"
              sortable={false}
              link={false}
            >
              <ImageField source="url" />
            </ReferenceField>
            <DateField source="createdAt" sortable={false} />
            <DateField source="updatedAt" sortable={false} />
          </Datagrid>
        </ReferenceManyField>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

// const validateUserName = [required()];
// const validateEmail = [required()];
// const validateFirstName = [required()];
// const validateLastName = [required()];

// export const UserEdit = (props) => (
//   <Edit
//     {...props}
//   >
//     <SimpleForm>
//       <TextInput source="email" validate={validateEmail} />
//       <TextInput source="firstName" validate={validateFirstName} />
//       <TextInput source="lastName" validate={validateLastName} />
//       <TextInput source="userName" validate={validateUserName} />
//     </SimpleForm>
//   </Edit>
// );

// export const UserCreate = (props) => (
//   <Create {...props} >
//     <SimpleForm>
//       <TextInput source="userName" validate={validateUserName} />
//     </SimpleForm>
//   </Create>
// );
