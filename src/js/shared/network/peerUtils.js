import fs from 'fs'

export const loadImageToBlob = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, {encoding: 'buffer'}, (err, buffer) => {
            if (err) {
                reject(err)
            } else {
                resolve(Uint8Array.from(buffer).buffer)
            }
        })
    })
}

