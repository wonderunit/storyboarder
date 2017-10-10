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
        console.log('writing', tmpZipFilePath)
        let output = fs.createWriteStream(tmpZipFilePath)
        let archive = archiver('zip', {
          zlib: { level: 9 } // compression level
        })
        // listen for all archive data to be written
        output.on('close', function() {
          console.log(archive.pointer() + ' total bytes')
          console.log('archiver has been finalized and the output file descriptor has closed.')
          resolve()
        })
        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            // log warning
            console.log(err)
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



        // TODO actually append the files!
          // // append a file from stream
          // var file1 = __dirname + '/file1.txt';
          // archive.append(fs.createReadStream(file1), { name: 'file1.txt' });
          // 
          // // append a file from string
          // archive.append('string cheese!', { name: 'file2.txt' });
          // 
          // // append a file from buffer
          // var buffer3 = Buffer.from('buff it!');
          // archive.append(buffer3, { name: 'file3.txt' });
          // 
          // // append a file
          // archive.file('file1.txt', { name: 'file4.txt' });
          // 
          // // append files from a sub-directory and naming it `new-subdir` within the archive
          // archive.directory('subdir/', 'new-subdir');
          // 
          // // append files from a sub-directory, putting its contents at the root of archive
          // archive.directory('subdir/', false);
          // 
          // // append files from a glob pattern
          // archive.glob('subdir/*.txt');



        // finalize the archive (ie we are done appending files but streams have to finish yet)
        archive.finalize()
      })

      // copy zip to exports
      fs.copySync(tmpZipFilePath, exportFilePath)
    } catch (err) {
      console.log('got an error :/')
      console.error(err)
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
