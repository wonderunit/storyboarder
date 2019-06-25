const path = require('path')

// via https://stackoverflow.com/a/38641281
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const sortFilePaths = filepaths =>
  // make a copy
  [...filepaths]
  // sort it ...
  .sort(
    (a, b) =>
      // ... compare basenames
      collator.compare(path.basename(a), path.basename(b))
  )

module.exports = sortFilePaths
