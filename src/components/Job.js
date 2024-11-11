import React from "react";
import {
  Create,
  Datagrid,
  DateField,
  Edit,
  EditButton,
  List,
  required,
  number,
  Show,
  ShowButton,
  SimpleForm,
  SimpleShowLayout,
  TextField,
  TextInput,
  NumberInput,
  minValue,
  useNotify,
  useRefresh,
  useRedirect,
  Toolbar,
  SaveButton,
  DeleteButton
} from "react-admin";
import { makeStyles } from '@material-ui/core/styles';

// const defaultQuery = "listJobsByType";

export const JobList = (props) => {
  // const [query, setQuery] = useState(defaultQuery);

  return (
    <List {...props} bulkActionButtons={false} filterDefaultValues={{ listJobsByType: { type: "Job" } }} >
      <Datagrid>
        <TextField source="name" sortable={false} />
        <TextField source="priority" sortable={false} />
        <DateField source="createdAt" sortable={false} />
        <DateField source="updatedAt" sortable={false} />
        <ShowButton />
        <EditButton />
      </Datagrid>
    </List>
  );
};

export const JobShow = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="name" />
      <TextField source="priority" />
      <DateField source="createdAt" />
      <DateField source="updatedAt" />
    </SimpleShowLayout>
  </Show>
);

const validateName = [required()];
const validatePriority = [required(), number(), minValue(0)];

const useStyles = makeStyles({
  toolbar: {
    flex: '1',
    display: 'flex',
    justifyContent: 'space-between',
  },
});

const JobEditToolbar = props => {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  const onDeleteFailure = (response) => {
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

  const onDeleteSuccess = () => {
    notify('ra.job.deleted');
    redirect('/jobs');
    refresh();
  };

  return (
    <Toolbar {...props} classes={useStyles()}>
      <SaveButton mutationMode="pessimistic" />
      <DeleteButton confirmTitle={`Delete job ${props.record.name}`} mutationMode="pessimistic" onFailure={onDeleteFailure} onSuccess={onDeleteSuccess} />
    </Toolbar>
  );
};

export const JobEdit = (props) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  const onSuccess = () => {
    notify('ra.job.updated');
    redirect('/jobs');
    refresh();
  };

  return (
    <Edit
      {...props}
      mutationMode="pessimistic"
      onSuccess={onSuccess}
      transform={(data) => {
        const { jobs, ...rest } = data;

        return {
          id: rest.id,
          name: rest.name,
          type: 'Job',
          priority: Math.floor(data.priority)
        };
      }}
    >
      <SimpleForm toolbar={<JobEditToolbar />}>
        <TextInput source="name" validate={validateName} />
        <NumberInput source="priority" validate={validatePriority} />
      </SimpleForm>
    </Edit>
  );
};

export const JobCreate = (props) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  const onSuccess = () => {
    notify('ra.job.created');
    redirect('/jobs');
    refresh();
  };

  return (
    <Create {...props} onSuccess={onSuccess} transform={(data) => {
      return {
        ...data,
        type: 'Job',
        priority: Math.floor(data.priority)
      }
    }}>
      <SimpleForm>
        <TextInput source="name" validate={validateName} />
        <NumberInput source="priority" validate={validatePriority} />
      </SimpleForm>
    </Create>
  );
};