import fs from 'fs'
import {promisify} from 'util'

const readFile = promisify(fs.readFile)

// Loads file content as ArrayBuffer for sending through peerjs
export const loadFileToBlob = async (path) => {
  try {
    const contents = await readFile(path)
    return Uint8Array.from(contents).buffer
  } catch (err) {
    console.error(err)
    throw err
  }
}
