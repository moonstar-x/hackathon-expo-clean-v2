import type { ComponentType, ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Link } from 'react-router-dom';
import {
  useCreatePath,
  useGetResourceLabel,
  useListContextWithProps,
  useResourceContext,
  useResourceDefinition,
  useTranslate,
  type ListControllerResult,
  type ResourceDefinition,
  type TranslateFunction,
} from 'react-admin';
import { APP_LOCALE } from '../../constants/app';
import { emptyActionsSx, emptyBodySx, emptyIconSx, emptyStateSx, emptyStepsSx } from '../../styles/list';
import type { EmptyStateProps } from '../../types/list';

/**
 * What a list shows when it has nothing to show, used as every List's, DataTable's and SimpleList's
 * `empty`. With filters set it says nothing matches and offers to clear them; otherwise it says what
 * goes in the list (`app.empty.<resource>`), with the resource's icon and a way to add the first one.
 */
const EmptyState = ({ variant = 'inline', resource: resourceProp, action, steps, icon, messages }: EmptyStateProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const resource: string | undefined = useResourceContext({ resource: resourceProp });
  const definition: ResourceDefinition = useResourceDefinition({ resource });
  // Outside a list (a dashboard panel) there is no list context: no filters, never "no results".
  const list: Partial<ListControllerResult> = useListContextWithProps();
  // react-admin types filterValues as `any`; it is a plain object keyed by filter source.
  const filterValues: Record<string, unknown> = (list.filterValues ?? {}) as Record<string, unknown>;
  const { setFilters }: Partial<ListControllerResult> = list;
  const getResourceLabel: (resource: string, count?: number) => string = useGetResourceLabel();
  const createPath: ReturnType<typeof useCreatePath> = useCreatePath();

  const filtered: boolean = setFilters !== undefined && Object.keys(filterValues).length > 0;
  const key: string = filtered ? 'app.empty.filtered' : (messages ?? `app.empty.${resource ?? 'default'}`);
  // react-admin types a resource's icon as `any`; App.tsx registers an icon component for each.
  const resourceIcon: ComponentType | undefined = definition.icon as ComponentType | undefined;
  const Icon: ComponentType = filtered ? SearchOffIcon : (icon ?? resourceIcon ?? InboxOutlinedIcon);

  const clearFilters: ReactNode =
    filtered && setFilters ? (
      <Button variant="outlined" onClick={(): void => setFilters({}, {})}>
        {translate('ra.navigation.clear_filters')}
      </Button>
    ) : null;
  const create: ReactNode =
    resource && definition.hasCreate ? (
      <Button variant="contained" component={Link} to={createPath({ resource, type: 'create' })} startIcon={<AddIcon />}>
        {translate(`${key}.action`, {
          _: translate('ra.action.create_item', { item: getResourceLabel(resource, 1).toLocaleLowerCase(APP_LOCALE) }),
        })}
      </Button>
    ) : null;
  const shownAction: ReactNode = filtered ? clearFilters : action === false ? null : (action ?? create);

  const content: ReactElement = (
    <Box sx={emptyStateSx(variant)}>
      <Box sx={emptyIconSx(variant)} aria-hidden>
        <Icon />
      </Box>
      <Typography
        variant={variant === 'compact' ? 'subtitle1' : 'h6'}
        component={variant === 'page' ? 'h2' : 'p'}
        sx={{ fontWeight: 600 }}
      >
        {translate(`${key}.title`)}
      </Typography>
      <Typography variant="body2" sx={emptyBodySx}>
        {translate(`${key}.body`)}
      </Typography>
      {steps && !filtered ? (
        <Box component="ol" sx={emptyStepsSx}>
          {steps.map(
            (step: string): ReactElement => (
              <li key={step}>{translate(step)}</li>
            ),
          )}
        </Box>
      ) : null}
      {shownAction ? <Box sx={emptyActionsSx}>{shownAction}</Box> : null}
    </Box>
  );

  return variant === 'page' ? <Card>{content}</Card> : content;
};

export default EmptyState;
