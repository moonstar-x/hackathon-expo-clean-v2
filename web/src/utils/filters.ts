/**
 * The value a yes-only filter switch sends: `true`, or nothing. Switching it off must remove the
 * filter rather than send `false` (which means "not low stock", "not stale"). react-admin ignores an
 * `undefined` change but strips empty strings from the filter, so off becomes ''.
 */
export const trueOrRemove = (value: boolean): true | '' => (value ? true : '');
