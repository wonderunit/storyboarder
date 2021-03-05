
import SimpleTexture from './SimpleTexture' 
import CubeMapDrawingTexture from './cubeMapDrawingTexture' 
import DrawingTextureType from '../../InspectedWorld/DrawingTextureType'
const TextureObjectType = {
    Image: "image",
    Background: "background"
}
// Container which stores all texture and gives an ability to define/override their drawing and saving methods
class DrawingTextureContainer {
    constructor() {
        this.textures = {}
    }
    // Creates new texture based on type, basically a factory method which serves to extract the creation logic from components
    createTexture(id, drawingTextureType, textureObjectType, save = null, draw = null) {
        let texture
        if(drawingTextureType === DrawingTextureType.Simple) {
            texture = new SimpleTexture()
        } else {
            texture = new CubeMapDrawingTexture()
        }

        if(!draw) draw = (...arg) => texture.draw(...arg)
        if(!save) save = () => {}

        this.textures[id] = { type: textureObjectType, draw: draw, save: save, texture: texture }
        return texture
    }

    getTextures() {
        return this.textures
    }

    getTexturesByObjectType(type) {
        return Object.values(this.textures).filter(obj => obj.type === type)
    }

    getTextureById(id) {
        return this.textures[id]
    }

    removeTexture(id) {
        delete this.textures[id]
    }

}

export { 
    DrawingTextureContainer,
    TextureObjectType
}