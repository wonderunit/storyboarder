const THREE = require('three')


const allIcons = {
    character: new THREE.SpriteMaterial( { color: 0xffffff } ),
    camera: new THREE.SpriteMaterial( { color: 0x00ffff } ),
    light: new THREE.SpriteMaterial( { color: 0xff00ff } ),
    object: new THREE.SpriteMaterial( { color: 0xffff00 } )
}

const loadIconPromise = (file, material) => {
    return new Promise((resolve, reject) => {
        let img = new Image
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            let tex = new THREE.Texture(img)
            tex.needsUpdate = true

            material.map = tex
            material.needsUpdate = true
            resolve(material)          
        }
        img.onerror = () => {
            console.log(e)
        }
        img.src = file
    })
}

const loadIcons = () => {
    const character = loadIconPromise("data/shot-generator/icons/character-icon.svg", allIcons.character)
    const camera = loadIconPromise("data/shot-generator/icons/character-icon.svg", allIcons.camera)
    const light = loadIconPromise("data/shot-generator/icons/character-icon.svg", allIcons.light)
    const object = loadIconPromise("data/shot-generator/icons/character-icon.svg", allIcons.object)

    return Promise.all( [ character, camera, light, object ] ).then(( values ) => {
        
        return new Promise( resolve => {
            resolve(allIcons)
        })
    })
}

function init()
{
    loadIcons().then(() => {
        console.log('icons updated')
    })
    return allIcons
}

module.exports = {
    init
}