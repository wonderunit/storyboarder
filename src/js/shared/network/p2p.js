import Peer from 'peerjs'
const EventEmitter = require('events')


const emitFn = function (event, payload) {
    this.send({event, payload})
}

const Client = (connection) => {
    const emitter = new EventEmitter()

    // Receiving data from the client
    connection.on('data', ({action, payload}) => {
        emitter.emit(action, payload)
    })

    const emit = (action, payload) => {
        connection.send({action, payload})
    }

    return {
        emitter,
        connection,
        emit,
        id: connection.peer
    }
}

const P2P = () => {
    const peer = new Peer(null, {
        host: '127.0.0.1',
        port: 3000,
        key: 'shot-generator',
        path: '/peerjs',
        secure: false,
        debug: 3
    })

    const emitter = new EventEmitter()
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

        // emitter.emit('connection', client)

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
                client = peer.connect(roomId, {reliable: true})

                resolve(Client(client))
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