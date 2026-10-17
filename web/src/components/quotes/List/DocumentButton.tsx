import type { MouseEvent, ReactElement } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { Link } from 'react-router-dom';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { Quote } from '../../../types/quotes';

/** Opens the quote's Documento page; in a table row it doesn't also open the quote. */
const DocumentButton = ({ variant = 'text', size }: Pick<ButtonProps, 'variant' | 'size'>): ReactElement | null => {
  const quote: Quote | undefined = useRecordContext<Quote>();
  const translate: TranslateFunction = useTranslate();
  if (!quote) return null;
  return (
    <Button
      component={Link}
      to={`/quotes/${quote.id}/document`}
      variant={variant}
      size={size}
      startIcon={<DescriptionOutlined />}
      onClick={(event: MouseEvent): void => event.stopPropagation()}
    >
      {translate('app.quotes.document')}
    </Button>
  );
};

export default DocumentButton;
