const { execSync, execFile } = require('child_process')
const os = require('os')

const createPrint = ({
  pathToSumatraExecutable
}) =>
  (
    {
      filepath,
      paperSize,
      paperOrientation,
      copies
    }
  ) => {
    let cmd
    let output

    switch (os.platform()) {
      case 'darwin':
        cmd = 'lpr' +
              ' -o media=' + ((paperSize === 'LTR') ? 'letter' : 'a4') +
              ((paperOrientation === 'landscape') ? ' -o orientation-requested=4' : '') +
              ' -#' + copies +
              ' ' + filepath
        output = execSync(cmd)
        console.log(output.toString())
        break

      case 'linux':
        cmd = 'lp' +
              ' -n ' + copies +
              ' ' + filepath
        output = execSync(cmd)
        console.log(output.toString())
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
          }
          console.log(stdout)
        })
        break
    }
  }

module.exports = { createPrint }
