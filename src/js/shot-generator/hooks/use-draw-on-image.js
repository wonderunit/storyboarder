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
        gl.domElement.addEventListener( 'mousedown', onKeyDown )
        window.addEventListener( 'mouseup', onKeyUp )
      }
      return () => {
        gl.domElement.removeEventListener( 'mousedown', onKeyDown )
        window.removeEventListener( 'mouseup', onKeyUp )
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

    const onKeyDown = (event) => {
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
      let imageObjects = scene.__interaction.filter(object => object.userData.type === "image")
      let intersections = raycaster.current.intersectObjects(imageObjects, true)
      let backgroundTexture = getDrawingTextures().getTexturesByObjectType(TextureObjectType.Background)
      if(!intersections.length && backgroundTexture.length) {
        let texture = backgroundTexture[0]
        texture.draw({x, y}, camera, drawMode.brush)
      }
      for(let i = 0; i < values.length; i++) {
        let drawingTexture = values[i].texture
        let object = drawingTexture.material.parent.parent
        if(!object || !object.visible) continue
        values[i].draw({x, y}, object, camera, drawMode.brush, gl)
      }
    } 

    const onKeyUp = (event) => {
      if(!isDrawStarted.current) return
      gl.domElement.removeEventListener('mousemove', draw)
      isDrawStarted.current = false;
      let values = Object.values(getDrawingTextures().getTextures())
      for(let i = 0; i < values.length; i++) {
        let texture = values[i].texture
        texture.endDraw()
        if(texture.isChanged) {
          texture.isChanged = false
          values[i].save()
        }
      }
    }
    return getDrawingTextures()
}

export default useDrawOnImage