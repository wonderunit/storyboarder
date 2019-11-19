const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect } = React

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

const Accessory =  React.memo(({ scene, id, updateObject, sceneObject, loaded, modelData, ...props }) => {
  //const setLoaded = loaded => updateObject(id, { loaded })
  const container = useRef()
  const characterObject = useRef()

  useEffect(() => {
      console.log('added', props)
      //let passedModel = { id: props.model, type: props.type }
     // let filePath = filepathFor(passedModel)
     // let object = attachments[filePath].value
   
      container.current = groupFactory()
      container.current.userData.id = id
      container.current.userData.type = props.type

      container.current.userData.type = 'accessory'
      container.current.userData.bindedId = props.attachToId
      characterObject.current = scene.children.filter(child => child.userData.id === sceneObject.id)[0]
      //container.current.orthoIcon = new IconSprites( props.type, "", container.current )
      //scene.add(container.current.orthoIcon)
  
      //console.log(type, id, 'added to scene')
      scene.add(container.current)
  
      return function cleanup () {
        console.log(type, id, 'removed from scene')
        scene.remove(container.current.orthoIcon)
        scene.remove(container.current)
      }
  }, [])    

  useEffect(() => {
    if (!loaded && modelData) {
      container.current.remove(...container.current.children)

      try {
        // add a clone of every single mesh we find
        modelData.scene.traverse( function ( child ) {
          if ( child instanceof THREE.Mesh ) {
            let newMesh = meshFactory(child)
            container.current.add(newMesh)
            newMesh.userData.type = 'accessory'
          }
        })
        } catch (err) {

      }
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      let skeleton = skinnedMesh.skeleton
      let bone = skeleton.getBoneByName(props.bindBone)
      container.current.scale.multiplyScalar(1 / skinnedMesh.worldScale().x)

      if(!skinnedMesh.parent.accessories) skinnedMesh.parent.accessories = []
      skinnedMesh.parent.accessories.push(container.current)
      bone.add(container.current)
      container.current.updateMatrixWorld(true, true)
    }
  }, [modelData, loaded])

  useEffect(() => {
    container.current.position.x = props.x
    container.current.position.z = props.z
    container.current.position.y = props.y
  }, [props.x, props.y, props.z])
    
  useEffect(() => {
      if(props.isAccessorySelected === undefined) return
      let outlineParameters = {}
      if(props.isAccessorySelected)
      {
        container.current.applyMatrix(container.current.parent.matrixWorld)
        scene.add(container.current)
        container.current.updateMatrixWorld(true)
        outlineParameters = {
          thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
      }
      else
      {
        snapToNearestBone()
        outlineParameters = {
          thickness: 0.008,
          color: [ 0, 0, 0 ],
        }
      }
      container.current.children[0].material.userData.outlineParameters = outlineParameters
  }, [props.isAccessorySelected])

  const snapToNearestBone = () => {
    let object = characterObject.current
    let skinnedMesh = object.getObjectByProperty("type", "SkinnedMesh")
    let skeleton = skinnedMesh.skeleton
    let bone = skeleton.getBoneByName(props.bindBone)
  
    let meshBox = new THREE.Box3().setFromObject(container.current)
    let preBoxSize = new THREE.Vector3()
    let currentBoxSize = new THREE.Vector3()
    let theBiggestBox = null
    let hitMeshes = object.bonesHelper.hit_meshes
    let hitBox = new THREE.Box3()
    for(let i = 0; i < hitMeshes.length; i++) {
      let hitMesh = hitMeshes[i]
      hitBox.setFromObject(hitMesh)
      if(hitBox.intersectsBox(meshBox)) {
        let intersectBox = hitBox.intersect(meshBox)
        if(!theBiggestBox) {
          theBiggestBox = intersectBox
          bone = hitMesh.originalBone
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
    container.current.applyMatrix(bone.getInverseMatrixWorld())
    bone.add(container.current)
    container.current.updateMatrixWorld(true)
  }

})

module.exports = Accessory
