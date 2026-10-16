import {
  BulkDeleteButton,
  Create,
  Datagrid,
  DeleteButton,
  Edit,
  email,
  EmailField,
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

function SupplierForm({ withDelete }: { withDelete?: boolean }) {
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
      <TextInput source="name" validate={[required(), maxLength(150)]} fullWidth />
      <TextInput source="contactName" label="Contact name" validate={maxLength(150)} parse={emptyToNull} fullWidth />
      <TextInput source="email" type="email" validate={[email(), maxLength(254)]} parse={emptyToNull} fullWidth />
      <TextInput source="phone" validate={maxLength(50)} parse={emptyToNull} />
      <TextInput source="notes" multiline minRows={3} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
    </SimpleForm>
  );
}

export function SupplierList() {
  return (
    <List filters={[<SearchInput key="q" source="q" alwaysOn />]} sort={{ field: 'name', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}>
        <TextField source="name" />
        <TextField source="contactName" label="Contact" emptyText="—" />
        <EmailField source="email" emptyText="—" />
        <TextField source="phone" emptyText="—" sortable={false} />
      </Datagrid>
    </List>
  );
}

export function SupplierCreate() {
  return (
    <Create redirect="list">
      <SupplierForm />
    </Create>
  );
}

export function SupplierEdit() {
  return (
    <Edit mutationMode="pessimistic" redirect="list">
      <SupplierForm withDelete />
    </Edit>
  );
}
