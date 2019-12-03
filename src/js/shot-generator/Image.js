const THREE = require('three')
window.THREE = window.THREE || THREE

const path = require('path')

const React = require('react')
const { useRef, useEffect, useState } = React

const textureLoader = new THREE.TextureLoader()

const IconSprites = require('./IconSprites')

const { isUserFile } = require('../services/model-loader')
const pathToShotGeneratorData = path.join(__dirname, '..', '..', '..', 'src', 'data', 'shot-generator')
const pathToBuiltInVolumeImages = path.join(pathToShotGeneratorData, 'images')

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false,
  transparent: true
})

const Image = React.memo(({scene, id, type, isSelected, updateObject, storyboarderFilePath, imageAttachmentIds, ...props}) => {

  let image = useRef(null)
  const loadingImageSet = useRef(false)
  const discard = useRef(false)
  const aspect = useRef(1)

  const loadImage = (imgArray) => {
    const promises = imgArray.map(link => loadMaterialPromise(link))
    return Promise.all(promises).then((materials) => {
      return new Promise(resolve => {
        resolve({materials, imgArray})
      })
    })
  }

  const loadMaterialPromise = (link) => {
    return new Promise((resolve, reject) => {
      textureLoader.load(link, (texture) => {
        let imageMaterial = materialFactory()
        imageMaterial.opacity = props.opacity
        imageMaterial.map = texture
        imageMaterial.userData.outlineParameters = {
          thickness: 0,
          color: [122 / 256.0 / 2, 114 / 256.0 / 2, 233 / 256.0 / 2]
        }
        resolve(imageMaterial)
      })
    })
  }

  useEffect(() => {
    if (image.current) {
      image.current.orthoIcon.changeFirstText(props.name ? props.name : props.displayName)
    }
  }, [props.displayName, props.name])
  
  useEffect(() => {
    if (!image.current) return
    image.current.userData.locked = props.locked
  }, [props.locked])

  const create = () => {
    console.log(type, id, 'added')
    let geo = new THREE.PlaneBufferGeometry(1, 1)
    let boxGeo = new THREE.BoxGeometry(1, 1, 0.01)
    boxGeo.faces = boxGeo.faces.slice(0, 8)

    let mat = materialFactory()
    let mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = 0.005

    let meshBackside = mesh.clone()
    meshBackside.rotation.y = Math.PI
    meshBackside.position.z = -0.005
    meshBackside.scale.x = -1

    let boxMesh = new THREE.Mesh(boxGeo, mat)

    let group = new THREE.Group().add(mesh, meshBackside, boxMesh)

    image.current = group
    image.current.userData.id = id
    image.current.userData.type = type
    image.current.userData.locked = props.locked
    image.current.children.forEach(child => {
      child.layers.disable(0)
      child.layers.enable(1)
      child.layers.disable(2)
      if (props.visibleToCam) child.layers.enable(3)
      else child.layers.disable(3)
      child.userData.type = type
    })

    image.current.orthoIcon = new IconSprites(type, props.name ? props.name : props.displayName, image.current)
    image.current.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z)
    image.current.position.set(props.x, props.z, props.y)
    image.current.scale.set(props.height * aspect.current, props.height, 1)

    image.current.visible = props.visible
    image.current.orthoIcon.position.copy(image.current.position)
    image.current.orthoIcon.icon.material.rotation = props.rotation.y
    image.current.orthoIcon.visible = props.visible

    scene.add(image.current)
    scene.add(image.current.orthoIcon)

    let imgArray = imageAttachmentIds.map(relpath => {
      if (isUserFile(relpath)) {
        return path.join(path.dirname(storyboarderFilePath), relpath)
      } else {
        return path.join(pathToBuiltInVolumeImages, relpath + '.png')
      }
    })

    loadingImageSet.current = true
    loadImage(imgArray).then((result) => {
      const { width, height } = result.materials[0].map.image
      aspect.current = width / height

      updateObject(id, { width: props.height * aspect.current })
      image.current.children.forEach(child => child.material = result.materials[0])
    })
  }

  useEffect(() => {
    if (!image.current) return
    image.current.children.forEach(child => (child.material.opacity = props.opacity))
  }, [props.opacity])

  useEffect(() => {
    if (!image.current) return
    if (props.visibleToCam) image.current.children.forEach(child => child.layers.enable(3))
    else image.current.children.forEach(child => child.layers.disable(3))
  }, [props.visibleToCam])

  useEffect(() => {
    create()
    return function cleanup() {
      if (image.current) {
        console.log(type, id, 'removed')
        scene.remove(image.current.orthoIcon)
        scene.remove(image.current)
      }
    }
  }, [])

  useEffect(() => {
    if (image.current) {
      image.current.position.x = props.x
      image.current.position.z = props.y
      image.current.position.y = props.z
      image.current.rotation.x = props.rotation.x
      image.current.rotation.y = props.rotation.y
      image.current.rotation.z = props.rotation.z

      image.current.visible = props.visible
      image.current.orthoIcon.position.copy(image.current.position)
      image.current.orthoIcon.icon.material.rotation = props.rotation.y
      image.current.orthoIcon.visible = props.visible
    }
  }, [props.x, props.y, props.z, props.rotation, props.tilt, props.roll, props.visible])

  useEffect(() => {
    image.current.scale.set(props.height * aspect.current, props.height, 1)
  }, [props.height, aspect.current])

  useEffect(() => {
    if (!image.current) return

    const outlineParameters =
      isSelected
        ? {
          thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
        : {
          thickness: 0,
          color: [ 0, 0, 0 ],
        }

    image.current.children.forEach(child => (child.material.userData.outlineParameters = outlineParameters))
    image.current.orthoIcon.setSelected(isSelected)
  }, [isSelected])

  useEffect(() => {
  if (image.current) {
    scene.remove(image.current.orthoIcon)
    scene.remove(image.current)
    image.current = null
    if (loadingImageSet.current) discard.current = true
    create()
  }

}, [imageAttachmentIds])

  return null
})

module.exports = Image
