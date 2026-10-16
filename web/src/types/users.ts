// Props of the user screens (components/users).

export interface UserFormProps {
  /** Edit asks for a new password only if it changes, and offers Delete (except on your own account). */
  isEdit?: boolean;
}
