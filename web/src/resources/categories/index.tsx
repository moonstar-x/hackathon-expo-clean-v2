import {
  BulkDeleteButton,
  Create,
  Datagrid,
  DeleteButton,
  Edit,
  List,
  maxLength,
  required,
  SaveButton,
  SearchInput,
  SimpleForm,
  TextField,
  TextInput,
  Toolbar,
} from 'react-admin';
import { emptyToNull } from '../../components/validators';

function CategoryForm({ withDelete }: { withDelete?: boolean }) {
  return (
    <SimpleForm
      sx={{ maxWidth: 600 }}
      toolbar={
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <SaveButton />
          {withDelete && <DeleteButton mutationMode="pessimistic" />}
        </Toolbar>
      }
    >
      <TextInput source="name" validate={[required(), maxLength(100)]} fullWidth />
      <TextInput source="description" multiline minRows={2} validate={maxLength(500)} parse={emptyToNull} fullWidth />
    </SimpleForm>
  );
}

export function CategoryList() {
  return (
    <List filters={[<SearchInput key="q" source="q" alwaysOn />]} sort={{ field: 'name', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}>
        <TextField source="name" />
        <TextField source="description" emptyText="—" sortable={false} />
      </Datagrid>
    </List>
  );
}

export function CategoryCreate() {
  return (
    <Create redirect="list">
      <CategoryForm />
    </Create>
  );
}

export function CategoryEdit() {
  return (
    <Edit mutationMode="pessimistic" redirect="list">
      <CategoryForm withDelete />
    </Edit>
  );
}
