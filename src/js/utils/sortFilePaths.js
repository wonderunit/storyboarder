const path = require('path')

const sortFilePaths = filepaths =>
  // make a copy
  [...filepaths]
  // sort it ...
  .sort(
    (a, b) =>
      // ... based on the filename parsed as an integer
      parseInt(path.basename(a), 10) - parseInt(path.basename(b), 10)
  )

module.exports = sortFilePaths
