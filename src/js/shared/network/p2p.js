import Peer from 'peerjs'
import Packer from 'peerjs-js-binarypack'

const EventEmitter = require('events')

const Client = (connection) => {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(1000)

    // Receiving data from the client
    connection.on('data', (msg) => {
        if (msg instanceof Blob) {
            msg.arrayBuffer().then(buf => {
                const {action, payload} = Packer.unpack(buf)
                console.log({action, payload})
                emitter.emit(action, payload)
            })
        } else {
            console.log(msg)
            const {action, payload} = msg//JSON.parse(data)
            emitter.emit(action, payload)
        }
    })

    const emit = (action, payload = null) => {
        //const pack = JSON.stringify({action, payload})
        //console.log(pack)
        
        //console.log(connection)
        //const data = new Blob([JSON.stringify({action, payload})], {type : 'application/json'})
        connection.send({action, payload})
    }

    return {
        emitter,
        connection,
        emit,
        id: connection.peer
    }
}

const P2P = (host = 'stbr.link') => {
    const isLocal = '127.0.0.1'
    const peer = new Peer(null, {
        host,
        port: 443,//isLocal ? 80 : undefined,
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
        // console.log('Connected: ', connection.peer)
        const client = Client(connection)

        clients.push(client)
        clientsMap.set(connection.peer, client)

        //emitter.emit('connection', client)

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

            // const client = new Client(connection)
            // clients.push(client)
            // clientsMap.set(connection.peer, client)

            emitter.emit('connection', client)
        })
    })

    let client
    const broadcast = (action, payload) => {
        for (client of clients) {
            client.emit(action, payload)
        }
    }

    const P2PClientConnection = (roomId) => {
        return new Promise((resolve, reject) => {
            emitter.on('open', () => {
                client = peer.connect(roomId, {reliable: true, serialization: 'binary-utf8'})
                client.on('open', () => {
                    resolve(Client(client))
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