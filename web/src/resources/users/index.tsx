import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  BooleanField,
  BooleanInput,
  BulkDeleteButton,
  Create,
  Datagrid,
  DateField,
  DeleteButton,
  Edit,
  email,
  List,
  maxLength,
  minLength,
  NullableBooleanInput,
  PasswordInput,
  required,
  SaveButton,
  SearchInput,
  SimpleForm,
  TextField,
  TextInput,
  Toolbar,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useRedirect,
  type FieldProps,
} from 'react-admin';
import { emptyToNull } from '../../components/validators';
import { updateStoredUser } from '../../providers/authStorage';
import type { User } from '../../types';

// Client-side mirror of the API's password rules. The server stays authoritative.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** True when `record` is the logged-in user's own account. */
function useIsSelf(record: Pick<User, 'id'> | undefined) {
  const { identity } = useGetIdentity();
  return record != null && identity != null && record.id === identity.id;
}

/** The name (or a dash), plus a "Tú" chip on your own row. */
function UserNameField(props: Partial<FieldProps>) {
  const record = useRecordContext(props) as User | undefined;
  const isSelf = useIsSelf(record);
  if (!record) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography component="span" variant="body2">
        {record.name || '—'}
      </Typography>
      {isSelf && <Chip size="small" label="Tú" />}
    </Stack>
  );
}

const userFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Buscar por nombre o correo" />,
  <NullableBooleanInput key="active" source="active" label="Activo" />,
];

export function UserList() {
  const { identity } = useGetIdentity();
  return (
    <List filters={userFilters} sort={{ field: 'email', order: 'ASC' }}>
      <Datagrid
        rowClick="edit"
        // The API refuses to delete your own account, so it cannot be selected for bulk delete.
        isRowSelectable={(record) => record.id !== identity?.id}
        bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}
      >
        <UserNameField source="name" label="Nombre" sortBy="name" />
        <TextField source="email" />
        <BooleanField source="active" />
        <DateField source="lastLoginAt" label="Último acceso" showTime emptyText="Nunca" />
        <DateField source="createdAt" label="Fecha de creación" />
      </Datagrid>
    </List>
  );
}

function UserForm({ isEdit = false }: { isEdit?: boolean }) {
  const record = useRecordContext<User>();
  const isSelf = useIsSelf(record);
  const passwordRules = [minLength(PASSWORD_MIN_LENGTH), maxLength(PASSWORD_MAX_LENGTH)];

  return (
    <SimpleForm
      sx={{ maxWidth: 600 }}
      toolbar={
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <SaveButton />
          {isEdit && !isSelf && <DeleteButton mutationMode="pessimistic" />}
        </Toolbar>
      }
    >
      <TextInput source="name" validate={maxLength(100)} parse={emptyToNull} fullWidth />
      <TextInput source="email" type="email" validate={[required(), email(), maxLength(254)]} autoComplete="off" fullWidth />
      <PasswordInput
        source="password"
        label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
        helperText={
          isEdit
            ? 'Déjala en blanco para mantener la contraseña actual.'
            : `Al menos ${PASSWORD_MIN_LENGTH} caracteres. Compártela con el usuario por un canal seguro.`
        }
        validate={isEdit ? passwordRules : [required(), ...passwordRules]}
        // Stops the browser from filling in the logged-in user's own saved password.
        autoComplete="new-password"
        fullWidth
      />
      <BooleanInput
        source="active"
        defaultValue={true}
        disabled={isSelf}
        helperText={isSelf ? 'No puedes desactivar tu propia cuenta.' : 'Los usuarios inactivos no pueden iniciar sesión.'}
      />
    </SimpleForm>
  );
}

export function UserCreate() {
  return (
    <Create redirect="list">
      <UserForm />
    </Create>
  );
}

export function UserEdit() {
  const notify = useNotify();
  const redirect = useRedirect();
  const { identity, refetch } = useGetIdentity();

  // react-admin's default (notification, back to the list), plus refreshing the
  // app bar when you edit your own name or email.
  const onSuccess = (user: User) => {
    if (user.id === identity?.id) {
      updateStoredUser(user);
      void refetch();
    }
    notify('ra.notification.updated', { type: 'info', messageArgs: { smart_count: 1 } });
    redirect('list', 'users');
  };

  return (
    <Edit mutationMode="pessimistic" mutationOptions={{ onSuccess }}>
      <UserForm isEdit />
    </Edit>
  );
}
