import type { ReactElement } from 'react';
import { useCreateContext, useTranslate, type CreateControllerResult, type TranslateFunction } from 'react-admin';
import type { FormHeaderProps } from '../types/components';
import PageHeader from './PageHeader';

/**
 * The heading of a create page, passed to <Create actions>: the controller's own title
 * ("Crear Producto") under the menu section. <Create> already puts that title in the AppBar.
 */
const CreateHeader = ({ eyebrow, title, actions }: FormHeaderProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { defaultTitle }: CreateControllerResult = useCreateContext();
  return (
    <PageHeader
      eyebrow={eyebrow ? translate(eyebrow) : null}
      title={title ? translate(title) : defaultTitle}
      actions={actions}
    />
  );
};

export default CreateHeader;
