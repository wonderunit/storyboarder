
let _keyCommands = []
let _ipcKeyCommands = []
let instance = null
const _removedIpcCommands = []
class KeyCommandsSingleton {

    constructor() {
        if(!instance) {
            instance = this
            _keyCommands = []
            _ipcKeyCommands = []
        }
        return instance
    }

    static getInstance(boneMesh){
        return instance ? instance : new KeyCommandsSingleton(boneMesh)
    }


    get keyCommands() {
        return _keyCommands
    }

    get ipcKeyCommands() {
        return _ipcKeyCommands
    }

    get removedIpcCommands() {
        return _removedIpcCommands
    }

    addKeyCommand({key, value}) {
        _keyCommands.push({key, execute: value})
    }
    
    addIPCKeyCommand({key, value}) {
        _ipcKeyCommands.push({key,  execute: value})
    }

    removeKeyCommand({key}) {
        let object = _keyCommands.find(object => object.key === key)
        let indexOf = _keyCommands.indexOf(object)
        _keyCommands.splice(indexOf, 1)
       // markedToRemove.push({arrayType: "keyCommands", index:indexOf})
    }
    
    removeIPCKeyCommand({key}) {
        let object = _ipcKeyCommands.find(object => object.key === key)
        let indexOf = _ipcKeyCommands.indexOf(object)
        _removedIpcCommands.push(object)
        _ipcKeyCommands.splice(indexOf, 1)
       // markedToRemove.push({arrayType: "IPCKeyCommands", index:indexOf})
    }

    cleanUp() {
        for(let i = 0; i < markedToRemove.length; i ++) {
            if(markedToRemove[i].arrayType === "keyCommands") {
                _keyCommands.splice(markedToRemove[i].index, 1)
            } else {
                _ipcKeyCommands.splice(markedToRemove[i].index, 1)
            }
        }
    }

}
export default KeyCommandsSingleton
