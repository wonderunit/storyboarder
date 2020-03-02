
let instance = null
let _keyCommands = []
let _ipcKeyCommands = []
const _removedIpcCommands = []
let ipcRemoved = false
let keyRemoved = false
let _updateComponent = null
let _isKeysEnabled = true
class KeyCommandsSingleton {

    constructor() {
        if(!instance) {
            instance = this
            _keyCommands = []
            _ipcKeyCommands = []
        }
        return instance
    }

    static getInstance(){
        return instance ? instance : new KeyCommandsSingleton()
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

    get isIpcRemoved () {
        return ipcRemoved
    }

    set isIpcRemoved (value) {
        ipcRemoved = value
    }

    get isKeyRemoved () {
        return keyRemoved
    }

    set isKeyRemoved (value) {
        keyRemoved = value
    }

    set updateComponent (value) {
        _updateComponent = value
    }

    set isEnabledKeysEvents( value ) {
        _isKeysEnabled = value
    }

    get isEnabledKeysEvents() {
        return _isKeysEnabled
    }

    addKeyCommand({key, keyCustomCheck, value}) {
        this.removeKeyCommand(key)
        _keyCommands.push({key, keyCustomCheck, execute: value})
        _updateComponent && _updateComponent({})
    }
    
    addIPCKeyCommand({key, keyCustomCheck, value}) {
        let object = _ipcKeyCommands.find(object => object.key === key)
        if(object) {
            let indexOf = _ipcKeyCommands.indexOf(object)
            _ipcKeyCommands.splice(indexOf, 1)
        } 
        _ipcKeyCommands.push({key, keyCustomCheck, execute: value})
        _updateComponent && _updateComponent({})
    }

    removeKeyCommand({key}) {
        let object = _keyCommands.find(object => object.key === key)
        if(!object) return
        let indexOf = _keyCommands.indexOf(object)
        _keyCommands.splice(indexOf, 1)
        keyRemoved = true
        _updateComponent && _updateComponent({})
    }
    
    removeIPCKeyCommand({key}) {
        let object = _ipcKeyCommands.find(object => object.key === key)
        if(!object) return
        let indexOf = _ipcKeyCommands.indexOf(object)
        _ipcKeyCommands.splice(indexOf, 1)
        _removedIpcCommands.push(object)
        ipcRemoved = true
        _updateComponent && _updateComponent({})
    }
}
export default KeyCommandsSingleton
