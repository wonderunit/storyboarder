import { createSelectorCreator, defaultMemoize } from 'reselect'
import isEqual from 'lodash.isequal'

const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);

export default createDeepEqualSelector
