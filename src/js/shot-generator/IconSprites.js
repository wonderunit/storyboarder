const THREE = require('three')

const allIcons = {
    character: new THREE.SpriteMaterial( { color: 0xffffff } ),
    camera: new THREE.SpriteMaterial( { color: 0x00ffff } ),
    light: new THREE.SpriteMaterial( { color: 0xff00ff } ),
    object: new THREE.SpriteMaterial( { color: 0xffff00 } )
}

const allSprites = {
    character: new THREE.Sprite( allIcons.character ),
    camera: new THREE.Sprite( allIcons.camera ),
    light: new THREE.Sprite( allIcons.light ),
    object: new THREE.Sprite( allIcons.object )
}

const loadIconPromise = (file, sprite, compensatescaling) => {
    return new Promise((resolve, reject) => {
        let img = new Image
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            console.log('img: ', img.width)
            let w = img.width,
                h = img.height,
                //svgBox = img.getBBox()
                ratio = w/h,
                wantedWidthScale = 2500 * compensatescaling,
                computedWidthScale = 100 * wantedWidthScale / w            
                computedHeightScale = computedWidthScale * ratio
            let tex = new THREE.Texture(img)
            tex.needsUpdate = true
            
            sprite.scale.set( computedHeightScale/100,computedWidthScale/100, 1)
            if (sprite.clones) for (let s of sprite.clones) {
                s.scale.copy(sprite.scale)
                s.material.map = tex
                s.material.needsUpdate = true
            }
            sprite.material.map = tex
            sprite.material.needsUpdate = true
            resolve(sprite)          
        }
        img.onerror = (e) => {
            console.log(e)
        }
        img.src = file
    })
}

const loadIcons = () => {
    const character = loadIconPromise("data/shot-generator/icons/character-icon.svg", allSprites.character, 0.2)
    const camera = loadIconPromise("data/shot-generator/icons/video-camera-02.svg", allSprites.camera, 0.07)
    const light = loadIconPromise("data/shot-generator/icons/light-icon.svg", allSprites.light, 0.08)
    const object = loadIconPromise("data/shot-generator/icons/video-camera-02.svg", allSprites.object, 1)

    return Promise.all( [ character, camera, light, object ] ).then(( values ) => {
        
        return new Promise( resolve => {
            resolve(allSprites)
        })
    })
}

function init()
{
    const keys = Object.keys(allSprites)
    for (let o in allSprites) {
        allSprites[o].layers.disable(0)
        allSprites[o].layers.disable(1)
        allSprites[o].layers.enable(2)
    }
    loadIcons().then(() => {
        console.log('sprites updated')
    })
    return allSprites
}

module.exports = {
    init
}