import React, {useEffect, useRef, useCallback } from "react"
import { useThree } from "react-three-fiber";
import mouse from '../utils/mouseToClipSpace'
import { saveDataURLtoTempFile } from '../helpers/saveDataURLtoFile'
const useDrawOnImage = (isDrawingMode, drawingBrush, cleanImages, storyboarderFilePath, updateObject ) => {
    const {gl, scene, camera} = useThree()
    const isDrawStarted = useRef(false)
    const raycaster = useRef(new THREE.Raycaster())
    const drawingTextures = useRef({})
    const drawingSceneTexture = useRef({})
    useEffect(() => {
      if(isDrawingMode) {
        gl.domElement.addEventListener( 'mousedown', onKeyDown )
        window.addEventListener( 'mouseup', onKeyUp )
      }
      return () => {
        gl.domElement.removeEventListener( 'mousedown', onKeyDown )
        window.removeEventListener( 'mouseup', onKeyUp )
      }
    }, [isDrawingMode, drawingBrush])

    useEffect(() => {
      if(!cleanImages || !cleanImages.length) return
      for(let i = 0; i < cleanImages.length; i++) {
        drawingTexture.currents[cleanImages[i]].cleanImage()
      }
    }, [cleanImages])

    useEffect(() => {
      let keys = Object.keys(drawingTextures.current)
      for(let i = 0; i < keys.length; i++) {
        let key = keys[i]
        drawingTextures.current[key].setMesh(drawingBrush.type)
      }
      if(drawingSceneTexture.current && drawingSceneTexture.current.texture)
        drawingSceneTexture.current.texture.setMesh(drawingBrush.type)
    }, [drawingBrush.type])

    let getImageObjects = () => scene.__interaction.filter(object => object.userData.type === "image")

    const onKeyDown = (event) => {
      isDrawStarted.current = true;
      let keys = Object.keys(drawingTextures.current)
      for(let i = 0; i < keys.length; i++) {
        let key = keys[i]
        drawingTextures.current[key].prepareToDraw();
      }
      if(drawingSceneTexture.current && drawingSceneTexture.current.texture) {
        drawingSceneTexture.current.texture.prepareToDraw()
      }
      draw(event)
      gl.domElement.addEventListener('mousemove', draw)
    }

    const draw = (event) => {
      let keys = Object.keys(drawingTextures.current)
      let {x, y} = mouse({x: event.clientX, y: event.clientY}, gl)
      raycaster.current.setFromCamera({x, y}, camera)
      let imageObjects = getImageObjects()
      let intersections = raycaster.current.intersectObjects(imageObjects, true)
      if(!intersections.length && drawingSceneTexture.current.draw) {
        let texture = drawingSceneTexture.current
        texture.draw({x, y}, camera, drawingBrush)
      }
      for(let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let drawingTexture = drawingTextures.current[key];
        let object = drawingTexture.material.parent.parent;
        if(!object || !object.visible) continue
        drawingTexture.draw({x, y}, object, camera, drawingBrush, gl)
      }
    } 

    const onKeyUp = (event) => {
      if(!isDrawStarted.current) return
      gl.domElement.removeEventListener('mousemove', draw)
      isDrawStarted.current = false;
      let keys = Object.keys(drawingTextures.current)
      for(let i = 0; i < keys.length; i++) {
        let key = keys[i]
        drawingTextures.current[key].endDraw();
        let object = scene.__interaction.find((obj) => obj.userData.id === key)
        if(drawingTextures.current[key].isChanged) {
          drawingTextures.current[key].isChanged = false
          saveDataURLtoTempFile(drawingTextures.current[key].getImage("image/png"), storyboarderFilePath, updateObject, object)
        }
      }
      if( drawingSceneTexture.current.save && drawingSceneTexture.current.texture.isChanged) {
        drawingSceneTexture.current.texture.isChanged = false
        drawingSceneTexture.current.texture.endDraw()
        drawingSceneTexture.current.save()
      }
    }
    return {drawingTextures: drawingTextures.current, drawingSceneTexture: drawingSceneTexture.current}
}

export default useDrawOnImage