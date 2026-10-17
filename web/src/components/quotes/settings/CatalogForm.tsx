import { Fragment, type ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import { SimpleForm, useTranslate, type TranslateFunction } from 'react-admin';
import { CATALOG_SECTIONS } from '../../../constants/quoteSettings';
import type { CatalogField, CatalogFormProps, CatalogSection } from '../../../types/quotes';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';
import CatalogInput from './CatalogInput';
import ProductComputed from './ProductComputed';

const DEFAULT_VALUES: Record<string, unknown> = { active: true };

/** Columns of 12 a field takes from `md`: numbers, choices and switches 4, text and references 6. */
const fieldSize = ({ size, type }: CatalogField): number => size ?? (type && type !== 'text' && type !== 'reference' ? 4 : 6);

/**
 * A quoting catalog's form, in titled sections (CATALOG_SECTIONS). Changing a value changes no
 * existing quote until it is recalculated, which the toolbar says beside Save.
 */
const CatalogForm = ({ resource, withDelete = false }: CatalogFormProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const sections: CatalogSection[] = CATALOG_SECTIONS[resource] ?? [];
  return (
    <SimpleForm
      defaultValues={DEFAULT_VALUES}
      toolbar={<FormToolbar withDelete={withDelete} note={translate('app.quoteSettings.advice')} />}
    >
      {sections.map(
        (section: CatalogSection, index: number): ReactElement => (
          <Fragment key={section.title}>
            {index > 0 ? <SectionDivider /> : null}
            <Section title={translate(section.title)} hint={section.hint ? translate(section.hint) : undefined}>
              {section.fields.map(
                (field: CatalogField): ReactElement => (
                  <Grid key={field.name} size={{ xs: 12, md: fieldSize(field) }}>
                    <CatalogInput field={field} />
                  </Grid>
                ),
              )}
            </Section>
          </Fragment>
        ),
      )}
      {resource === 'quote-products' ? (
        <>
          <SectionDivider />
          <ProductComputed />
        </>
      ) : null}
    </SimpleForm>
  );
};

export default CatalogForm;
