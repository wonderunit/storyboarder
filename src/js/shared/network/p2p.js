import Peer from 'peerjs'
import Packer from 'peerjs-js-binarypack'
import { STBR_HOST } from './config'

const EventEmitter = require('events')

// client instance
const Client = (connection) => {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(1000)

    // Receiving data from the client
    connection.on('data', (msg) => {
        /**
         * @TODO peerjs bug! Message always must not be a Blob, if Blob than parse using peerjs internal lib 
         */
        if (msg instanceof Blob) {
            msg.arrayBuffer().then(buf => {
                const {action, payload} = Packer.unpack(buf)
                emitter.emit(action, payload)
            })
        } else {
            const {action, payload} = msg
            emitter.emit(action, payload)
        }
    })

    const emit = (action, payload = null) => {
        connection.send({action, payload})
    }

    return {
        emitter,
        connection,
        emit,
        id: connection.peer
    }
}

const P2P = (host = STBR_HOST) => {
    // Connect to the lobby server
    const peer = new Peer(null, {
        host,
        port: 443,
        key: 'shot-generator',
        path: '/peerjs',
        secure: true,
        debug: 0
    })

    const emitter = new EventEmitter()
    emitter.setMaxListeners(1000)

    const clients = []
    const clientsMap = new Map()
    
    // Connection ready to use
    peer.on('open', (id) => {
        emitter.emit('open', id)
    })

    // Connection error
    peer.on('error', (err) => {
        emitter.emit('error', err)
    })

    // Disconnected from the server
    peer.on('disconnected', () => {
        emitter.emit('disconnected')
        clients.splice(0, clients.length)
        peer.reconnect()
    })

    // Client connected
    peer.on('connection', (connection) => {
        const client = Client(connection)

        clients.push(client)
        clientsMap.set(connection.peer, client)

        // Client disconnected
        connection.on('close', (msg) => {
            const client = clientsMap.get(connection.peer)
            client.emit('close', msg)

            clients.splice(clients.indexOf(client), 1)
            clientsMap.delete(connection.peer)
        })
    
        // Client connection ready to use
        connection.on('open', () => {
            const client = clientsMap.get(connection.peer)
            emitter.emit('connection', client)
        })
    })

    let client
    // Send an action the all the clients
    const broadcast = (action, payload) => {
        for (client of clients) {
            client.emit(action, payload)
        }
    }

    // Connect to the client
    const P2PClientConnection = (roomId) => {
        return new Promise((resolve, reject) => {
            // Wait until connects to the lobby server
            emitter.on('open', () => {
                // Connect
                client = peer.connect(roomId, {reliable: true, serialization: 'binary'})

                // Wait until connects to the client
                client.on('open', () => {
                    // @TODO wait 1s until connection is estabilished
                    setTimeout(() => resolve(Client(client)), 1000)
                })
            })
        })
    }

    return {
        io: emitter,
        peer,
        broadcast,
        P2PClientConnection
    }
}

export default P2P