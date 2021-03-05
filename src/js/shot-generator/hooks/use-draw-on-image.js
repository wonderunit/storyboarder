import React, {useEffect, useRef } from "react"
import { useThree } from "react-three-fiber";
import mouse from '../utils/mouseToClipSpace'
import { DrawingTextureContainer, TextureObjectType } from '../components/Three/Helpers/DrawingTextureContainer'

const useDrawOnImage = (drawMode) => {
    const {gl, scene, camera} = useThree()
    const isDrawStarted = useRef(false)
    const raycaster = useRef(new THREE.Raycaster())
    const drawingTextures = useRef(null)
    const getDrawingTextures = () => {
      if(drawingTextures.current === null) {
        drawingTextures.current = new DrawingTextureContainer()
      }
      return drawingTextures.current
    }

    useEffect(() => {
      if(drawMode.isEnabled) {
        gl.domElement.addEventListener( 'mousedown', onMouseDown )
        window.addEventListener( 'mouseup', onMouseUp )
      }
      return () => {
        gl.domElement.removeEventListener( 'mousedown', onMouseDown )
        window.removeEventListener( 'mouseup', onMouseUp )
      }
    }, [drawMode.isEnabled, drawMode.brush])

    useEffect(() => {
      if(!drawMode.cleanImages || !drawMode.cleanImages.length) return
      for(let i = 0; i < drawMode.cleanImages.length; i++) {
        getDrawingTextures().getTextures()[drawMode.cleanImages[i]].cleanImage()
      }
    }, [drawMode.cleanImages])

    useEffect(() => {
      let values = Object.values(getDrawingTextures().getTextures())
      for(let i = 0; i < values.length; i++) {
        values[i].texture.setMesh(drawMode.brush.type)
      }
    }, [drawMode.brush.type])

    const onMouseDown = (event) => {
      isDrawStarted.current = true
      let values = Object.values(getDrawingTextures().getTextures())
      for(let i = 0; i < values.length; i++) {
        values[i].texture.setMesh(drawMode.brush.type)
        values[i].texture.prepareToDraw()
      }
      draw(event)
      gl.domElement.addEventListener('mousemove', draw)
    }

    const draw = (event) => {
      let values = Object.values(getDrawingTextures().getTexturesByObjectType(TextureObjectType.Image))
      let {x, y} = mouse({x: event.clientX, y: event.clientY}, gl)
      raycaster.current.setFromCamera({x, y}, camera)
      let imageObjects = scene.children[0].children.filter(object => object.visible === true && object.userData.type !== "volume" && object.userData.type !== "character" && object.userData.type !== "controlTarget")
      let intersections = raycaster.current.intersectObjects(imageObjects, true)
      let backgroundTexture = getDrawingTextures().getTexturesByObjectType(TextureObjectType.Background)
      if(backgroundTexture.length) {
        let texture = backgroundTexture[0]
        if(!intersections.length) {
          texture.draw({x, y}, camera, drawMode.brush)  
        } else {
          texture.texture.endDraw()
          texture.texture.prepareToDraw()
        }
      }
      for(let i = 0; i < values.length; i++) {
        let drawingTexture = values[i].texture
        let object = drawingTexture.material.parent.parent

        // Hack to avoid drawing on image when there's object in front of them
        let onlyContinuousDrawing = true 
        if(intersections.length && intersections[0].object.parent === object) {
          onlyContinuousDrawing = false
        }
      
        if(!object || !object.visible ) continue
        values[i].draw({x, y}, object, camera, drawMode.brush, gl, imageObjects, onlyContinuousDrawing)
        if(onlyContinuousDrawing) {
          values[i].texture.endDraw()
          values[i].texture.prepareToDraw()
        }

      }
    } 

    const onMouseUp = (event) => {
      if(!isDrawStarted.current) return
      gl.domElement.removeEventListener('mousemove', draw)
      isDrawStarted.current = false;
      let values = Object.values(getDrawingTextures().getTextures())
      for(let i = 0; i < values.length; i++) {
        let texture = values[i].texture
        if(texture.isNeedSaving) {
          texture.endDraw()
          texture.isNeedSaving = false
          values[i].save()
        }
      }
    }
    return getDrawingTextures()
}

export default useDrawOnImage