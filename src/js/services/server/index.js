import path from 'path'
import electron from 'electron'
import {useState, useCallback} from 'react'

import {serve} from './sockets'
import { updateServer } from '../../shared/reducers/shot-generator'

const electronApp = electron.app ? electron.app : require('@electron/remote').app

const ServerInfo = {
  projectPath: null,
  userDataPath: null,
  staticPath: null,

  store: null,
  service: null
}

export const SERVER_STATUS = {
  DISABLED: 0,
  CONNECTING: 1,
  ACTIVE: 2,
  ERROR: 3
}

export const initServer = ({ store, service, staticPath = window.__dirname }) => {
  ServerInfo.projectPath = path.dirname(store.getState().meta.storyboarderFilePath)
  ServerInfo.userDataPath = electronApp.getPath('userData')
  ServerInfo.staticPath = staticPath

  ServerInfo.store = store
  ServerInfo.service = service
}

export const useServerConnect = () => {
  const [serverStatus, setServerStatus] = useState(SERVER_STATUS.DISABLED)
  const onServerConnect = useCallback(() => {
    setServerStatus(SERVER_STATUS.CONNECTING)
    // Connect to the lobby server to get a remote id
    serve(ServerInfo.store, ServerInfo.service, ServerInfo.staticPath, ServerInfo.projectPath, ServerInfo.userDataPath)
    .then(({host, port, id}) => {
      if ([80, 443].indexOf(port) !== -1) {
        ServerInfo.store.dispatch(updateServer({ xrUri: `https://${host}/${id}` }))
      } else {
        ServerInfo.store.dispatch(updateServer({ xrUri: `https://${host}:${port}/${id}` }))
      }
      setServerStatus(SERVER_STATUS.ACTIVE)
    })
    .catch((err) => {
      console.log(err)
      setServerStatus(SERVER_STATUS.ERROR)
    })
  }, [])

  return [serverStatus, onServerConnect]
}
