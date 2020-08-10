import path from 'path'
import {spawn} from 'child_process'
import {appLogger, dbLogger} from "../logger"
import fs from "fs"
import Mongo from 'mongodb'

const {MongoClient} = Mongo


const isRunning = (msg) => msg.indexOf('waiting for connections') !== -1

const DB_PATH = path.join(__dirname, 'db')

export const runDataBase = () => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)){
      fs.mkdirSync(DB_PATH)
    }

    const mongoProc = spawn(
      'mongod',
      [`--dbpath=${DB_PATH}`]
    )

    mongoProc.stdout.on('data', (data) => {
      dbLogger.info(data)
      if (isRunning(data)) {
        resolve(() => mongoProc.connected && mongoProc.kill())
      }
    });

    mongoProc.stderr.on('data', (data) => {
      dbLogger.error(data)
    });

    mongoProc.on('close', (code) => {
      if (code !== 0) {
        dbLogger.info(`Mongo process exited with code ${code}`)
      }
    });
  })
}

export const connectDataBase = () => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(process.env.DB_URL, {useUnifiedTopology: true}, (err, client) => {
      if (err !== null) {
        appLogger.error(err)
        reject(err)
        process.exit(1)
      }

      resolve({
        db: client.db(process.env.DB_NAME),
        client
      })
    });
  })
}