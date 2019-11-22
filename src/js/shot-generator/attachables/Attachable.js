const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React
const ObjectRotationControl = require("../../shared/IK/objects/ObjectRotationControl")

// return a group which can report intersections
const groupFactory = () => {
    let group = new THREE.Group()
    group.raycast = function ( raycaster, intersects ) {
      let results = raycaster.intersectObjects(this.children)
      if (results.length) {
        // distance – distance between the origin of the ray and the intersection
        // point – point of intersection, in world coordinates
        // face – intersected face
        // faceIndex – index of the intersected face
        // object – the intersected object
        // uv - U,V coordinates at point of intersection
        intersects.push({ object: this })
      }
    }
    return group
}

const materialFactory = () => new THREE.MeshToonMaterial({
    color: 0xcccccc,
    emissive: 0x0,
    specular: 0x0,
    shininess: 0,
    flatShading: false
})
  
const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()

  // create a skeleton if one is not provided
  if (mesh instanceof THREE.SkinnedMesh && !mesh.skeleton) {
    mesh.skeleton = new THREE.Skeleton()
  }

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const Attachable = React.memo(({ scene, id, updateObject, sceneObject, loaded, modelData, camera, largeRenderer, isSelected, ...props }) => {
  const container = useRef()
  const characterObject = useRef()
  const objectRotationControl = useRef();
  const [ready, setReady] = useState(false) // ready to load?
  const setLoaded = loaded => updateObject(id, { loaded })
  const domElement = useRef()
  const isBoneSelected = useRef()
  const isDragged = useRef()
  useEffect(() => {
      container.current = groupFactory()
      container.current.userData.id = id
      container.current.userData.type = props.type

      container.current.userData.type = 'attachable'
      container.current.userData.bindedId = props.attachToId
      container.current.userData.isRotationEnabled = false
      isBoneSelected.current = false
      isDragged.current = false 
      scene.add(container.current)
      return function cleanup () {
        container.current.parent.remove(container.current)
        let indexOf = characterObject.current.attachables.indexOf(container.curren)
        characterObject.current.attachables.splice(indexOf, 1)
      }
  }, [])    

  useEffect(() => {
    setReady(false)
    setLoaded(false)

    // return function cleanup () { }
  }, [props.model])

  useEffect(() => {
    if (ready) {
      container.current.remove(...container.current.children)

      try {
        // add a clone of every single mesh we find
        modelData.scene.traverse( function ( child ) {
          if ( child instanceof THREE.Mesh ) {
            let newMesh = meshFactory(child)
            container.current.add(newMesh)
            newMesh.userData.type = 'attachable'
            newMesh.layers.disable(0)
            newMesh.layers.enable(1)
            newMesh.layers.disable(2)
          }
        })
        } catch (err) {

      }
      characterObject.current = scene.children.filter(child => child.userData.id === props.attachToId)[0]
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      let skeleton = skinnedMesh.skeleton
      let bone = skeleton.getBoneByName(props.bindBone)
      domElement.current = largeRenderer.current.domElement
      container.current.setDragging = dragging
      container.current.userData.bindBone = props.bindBone
      objectRotationControl.current = new ObjectRotationControl(scene, camera, domElement.current, characterObject.current.uuid)
      objectRotationControl.current.setUpdateCharacter((name, rotation) => {updateObject(container.current.userData.id, {
        rotation:
        {
          x : rotation.x,
          y : rotation.y,
          z : rotation.z,
        }
      } )})
      if(!skinnedMesh.parent.attachables) skinnedMesh.parent.attachables = []
      skinnedMesh.parent.attachables.push(container.current)
      container.current.scale.multiplyScalar(props.size / characterObject.current.scale.x)
      bone.add(container.current)
      container.current.updateMatrixWorld(true, true)
    }
  }, [ready])

  useEffect(() => {
    if (!ready) return
    if(container.current.parent.uuid === scene.uuid) {
      container.current.position.x = props.x
      container.current.position.y = props.y
      container.current.position.z = props.z
    } else {
      let parentMatrixWorld = container.current.parent.matrixWorld
      let parentInverseMatrixWorld = container.current.parent.getInverseMatrixWorld()
      container.current.applyMatrix(parentMatrixWorld)
      container.current.position.set(props.x, props.y, props.z)
      container.current.updateMatrixWorld(true)
      container.current.applyMatrix(parentInverseMatrixWorld)
      container.current.updateMatrixWorld(true)
    }

  }, [props.x, props.y, props.z, ready])

  useEffect(() => {
    if (!ready) return
    if(!props.rotation) return
    if(props.isDragging) return
    container.current.rotation.x = props.rotation.x
    container.current.rotation.y = props.rotation.y
    container.current.rotation.z = props.rotation.z
  }, [props.rotation, ready, props.isDragging])
    
  useEffect(() => {
    if(!ready) return
      let outlineParameters = {}
      if(isSelected) {
       window.addEventListener("keydown", keyDownEvent, false)
        if(!isBoneSelected.current) {
          if(objectRotationControl.current.isEnabled) { 
            objectRotationControl.current.selectObject(container.current, props.id)
            isBoneSelected.current = true
          } else {
            objectRotationControl.current.object = container.current
          }
          
        }
        container.current.updateMatrixWorld(true)
        outlineParameters = {
          thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
      }
      else {
        if(isBoneSelected.current) {
          objectRotationControl.current.deselectObject()
            isBoneSelected.current = false
        }
        container.current.updateMatrixWorld(true)
        outlineParameters = {
          thickness: 0.008,
          color: [ 0, 0, 0 ]
        }
      }
      container.current.children[0].material.userData.outlineParameters = outlineParameters
      return function cleanup () {
        window.removeEventListener("keydown", keyDownEvent, false)
      }
  }, [isSelected, ready])

  useEffect(() => {
    if (ready ) {
      setLoaded(true)
    }
  }, [ready])

  useEffect(() => {
    let character = scene.children.filter(child => child.userData.id === props.attachToId)[0]
    if(character && modelData){
      setReady(true)
    }
  }, [modelData, ready, scene.children.length])

  useEffect(() => {
    if(!ready) return
    objectRotationControl.current.setCamera(camera)
  }, [ready, camera])

  useEffect(() => {
    if(!ready) return
    container.current.userData.bindBone = props.bindBone
  }, [props.bindBone])

  useEffect(() => {
    if(!ready) return
    let scale = container.current.parent.uuid === scene.uuid ? props.size : props.size / characterObject.current.scale.x
    container.current.scale.set( scale, scale, scale )
  }, [props.size])

  const dragging = (isDragging) => {
    let object = characterObject.current
    let skinnedMesh = object.getObjectByProperty("type", "SkinnedMesh")
    let skeleton = skinnedMesh.skeleton
    let bone = skeleton.getBoneByName(props.bindBone)
    if(isDragging) {
      if(isDragged.current) return 
      let parentMatrixWorld = bone.matrixWorld
      scene.add(container.current)
      container.current.applyMatrix(parentMatrixWorld)
      container.current.updateMatrixWorld(true)
      updateObject(container.current.userData.id, { x: container.current.position.x, y: container.current.position.y, z: container.current.position.z })
      isDragged.current = true
    }
    else {  
      if(!isDragged.current) return 
      container.current.applyMatrix(bone.getInverseMatrixWorld())
      bone.add(container.current)
      container.current.updateMatrixWorld(true)
      isDragged.current = false
    }
  }

  const keyDownEvent = (event) => {switchManipulationState(event)}

  const switchManipulationState = (event) => {
    if(event.ctrlKey )
    {
        if(event.key === 'r')
        {
            event.stopPropagation()
            let isRotation = !container.current.userData.isRotationEnabled
            container.current.userData.isRotationEnabled = isRotation
            if(isRotation) {
              objectRotationControl.current.enable()
            } else {
              objectRotationControl.current.disable()
            }
        }
    } 
  }

/*   const snapToNearestBone = () => {
    let object = characterObject.current
    let bone = null 
  
    let meshBox = new THREE.Box3().setFromObject(container.current)
    let preBoxSize = new THREE.Vector3()
    let currentBoxSize = new THREE.Vector3()
    let theBiggestBox = null
    let hitMeshes = object.bonesHelper.hit_meshes
    let hitBox = new THREE.Box3()
    console.log(object.bonesHelper)
    
    let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
    for(let i = 0; i < hitMeshes.length; i++) {
      let hitMesh = hitMeshes[i]
     // hitMesh.applyMatrix( hitMeshes[i].matrixWorld)
     let boneMatrix = new THREE.Matrix4()
      takeBoneInTheMeshSpace(skinnedMesh, hitMesh.originalBone, boneMatrix)
      hitMesh = hitMesh.clone()
      //hitMesh.position.copy( hitMeshes[i].originalBone.position)
      //hitMesh.quaternion.copy( hitMeshes[i].originalBone.quaternion)
      //hitMesh.scale.copy( hitMeshes[i].originalBone.scale)
      //hitMesh.updateMatrixWorld(true)
      //hitMesh.applyMatrix( hitMeshes[i].parent.matrixWorld)
      hitBox.setFromObject(hitMesh)
      
      console.log(hitMesh.clone())
      let boxHelper = new THREE.Box3Helper(hitBox, 0xffff00)
      scene.add(boxHelper)
      if(hitBox.intersectsBox(meshBox)) {
        console.log("Intersected")
        let intersectBox = hitBox.intersect(meshBox)
        if(!theBiggestBox) {
          theBiggestBox = intersectBox
          bone = hitMeshes[i].originalBone
        }
        else  {
          theBiggestBox.getSize(preBoxSize)
          intersectBox.getSize(currentBoxSize)
           if(preBoxSize.x * preBoxSize.y < currentBoxSize.x * currentBoxSize.y) {
            theBiggestBox = intersectBox
            bone = hitMesh.originalBone
           }
        }
      }
    }
    console.log(bone)
    if(!bone) {
      let skinnedMesh = object.getObjectByProperty("type", "SkinnedMesh")
      let skeleton = skinnedMesh.skeleton
      bone = skeleton.getBoneByName(props.bindBone)
      container.current.position.copy(prevPosition.current)
      //return 
    }
    container.current.applyMatrix(bone.getInverseMatrixWorld())
    bone.add(container.current)
    container.current.updateMatrixWorld(true)
    updateObject(container.current.userData.id, { bindBone: bone.name})
  }

  const takeBoneInTheMeshSpace = (mesh, bone, boneMatrix) => {
      let armatureInverseMatrixWorld = new THREE.Matrix4()//this.resourceManager.getMatrix4();
      armatureInverseMatrixWorld.copy(mesh.skeleton.bones[0].parent.matrixWorld);
      boneMatrix.multiplyMatrices(armatureInverseMatrixWorld, bone.matrixWorld);
     // this.resourceManager.release(armatureInverseMatrixWorld);
  } */

})

module.exports = Attachable
