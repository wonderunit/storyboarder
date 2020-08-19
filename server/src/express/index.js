import express from 'express'
import {ExpressPeerServer} from "peer"
import shortId from 'shortid'
import path from 'path'
import cors from 'cors'

import Cleanup from '../utils/cleanup'
import {appLogger, peerLogger} from '../logger'
import {appRouter} from "../routes"

import apps from './../../apps.json'

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true)
  }
}

const PORT = process.env.PORT
export const App = async () => {
  const app = express()
  const server = app.listen(PORT)

  const peerServer = ExpressPeerServer(server, {
    path: '',
    key: 'shot-generator',
    generateClientId: shortId.generate
  });

  peerServer.on('connection', ({id, ...props}) => peerLogger.info(`Client with id ${id} has been connected`))
  peerServer.on('disconnect', ({id}) => peerLogger.info(`Client with id ${id} has been disconnected`))
  //peerServer.on('message', ({id}, msg) => peerLogger.info(`Client with id ${id} sent a message: ${JSON.stringify(msg)}`))

  app.use(cors(corsOptions))

  app.use((req, res, next) => {
    next()
  })

  app.use('/peerjs', peerServer)
  app.use('/', appRouter)


  const XRPath = process.env.NODE_ENV === 'development' ? apps.development.XR : apps.production.XR
  app.use('/xr', express.static(
    path.join(XRPath)
  ))
  app.get('/xr', function(req, res) {
    res.sendFile(path.join(__dirname, XRPath, 'index.html'))
  })

  appLogger.info(`Server was started on the ${PORT} port.`)
  
  Cleanup(() => {
    appLogger.info('Clearing...')

    appLogger.info('Stopping Express server')
    server.close()

    appLogger.info('Cleared, exiting app')
  })
}