import type { ReactElement } from 'react';
import type { TabContentProps } from '../../../types/measurements';

/**
 * The content of a measurement tab. <TabbedShowLayout.Tab> wraps each child in <Labeled>, which
 * adds an empty label line above a child without a label; `label={false}` tells it not to.
 */
const TabContent = ({ children }: TabContentProps): ReactElement => <>{children}</>;

export default TabContent;
