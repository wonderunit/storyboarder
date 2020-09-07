import express from 'express'
import {ExpressPeerServer, PeerServer} from "peer"
import { customAlphabet } from 'nanoid'
import path from 'path'
import cors from 'cors'
import https from 'https'
import http from 'http'
import fs from 'fs'
import forge from 'node-forge'

import Cleanup from '../utils/cleanup'
import {appLogger, peerLogger} from '../logger'
import {appRouter} from "../routes"

import apps from './../../apps.json'

// no 1, i, 0, or 0 to avoid confusion
const nanoid = customAlphabet('234567890abcdefghjklmnpqrstuvwxyz', 5)

// via https://github.com/parcel-bundler/parcel/blob/8e80016d8b61c5d68759bfd1caa9fb827e46643c/packages/core/utils/src/generateCertificate.js
const generateCertificate = (host) => {
  let certDirectory = './'

  let privateKeyPath = path.join(certDirectory, 'key.pem')
  let certPath = path.join(certDirectory, 'cert.pem')

  const cachedKey = fs.existsSync(privateKeyPath) && fs.readFileSync(privateKeyPath)
  const cachedCert = fs.existsSync(certPath) && fs.readFileSync(certPath)

  if (cachedKey && cachedCert) {
    appLogger.info('Using existing key.pem and cert.pem from', certDirectory)
    return {
      key: cachedKey,
      cert: cachedCert
    }
  }

  appLogger.info('Generating SSL Certificate …')

  const pki = forge.pki
  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = Date.now().toString()
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)

  const attrs = [
    {
      name: 'commonName',
      value: 'wonderunit.com',
    },
    {
      name: 'countryName',
      value: 'US',
    },
    {
      shortName: 'ST',
      value: 'New York',
    },
    {
      name: 'localityName',
      value: 'New York',
    },
    {
      name: 'organizationName',
      value: 'wonderunit',
    },
    {
      shortName: 'OU',
      value: 'Test',
    },
  ]

  let altNames = [
    {
      type: 2, // DNS
      value: 'localhost',
    },
    {
      type: 7, // IP
      ip: '127.0.0.1',
    },
  ]

  if (host) {
    altNames.push({
      type: 2, // DNS
      value: host,
    })
  }

  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: 'subjectAltName',
      altNames,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ])

  cert.sign(keys.privateKey, forge.md.sha256.create())

  const privPem = pki.privateKeyToPem(keys.privateKey)
  const certPem = pki.certificateToPem(cert)

  fs.writeFileSync(privateKeyPath, privPem)
  fs.writeFileSync(certPath, certPem)

  return {
    key: privPem,
    cert: certPem
  }
}

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

  // const sert = { ...generateCertificate() }
  // const server = https.createServer({
  //   ...sert,
  //   rejectUnauthorized: false,
  //   requestCert: false,
    
  // }, app)
  const server = http.createServer(app)
  const peerServer = ExpressPeerServer(server, {
    //port: 80,
    path: '/',
    key: 'shot-generator',
    generateClientId: nanoid,
    allow_discovery: true,
    //ssl: sert
  })

  peerServer.on('connection', ({id, ...props}) => peerLogger.info(`Client with id ${id} has been connected`))
  peerServer.on('disconnect', ({id}) => peerLogger.info(`Client with id ${id} has been disconnected`))
  //peerServer.on('message', ({id}, msg) => peerLogger.info(`Client with id ${id} sent a message: ${JSON.stringify(msg)}`))

  

  app.use('/peerjs', peerServer)
  //app.use('/', appRouter)


  const XRPath = process.env.NODE_ENV === 'development' ? apps.development.XR : apps.production.XR
  app.use('/:id', express.static(
    path.join(XRPath)
  ))

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