

import * as THREE from 'three'
import { Object3D, Sprite } from 'three'
import createGeometry from 'three-bmfont-text'

import allSprites from './IconContainer'
class IconSprites extends Object3D {
    constructor(type, mesh) {
        super()
        let icon 
        switch(type) {
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
            case 'image':
                icon = allSprites.image
                break
        }
        this.mesh = mesh.clone()
        this.textMeshes = []
        this.icon = icon.clone()
        this.add(this.icon)
    }
    
    addText(text, index, position = { x: 0.7, y: 0, z: 0 }, scale = 0.006, rotation = { x: -Math.PI/2, y: Math.PI, z: Math.PI }) {
        let mesh = this.mesh.clone()
        mesh.geometry = createGeometry(mesh.geometry._opt)
        mesh.scale.set(scale, scale, scale)
        mesh.rotation.set(rotation.x, rotation.y, rotation.z)
        mesh.position.set(position.x, position.y, position.z)
        mesh.userData.text = text
        mesh.geometry.update(text)
        this.textMeshes.push({ key:index, value:mesh })
        this.add(mesh)
    }

    changeText(indexOfText, text) {
        let textField = this.isTextExists(indexOfText).value
        if(!textField) return
        textField.geometry.update(text)
    }

    setSelected(value) {
        this.icon.material.color.set(value
            ? 0xff00ff
            : 0xffffff
          )
    }

    isTextExists(indexOfText) {
        return this.textMeshes.find(object => object.key === indexOfText )
    }
}

Sprite.prototype.clone = function ( recursive ) {
    
    let result = new this.constructor().copy (this, recursive)
    result.material = this.material.clone()
    result.material.map = this.material.map
    if (this.clones) this.clones.push(result)
    else this.clones = [result]
    return result
}

export default IconSprites
