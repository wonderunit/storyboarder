import * as THREE from 'three'

const allIcons = {
    character: new THREE.SpriteMaterial( { color: 0xffffff } ),
    camera: new THREE.SpriteMaterial( { color: 0xffffff } ),
    light: new THREE.SpriteMaterial( { color: 0xffffff } ),
    object: new THREE.SpriteMaterial( { color: 0xffffff } ),
    volume: new THREE.SpriteMaterial( { color: 0xffffff } ),
    image: new THREE.SpriteMaterial( { color: 0xffffff } )
}

const allSprites = {
    character: new THREE.Sprite( allIcons.character ),
    camera: new THREE.Sprite( allIcons.camera ),
    light: new THREE.Sprite( allIcons.light ),
    object: new THREE.Sprite( allIcons.object ),
    volume: new THREE.Sprite( allIcons.volume ),
    image: new THREE.Sprite( allIcons.image )
}

const generateSprite = ( color, sprite ) => {
    return new Promise((resolve, reject) => {
        let blancCanvas = document.createElement('canvas')
        blancCanvas.width = 100
        blancCanvas.height = 100
        let blancContext = blancCanvas.getContext('2d')
        blancContext.clearRect(0,0,100,100)
        blancContext.fillRect(0, 0, 100, 100)

        let spriteTexture = new THREE.CanvasTexture(blancContext)
        let spriteMaterial = new THREE.SpriteMaterial({
            color,
            depthTest: false
        })
        
        spriteMaterial.needsUpdate = true
        spriteTexture.needsUpdate = true
        spriteMaterial.depthTest = false
        sprite.renderOrder = 10
        sprite.scale.set(1,1,1)
        sprite.material = spriteMaterial
        
        resolve(sprite)
    })
}

const loadIconPromise = (file, sprite, compensatescaling) => {
    return new Promise((resolve, reject) => {
        let img = new Image
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            let w = img.width,
                h = img.height,
                //svgBox = img.getBBox()
                ratio = w/h,
                wantedWidthScale = 2500 * compensatescaling,
                computedWidthScale = 100 * wantedWidthScale / w,
                computedHeightScale = computedWidthScale * ratio
            let tex = new THREE.Texture(img)
            tex.needsUpdate = true
            
            sprite.scale.set( computedHeightScale/100,computedWidthScale/100, 1)
            if (sprite.clones) for (let s of sprite.clones) {
                s.scale.copy(sprite.scale)
                s.material.map = tex
                s.material.needsUpdate = true
                s.material.depthTest = false
                s.material.renderOrder = 4
            }
            sprite.material.map = tex
            sprite.material.needsUpdate = true
            sprite.material.depthTest = false
            sprite.material.renderOrder = 4
            resolve(sprite)
        }
        img.onerror = (e) => {
            reject(e)
        }
        img.src = file
    })
}

const loadIcons = () => {
    const character = loadIconPromise("data/shot-generator/icons/character.svg", allSprites.character, 0.07)
    const camera = loadIconPromise("data/shot-generator/icons/camera.svg", allSprites.camera, 0.07)
    const light = loadIconPromise("data/shot-generator/icons/light.svg", allSprites.light, 0.07)
    const object = generateSprite("#000000", allSprites.object)
    const volume = loadIconPromise("data/shot-generator/icons/volume.svg", allSprites.volume, 0.07)
    const image = loadIconPromise('data/shot-generator/icons/image.svg', allSprites.image, 0.07)

    return Promise.all( [ character, camera, light, object, image ] ).then(( values ) => {
        
        return new Promise( resolve => {
            resolve(allSprites)
        })
    })
}

function init()
{
    for (let o in allSprites) {

        allSprites[o].material.renderOrder = 10
        allSprites[o].material.depthTest = false
    }
    loadIcons()
    return allSprites
}
init()

export default allSprites
