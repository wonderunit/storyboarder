const THREE = require('three')
const React = require('react')
const { Object3D } = THREE
const { Sprite } = THREE

const { useRef, useEffect, useState } = React

const createGeometry = require('three-bmfont-text')
const loadFont = require('load-bmfont')

const SDFShader = require("./shaders/sdf-shader")

const allIcons = {
    character: new THREE.SpriteMaterial( { color: 0xffffff } ),
    camera: new THREE.SpriteMaterial( { color: 0x00ffff } ),
    light: new THREE.SpriteMaterial( { color: 0xff00ff } ),
    object: new THREE.SpriteMaterial( { color: 0xffff00 } ),
    volume: new THREE.SpriteMaterial( { color: 0xffff00 } )
}

const allSprites = {
    character: new THREE.Sprite( allIcons.character ),
    camera: new THREE.Sprite( allIcons.camera ),
    light: new THREE.Sprite( allIcons.light ),
    object: new THREE.Sprite( allIcons.object ),
    volume: new THREE.Sprite( allIcons.volume )
}

function IconSprites ( type, text, parent, secondaryText ) {
    Object3D.call ( this )

    let scope = this
    let icon

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
        case 'object':
            icon = allSprites.object
            break
        case 'volume':
            icon = allSprites.volume
            break
    }
    
    if (text != '')
    {
        iconTextBetter(text).then((mesh) => {
            mesh.scale.set(0.006,0.006,0.006)
            mesh.rotation.z = Math.PI
            mesh.rotation.y = Math.PI
            mesh.rotation.x = -Math.PI/2
            mesh.position.z = secondaryText ? 0 : 0.15
            mesh.position.x = 0.7 
            scope.iconText = mesh
            scope.add(mesh)
        })
    }

    if (secondaryText) {
        iconTextBetter(secondaryText).then((mesh) => {
            mesh.scale.set(0.0055,0.0055,0.0055)
            mesh.rotation.z = Math.PI
            mesh.rotation.y = Math.PI
            mesh.rotation.x = -Math.PI/2
            mesh.position.x = 0.7
            mesh.position.z = 0.39
            scope.iconSecondText = mesh
            scope.add(mesh)
        })
    }
    
    
    this.linkedTo = parent
    this.icon = icon.clone()
    
    this.add(this.icon)
}

IconSprites.prototype = Object.create( Object3D.prototype )
IconSprites.prototype.constructor = IconSprites

IconSprites.prototype.changeFirstText = function ( text ) {
    if (this.iconText) this.iconText.textGeometry.update(text)
}

IconSprites.prototype.changeSecondText = function ( text ) {
    if (this.iconSecondText) this.iconSecondText.textGeometry.update(text)
}

Sprite.prototype.clone = function ( recursive ) {
    
    let result = new this.constructor().copy (this, recursive)
    result.material = this.material.clone()
    result.material.map = this.material.map
    if (this.clones) this.clones.push(result)
    else this.clones = [result]
    return result
}

const iconTextBetter = ( text ) => {
    return new Promise((resolve, reject) => {
        loadFont('src/fonts/wonder-unit-bmfont/wonderunit-b.fnt', (err, font) => {
            
            // create a geometry of packed bitmap glyphs, 
            // word wrapped to 300px and right-aligned
            var geometry = createGeometry({
                width: 1000,
                align: 'left',
                font: font,
                color: '#000',
                threshold:0.1
            })
            
            // change text and other options as desired
            // the options sepcified in constructor will
            // be used as defaults
            geometry.update(text)
  
            // the resulting layout has metrics and bounds
            // console.log(geometry.layout.height)
            // console.log(geometry.layout.descender)
    
            // the texture atlas containing our glyphs
            let textureLoader = new THREE.TextureLoader();
            textureLoader.load('fonts/wonder-unit-bmfont/wonderunit-b.png', function (texture) {
            // we can use a simple ThreeJS material
                texture.minFilter = THREE.LinearMipMapLinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.generateMipmaps = true
                //texture.anisotropy = 4//renderer.getMaxAnisotropy()
                
                var material = new THREE.ShaderMaterial({
                    uniforms: THREE.UniformsUtils.clone( SDFShader.uniforms ),
                    fragmentShader: SDFShader.fragmentShader,
                    vertexShader: SDFShader.vertexShader,
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthTest: false
                })
                
                material.uniforms.map.value = texture;
                material.uniforms.color.value = new THREE.Color( '#000000' );
                                
                // let material = new THREE.MeshBasicMaterial({
                //     map: texture,
                //     transparent: true,
                //     color: 0x000000
                // })
                material.needsUpdate = true

                //material.uniforms.smoothing = 0.32
                //material.uniforms.threshold = 0.4
                // now do something with our mesh!
                let mesh = new THREE.Mesh(geometry, material)
                mesh.textGeometry = geometry
                mesh.layers.disable(0)
                mesh.layers.disable(1)
                mesh.layers.enable(2)
                resolve(mesh)
            })
        })
    })
}

const iconText = ( text ) => {
    return new Promise((resolve, reject) => {
        document.fonts.load('600 52px wonderunitsans').then(result => {
            let textsCanvas = document.createElement('canvas')
            textsCanvas.width = 800
            textsCanvas.height = 80
            let textContext = textsCanvas.getContext('2d')
            textContext.font = '600 52px wonderunitsans'
            textContext.fillStyle = '#000000'
            textContext.clearRect(0,0,800,80)
            textContext.textAlign = "left"

            textContext.fillText(text, 10, 50)
            textContext.fillRect(0, 0, 1, 1)

            let textTexture = new THREE.CanvasTexture(textsCanvas)
            let textMaterial = new THREE.SpriteMaterial({
                color:"#550055",
                map:textTexture,
                useScreenCoordinates: false, 
                depthTest: false
            })
            textMaterial.needsUpdate = true
            textTexture.needsUpdate = true
            textMaterial.depthTest = false
                
            let textSprite = new THREE.Sprite(textMaterial)
            textSprite.layers.disable(0)
            textSprite.layers.disable(1)
            textSprite.layers.enable(2)
            
            resolve(textSprite)
        })
    }) 
}

const generateSprite = ( color, sprite ) => {
    return new Promise((resolve, reject) => {
        let blancCanvas = document.createElement('canvas')
        blancCanvas.width = 100
        blancCanvas.height = 100
        let blancContext = blancCanvas.getContext('2d')
        blancContext.clearRect(0,0,100,100)
        blancContext.fillRect(0, 0, 100, 100)

        spriteTexture = new THREE.CanvasTexture(blancContext)
        let spriteMaterial = new THREE.SpriteMaterial({
            color,
            useScreenCoordinates: false, 
            depthTest: false
        })
        
        spriteMaterial.needsUpdate = true
        spriteTexture.needsUpdate = true
        spriteMaterial.depthTest = false
        sprite.renderOrder = 10
        sprite.scale.set(1,1,1)
        sprite.material = spriteMaterial
        //sprite.material.needsUpdate = true
        sprite.layers.disable(0)
        sprite.layers.disable(1)
        sprite.layers.enable(2)
        
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
                computedWidthScale = 100 * wantedWidthScale / w            
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

        allSprites[o].material.renderOrder = 10
        allSprites[o].material.depthTest = false
    }
    loadIcons().then(() => {
        console.log('sprites updated')
    })
    return allSprites
}
init()

module.exports = IconSprites