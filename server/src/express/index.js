import express from 'express'
import {ExpressPeerServer, PeerServer} from "peer"
import { customAlphabet } from 'nanoid'
import path from 'path'
import cors from 'cors'
import https from 'https'
import http from 'http'
import fs from 'fs'

import Cleanup from '../utils/cleanup'
import {appLogger, peerLogger} from '../logger'
import {appRouter} from "../routes"

import apps from './../../apps.json'

// no 1, i, o, l, or 0 to avoid confusion
const nanoid = customAlphabet('234567890abcdefghjkmnpqrstuvwxyz', 5)

const PORT = process.env.PORT
export const App = async () => {
  const app = express()

  // app.use((req, res, next) => {
  //   appLogger.info('Request')
  //   appLogger.info(req)
  //   next()
  // })

  app.options('*', cors())
  app.use(cors())

  let server
  if (process.env.NODE_ENV === 'development') {
    try {
      let options = {
        key: fs.readFileSync('key.pem', 'utf8'),
        cert: fs.readFileSync('cert.pem', 'utf8')
      }
      server = https.createServer(options, app)
    } catch (err) {
      console.error('Could not find key.pem or cert.pem for development. See server/README.md')
      throw err
    }
  } else {
    server = http.createServer(app)
  }

  const peerServer = ExpressPeerServer(server, {
    //port: 80,
    path: '/',
    key: 'shot-generator',
    generateClientId: nanoid,
    allow_discovery: true
  })

  peerServer.on('connection', ({id, ...props}) => peerLogger.info(`Client with id ${id} has been connected`))
  peerServer.on('disconnect', ({id}) => peerLogger.info(`Client with id ${id} has been disconnected`))
  //peerServer.on('message', ({id}, msg) => peerLogger.info(`Client with id ${id} sent a message: ${JSON.stringify(msg)}`))

  

  app.use('/peerjs', peerServer)
  //app.use('/', appRouter)

  // redirect home page to wonderunit.com
  app.get('/', (req, res) => {
    res.redirect('https://wonderunit.com/storyboarder')
  })


  const XRPath = process.env.NODE_ENV === 'development' ? apps.development.XR : apps.production.XR
  const ARPath = process.env.NODE_ENV === 'development' ? apps.development.AR : apps.production.AR

  const XRStatic = express.static(path.join(XRPath))
  const ARStatic = express.static(path.join(ARPath))

  // specifically serve the font from root,
  // so it will be cached by the browser across sessions, e.g.:
  //   /fonts/thicccboi/THICCCBOI-Regular.woff2
  // although, due to XRStatic, this works, too:
  //   /1234/fonts/thicccboi/THICCCBOI-Regular.woff2
  app.use('/fonts', express.static(path.join(XRPath, 'fonts'), { index: false }))

  app.use('/:id', (...params) => {
    const req = params[0]
    const agent = req.headers['user-agent']

    // if (/Windows NT/.test(agent) === false) {
    //   ARStatic(...params)
    // } else {
      XRStatic(...params)
    // }
  })
  // app.use('/:id', express.static(
  //   path.join(XRPath)
  // ))

  //const server = app.listen(PORT)

  server.listen(PORT, () => {
      appLogger.info(`Server was started on the ${PORT} port.`)
  })
  
  Cleanup(() => {
    appLogger.info('Clearing...')

    appLogger.info('Stopping Express server')
    server.close()

    appLogger.info('Cleared, exiting app')
  })
}
