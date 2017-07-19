const fs = require('fs')

process.on('message', (msg) => {
  fs.writeFile(msg.file, msg.data, msg.options, () => {
    
  })
});