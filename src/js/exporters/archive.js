const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')
const archiver = require('archiver')

const exporterCopyProject = require('./copy-project')

const exportAsZIP = async (srcFilePath, exportFilePath) => {
  // create temporary folder
  let tmpdir = tmp.dirSync()

  let tmpZipFilePath

  try {
    // copy project to folder
    let dstFolderPath = path.join(tmpdir.name, path.basename(srcFilePath, path.extname(srcFilePath)))
    // let dstFilePath = path.join(dstFolderPath, path.basename(srcFilePath))

    // if directory present, delete all its files
    // if directory not present, create it
    fs.emptyDirSync(dstFolderPath)

    // copy files
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)
  
    try {
      await new Promise((resolve, reject) => {
        // zip the folder
        tmpZipFilePath = path.join(tmpdir.name, path.basename(srcFilePath, path.extname(srcFilePath)) + Date.now() + '.zip')
        // console.log('writing', tmpZipFilePath)
        let output = fs.createWriteStream(tmpZipFilePath)
        let archive = archiver('zip', {
          zlib: { level: 9 } // compression level
        })
        // listen for all archive data to be written
        output.on('close', function() {
          // console.log(archive.pointer() + ' total bytes')
          // console.log('archiver has been finalized and the output file descriptor has closed.')
          resolve()
        })
        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            // throw error
            reject(err)
          } else {
            // throw error
            reject(err)
          }
        })
        // good practice to catch this error explicitly
        archive.on('error', function(err) {
          reject(err)
        })
        // pipe archive data to the file
        archive.pipe(output)    

        // append files from a directory, putting its contents at the root of archive
        archive.directory(dstFolderPath, false)

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        archive.finalize()
      })

      // copy zip to exports
      fs.copySync(tmpZipFilePath, exportFilePath)
    } catch (err) {
      // console.log('got an error :/')
      // console.error(err)
      throw err
    }
  } finally {
    // cleanup
    fs.emptyDirSync(tmpdir.name)
    tmpdir.removeCallback()
  }
}

module.exports = {
  exportAsZIP
}
