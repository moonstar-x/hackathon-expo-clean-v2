import type { ReactElement } from 'react';
import { TabbedFormTabs, type TabbedFormTabsProps } from 'react-admin';

// The <TabbedForm> counterpart of ResponsiveShowTabs. `allowScrollButtonsMobile`
// matters: MUI hides the scroll arrows on touch devices otherwise, so nothing shows that more tabs
// exist. Pass it as <TabbedForm tabs={<ResponsiveTabbedFormTabs />}>.
const ResponsiveTabbedFormTabs = (props: TabbedFormTabsProps): ReactElement => (
  <TabbedFormTabs variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile {...props} />
);

export default ResponsiveTabbedFormTabs;
