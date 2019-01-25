const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const BoundingBoxHelper = require('./BoundingBoxHelper')
const BonesHelper = require('./BonesHelper')

const debounce = require('lodash.debounce')

const ModelLoader = require('../services/model-loader')

// character needs:
//   mesh - SkinnedMesh
//   bone structure - ideally Mixamo standard bones
//

const Character = React.memo(({ scene, id, type, remoteInput, isSelected, selectedBone, camera, updateCharacterSkeleton, updateObject, ...props }) => {
  const [loaded, setLoaded] = useState(false)

  let object = useRef(null)

  let isRotating = useRef(false)
  let startingDeviceRotation = useRef(null)
  let startingObjectRotation = useRef(null)
  let startingGlobalRotation = useRef(null)

  let currentBoneSelected = useRef(null)

  const cloneAnimated = ( source ) => {

    var cloneLookup = new Map()
    var clone = source.clone()

    parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {
      cloneLookup.set( sourceNode, clonedNode )
    } )

    source.traverse( function ( sourceMesh ) {
      if ( ! sourceMesh.isSkinnedMesh ) return
      var sourceBones = sourceMesh.skeleton.bones
      var clonedMesh = cloneLookup.get( sourceMesh )
      clonedMesh.skeleton = sourceMesh.skeleton.clone()
      clonedMesh.skeleton.bones = sourceBones.map( function ( sourceBone ) {
        if ( ! cloneLookup.has( sourceBone ) ) {
          throw new Error( 'THREE.AnimationUtils: Required bones are not descendants of the given object.' )
        }
        return cloneLookup.get( sourceBone )
      } )
      clonedMesh.bind( clonedMesh.skeleton, sourceMesh.bindMatrix )
    } )

    return clone
  }

  const parallelTraverse = ( a, b, callback ) => {
    callback( a, b )
    for ( var i = 0; i < a.children.length; i ++ ) {
      parallelTraverse( a.children[ i ], b.children[ i ], callback )
    }
  }

  const updateSkeleton = () => {
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    skel.skeleton.pose()

    if (props.skeleton) {
      for (let name in props.skeleton) {
        let bone = skel.skeleton.getBoneByName(name)
        if (bone) {
          bone.rotation.x = props.skeleton[name].rotation.x
          bone.rotation.y = props.skeleton[name].rotation.y
          bone.rotation.z = props.skeleton[name].rotation.z
        }
      }
    }
  }

  const load = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let source = ModelLoader.getCharacterModels()[props.model]
        resolve(source)
      }, 500)
    })
  }

  useEffect(() => {
    console.log(type, id, 'add')

    setLoaded(false)
    load().then(source => {
      let cloned = cloneAnimated(source)

      if (cloned instanceof THREE.SkinnedMesh)  // if FBX is loaded we get a SkinnedMesh
      {
        let clo = cloneAnimated(source)
        cloned = new THREE.Object3D()
        cloned.add(clo)
      }
      let mat = cloned.children[0].material ? cloned.children[0].material.clone() : cloned.children[1].material.clone()

      object.current = cloned
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
      skel.material = mat.clone()
      skel.skeleton.pose()
      object.current.originalHeight = source.originalHeight

      //   MULTI MATERIALS
      // object.current.material = object.current.material.map(material => material.clone())

      object.current.userData.id = id
      object.current.userData.type = type
      object.current.scale.set( source.scale.x, source.scale.y, source.scale.z )
      object.current.rotation.set( source.rotation.x, source.rotation.y, source.rotation.z )
      scene.add( object.current )

      //adding the bone structure here on each character added to the scene
      object.current.bonesHelper = new BonesHelper(skel.skeleton.bones[0], object.current)
      scene.add(object.current.bonesHelper)

      setLoaded(true)
    }).catch(err => {
      console.error(err)
    })

    return function cleanup () {
      // TODO cancel loading if in-progress
      console.log(type, id, 'remove')
      if (object.current) {
        scene.remove(object.current.bonesHelper)
        scene.remove(object.current)
        object.current = null
      }
    }
  }, [props.model])

  //
  // updaters
  //
  // FIXME frame delay between redux update and react render here
  //

  useEffect(() => {
    if (object.current) {
      object.current.position.x = props.x
      object.current.position.z = props.y
      object.current.position.y = props.z
    }
  }, [props.model, props.x, props.y, props.z, loaded])

  useEffect(() => {
    if (object.current) {
      object.current.visible = props.visible
    }
  }, [props.model, props.visible, loaded])

  useEffect(() => {
    if (object.current) {
      object.current.rotation.y = props.rotation
    }
  }, [props.model, props.rotation, loaded])

  useEffect(() => {
    if (!loaded) return

    console.log(type, id, 'skeleton')
    updateSkeleton()
  }, [props.model, props.skeleton, loaded])

  useEffect(() => {
    if (object.current) {
      // FIXME hardcoded
      // let bbox = new THREE.Box3().setFromObject( object.current )
      height = object.current.originalHeight
      let scale = props.height / height

      object.current.scale.set( scale, scale, scale )
      object.current.bonesHelper.updateMatrixWorld()
    }
  }, [props.model, props.height, props.skeleton, loaded])

  useEffect(() => {
    if (!loaded) return

    if (object.current) {
      // adjust head proportionally
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

      let headBone = skel.skeleton.getBoneByName('mixamorigHead')
      // FIXME hardcoded
      let baseHeight = 1.6256
      let baseHeadScale = baseHeight / props.height

      //head bone
      headBone.scale.setScalar( baseHeadScale )
      headBone.scale.setScalar( props.headScale )
    }
  }, [props.model, props.headScale, props.skeleton, loaded])

  useEffect(() => {
    if (!loaded) return

    // Morphs are changing
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

    //console.log( '\tmorphTargetDictionary', skel.morphTargetDictionary )

    skel.morphTargetInfluences[ 0 ] = props.morphTargets.mesomorphic
    skel.morphTargetInfluences[ 1 ] = props.morphTargets.ectomorphic
    skel.morphTargetInfluences[ 2 ] = props.morphTargets.endomorphic

  }, [props.model, props.morphTargets, loaded])

  useEffect(() => {
    if (!loaded) return

    // handle selection/unselection
    if (isSelected)
    {
      for (var cone of object.current.bonesHelper.cones)
        object.current.bonesHelper.add(cone)
    } else {
      for (var cone of object.current.bonesHelper.cones)
        object.current.bonesHelper.remove(cone)
    }
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    if ( skel.material.length > 0 ) {
      skel.material.forEach(material => {
        material.userData.outlineParameters =
          isSelected
            ? {
              thickness: 0.015,
              color: [ 0.9, 0, 0 ]
            }
           : {
             thickness: 0.009,
             color: [ 0, 0, 0 ],
           }
      })
    } else {
      skel.material.userData.outlineParameters =
        isSelected
          ? {
            thickness: 0.015,
            color: [ 0.9, 0, 0 ]
          }
         : {
           thickness: 0.009,
           color: [ 0, 0, 0 ],
         }
    }
  }, [props.model, isSelected, loaded])

  useEffect(() => {
    if (!loaded) return

    if (selectedBone === undefined) return
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    let realBone = skel.skeleton.bones.find(bone => bone.uuid == selectedBone)

    if (currentBoneSelected.current === realBone) return

    if (selectedBone === null) {
      if (currentBoneSelected.current) {
        currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x006eb8 )
        currentBoneSelected.current = null
      }
      return
    }

    if (currentBoneSelected.current !== null) {
      currentBoneSelected.current.connectedBone.material.color = new THREE.Color( 0x006eb8 )
    }
    if (realBone === null || realBone === undefined) return
    realBone.connectedBone.material.color = new THREE.Color( 0xed0000 )
    currentBoneSelected.current = realBone

  }, [selectedBone, loaded])

  useEffect(() => {
    if (!isSelected) return

    if (remoteInput.mouseMode) return

    let realTarget
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    if (selectedBone) {
      realTarget = skel.skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
    } else {
      realTarget = object.current
    }
    let target = new THREE.Object3D()
    target.rotation.copy(realTarget.rotation)
    target.isBone = realTarget.isBone
    target.parent = realTarget.parent
    target.name = realTarget.name
    target.userData = realTarget.userData

    if (remoteInput.down) {
      if (target) {
        let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

        if (!isRotating.current) {
          isRotating.current = true
          startingObjectRotation.current ={
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z
          }

          startingDeviceRotation.current = {
            alpha: alpha,
            beta: beta,
            gamma: gamma
          }

          let sgr = new THREE.Quaternion()
          realTarget.getWorldQuaternion(sgr)
          startingGlobalRotation.current = {
            quaternion: sgr
          }
        }

        let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
        let tempQ = startingGlobalRotation.current.quaternion.clone()
        let cameraQuaternion = camera.quaternion.clone();
        let currentMainRotation = object.current.quaternion.clone()
        let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
        if (target.isBone)
        {
          // let w = 0.5,
          //   x = -0.5,
          //   y = -0.5,
          //   z = -0.5
          let w = 1,
              x = 0,
              y = 0,
              z = 0
          startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
          deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
        }

        //let inversedRotation = new THREE.Quaternion(w, x, y, z)
        let parentWorldQuaternion = new THREE.Quaternion()
        realTarget.parent.getWorldQuaternion(parentWorldQuaternion).clone()
        let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))

        startingDeviceQuaternion.multiply(cameraQuaternion.clone())
        deviceQuaternion.multiply(cameraQuaternion.clone())

        startingDeviceQuaternion.multiply( parentWorldQuaternion.clone() )
        deviceQuaternion.multiply( parentWorldQuaternion.clone() )

        let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)

        if (target.isBone)
        {
          t = new THREE.Vector3()
          q = new THREE.Quaternion()
          s = new THREE.Vector3()
          //deviceDifference.multiply ( parentWorldQuaternion.clone() )
          tempQ.multiply( deviceDifference )
          tempQ.multiply( parentWorldQuaternion.clone())

          target.quaternion.copy(tempQ)
          target.updateMatrix()
        } else {
          tempQ.multiply(deviceDifference)
          target.quaternion.copy(tempQ)
        }

        // OLD ROTATION ON AXIS
        // let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
        // startingObjectQuaternion.multiply(deviceDifference)
        // target.quaternion.copy(startingObjectQuaternion)

        if (selectedBone) {
          updateCharacterSkeleton({
            id,
            name: target.name,
            rotation: {
              x: target.rotation.x,
              y: target.rotation.y,
              z: target.rotation.z
            }
          })
        } else {
          updateObject(target.userData.id, {
            rotation: target.rotation.y
          })
        }
      }
    } else {
      isRotating.current = false
      startingObjectRotation.current = null
      startingDeviceRotation.current = null
      startingGlobalRotation.current = null

    }
  }, [remoteInput])

  return null
})

module.exports = Character
