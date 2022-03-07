const { spawnSync, execFile } = require('child_process')
const os = require('os')

const createPrint = ({
  pathToSumatraExecutable
}) =>
  (
    {
      // absolute filepath to source
      filepath,

      // a4, letter, legal
      paperSize,

      // landscape, portrait
      paperOrientation,

      // number of copies
      copies
    }
  ) => {
    let output

    switch (os.platform()) {
      case 'darwin':
        output = spawnSync('lpr', [
          '-o', `media=${paperSize}`,
          ...paperOrientation == 'landscape'
            ? ['-o', 'orientation-requested=4']
            : [],
          '-#', copies,
          filepath
        ])
        if (output.error) throw new Error(output.error)
        console.log(output.stdout.toString())
        console.error(output.stderr.toString())
        break

      case 'linux':
        output = spawnSync('lp', [
          '-n', copies,
          filepath
        ])
        if (output.error) throw new Error(output.error)
        console.log(output.stdout.toString())
        console.error(output.stderr.toString())
        break

      case 'win32':
        let args = [
          '-print-to-default',
          '-silent',
          '-print-settings "' + copies + 'x"',
          filepath
        ]
        execFile(pathToSumatraExecutable, args, (err, stdout, stderr) => {
          if (err) {
            console.error('error', err)
            throw new Error(err)
          }
          console.log(stdout)
          console.error(stderr)
        })
        break
    }
  }

module.exports = createPrint
