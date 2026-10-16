import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import { TabbedShowLayout } from 'react-admin';
import { measurementTabsSx } from '../../../styles/measurements';
import ResponsiveShowTabs from '../../ResponsiveShowTabs';
import FilesTab from './FilesTab';
import ModelTab from './ModelTab';
import PlanTab from './PlanTab';
import RoomsTab from './RoomsTab';
import TabContent from './TabContent';

/**
 * The four views of a measurement (SPEC-004 §6.5), with the plan first. Each tab has its own URL,
 * so a link can open the 3D view or the files directly.
 */
const MeasurementTabs = (): ReactElement => (
  <Card>
    <TabbedShowLayout tabs={<ResponsiveShowTabs />} sx={measurementTabsSx}>
      <TabbedShowLayout.Tab label="app.measurements.tabs.plan">
        <TabContent label={false}>
          <PlanTab />
        </TabContent>
      </TabbedShowLayout.Tab>
      <TabbedShowLayout.Tab label="app.measurements.tabs.model" path="model">
        <TabContent label={false}>
          <ModelTab />
        </TabContent>
      </TabbedShowLayout.Tab>
      <TabbedShowLayout.Tab label="app.measurements.tabs.rooms" path="measures">
        <TabContent label={false}>
          <RoomsTab />
        </TabContent>
      </TabbedShowLayout.Tab>
      <TabbedShowLayout.Tab label="app.measurements.tabs.files" path="files">
        <TabContent label={false}>
          <FilesTab />
        </TabContent>
      </TabbedShowLayout.Tab>
    </TabbedShowLayout>
  </Card>
);

export default MeasurementTabs;
