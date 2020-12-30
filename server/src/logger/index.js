import path from 'path'
import fs from 'fs'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, label, printf } = format

const logFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

const logDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logDir)){
  fs.mkdirSync(logDir)
}

const logPath = path.join(logDir, `${+new Date()}.log`)

const out = new transports.File({ filename: logPath })
const outConsole = new transports.Console()

export const appLogger = createLogger({
  format: combine(
    label({ label: 'app' }),
    timestamp(),
    logFormat
  ),
  transports: [out, outConsole]
})
export const peerLogger = createLogger({
  format: combine(
    label({ label: 'peer' }),
    timestamp(),
    logFormat
  ),
  transports: [out, outConsole]
})
