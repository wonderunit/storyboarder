const THREE = require('three')
const React = require('react')
const { Object3D } = THREE
const { Sprite } = THREE

const { useRef, useEffect, useState } = React

const allIcons = {
    character: new THREE.SpriteMaterial( { color: 0xffffff, opacity: 1, outline: 0, map:null } ),
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

function IconSprites ( type, text, parent, secondaryText ) {
    Object3D.call ( this )

    let icon
    let spriteText

    switch (type) {
        case 'character':
            icon = allSprites.character
            break
        case 'camera':
            icon = allSprites.camera
            break
        case 'light':
            icon = allSprites.light
            break
    }
    
    spriteText = iconText(text, secondaryText)
    spriteText.scale.set(7, 0.7, 1)
    spriteText.position.x = 4.1
    spriteText.position.z = 0.1
    
    
    this.linkedTo = parent
    this.icon = icon.clone()
    this.iconText = spriteText
    this.add(this.iconText)
    this.add(this.icon)
    
}

IconSprites.prototype = Object.create( Object3D.prototype )
IconSprites.prototype.constructor = IconSprites

Sprite.prototype.clone = function ( recursive ) {
    
    let result = new this.constructor().copy (this, recursive)
    result.material = this.material.clone()
    result.material.map = this.material.map
    if (this.clones) this.clones.push(result)
    else this.clones = [result]
    return result
}


const iconText = ( text, secondText ) => {
    let textsCanvas = document.createElement('canvas')
    textsCanvas.width = 800
    textsCanvas.height = 80
    let textContext = textsCanvas.getContext('2d')
    textContext.font = '600 52px wonderunitsans'
    textContext.fillStyle = '#000000'
    textContext.clearRect(0,0,800,80)
    textContext.textAlign = "left"

    var metrics = textContext.measureText( text );
	var textWidth = metrics.width;
    textContext.fillText(text, 10, 50)
    textContext.fillRect(0, 0, 1, 1)

    let textTexture = new THREE.CanvasTexture(textsCanvas)
  
    let textMaterial = new THREE.SpriteMaterial({
        color:"#550055",
        map:textTexture,
        useScreenCoordinates: false, 
    })
    textMaterial.needsUpdate = true
    textTexture.needsUpdate = true
    textMaterial.depthTest = false
        
    let textSprite = new THREE.Sprite(textMaterial)
    textSprite.layers.disable(0)
    textSprite.layers.disable(1)
    textSprite.layers.enable(2)
    return textSprite
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
    const character = loadIconPromise("data/shot-generator/icons/character.svg", allSprites.character, 0.07)
    const camera = loadIconPromise("data/shot-generator/icons/camera.svg", allSprites.camera, 0.07)
    const light = loadIconPromise("data/shot-generator/icons/light.svg", allSprites.light, 0.07)
    const object = loadIconPromise("data/shot-generator/icons/video-camera-02.svg", allSprites.object, 1)

    return Promise.all( [ character, camera, light, object ] ).then(( values ) => {
        
        return new Promise( resolve => {
            resolve(allSprites)
        })
    })
}

function init()
{
    for (let o in allSprites) {
        allSprites[o].layers.disable(0)
        allSprites[o].layers.disable(1)
        allSprites[o].layers.enable(2)

        allSprites[o].material.depthTest = false
    }
    loadIcons().then(() => {
        console.log('sprites updated')
    })
    return allSprites
}
init()

module.exports = IconSprites