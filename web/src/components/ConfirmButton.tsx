import { useState, type ReactElement } from 'react';
import { Button, Confirm, useNotify } from 'react-admin';
import { REQUEST_FAILED_MESSAGE } from '../constants/http';
import type { ConfirmButtonProps } from '../types/components';

/**
 * A react-admin button that asks first, in a dialog whose primary action is "Confirmar".
 * Replaces the native confirm() prompts of the previous admin page.
 */
const ConfirmButton = ({
  confirmTitle = 'ra.message.are_you_sure',
  confirmContent,
  onConfirm,
  disabled,
  ...props
}: ConfirmButtonProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const notify: ReturnType<typeof useNotify> = useNotify();

  const confirm = async (): Promise<void> => {
    setPending(true);
    try {
      await onConfirm();
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : REQUEST_FAILED_MESSAGE, { type: 'error', autoHideDuration: null });
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button {...props} disabled={disabled || pending} onClick={(): void => setOpen(true)} />
      <Confirm
        isOpen={open}
        loading={pending}
        title={confirmTitle}
        content={confirmContent}
        onConfirm={confirm}
        onClose={(): void => setOpen(false)}
      />
    </>
  );
};

export default ConfirmButton;
