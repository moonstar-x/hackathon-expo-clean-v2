import type { ReactElement } from 'react';
import { TabbedShowLayoutTabs, type TabbedShowLayoutTabsProps } from 'react-admin';

// A horizontally scrollable tab header for <TabbedShowLayout>, so many tabs keep
// their natural width on a phone. Pass it as <TabbedShowLayout tabs={<ResponsiveShowTabs />}>.
const ResponsiveShowTabs = (props: TabbedShowLayoutTabsProps): ReactElement => (
  <TabbedShowLayoutTabs variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile {...props} />
);

export default ResponsiveShowTabs;
