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
  transparent: true,
  side: THREE.DoubleSide
})

const Image = React.memo(({scene, id, type, isSelected, storyboarderFilePath, imageAttachmentIds, ...props}) => {

  let image = useRef(null)
  const loadingImageSet = useRef(false)
  const discard = useRef(false)

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
        imageMaterial.map = texture
        imageMaterial.userData.outlineParameters = {
          thickness: 0.008,
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

  const create = () => {
    console.log(type, id, 'added')
    let geo = new THREE.BoxBufferGeometry(1, 1, 0.01)
    let mat = materialFactory()
    let mesh = new THREE.Mesh(geo, mat)

    image.current = mesh
    image.current.userData.id = id
    image.current.userData.type = type

    image.current.orthoIcon = new IconSprites(type, props.name ? props.name : props.displayName, image.current)
    image.current.rotation.set(props.rotation.x, props.rotation.y, props.rotation.z)
    image.current.position.set(props.x, props.z, props.y)
    image.current.scale.set(props.width, props.height, 1)

    scene.add(image.current)
    scene.add(image.current.orthoIcon)

    let imgArray = imageAttachmentIds.map(relpath => {
      if (isUserFile(relpath)) {
        return path.join(path.dirname(storyboarderFilePath), relpath)
      } else {
        return path.join(pathToBuiltInVolumeImages, relpath + '.jpg')
      }
    })

    loadingImageSet.current = true
    loadImage(imgArray).then((result) => {
      image.current.material = result.materials[0]
    })
  }

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
    image.current.position.x = props.x
    image.current.position.z = props.y
    image.current.position.y = props.z
    image.current.orthoIcon.position.copy(image.current.position)
  }, [
    props.x,
    props.y,
    props.z
  ])

  useEffect(() => {
    image.current.rotation.x = props.rotation.x
    image.current.rotation.y = props.rotation.y
    image.current.rotation.z = props.rotation.z
    image.current.orthoIcon.icon.material.rotation = props.rotation
  }, [
    props.rotation.x,
    props.rotation.y,
    props.rotation.z
  ])

  useEffect(() => {
    image.current.scale.set(props.width, props.height, 1)
  }, [
    props.width,
    props.height
  ])

  useEffect(() => {
    if (image.current) {
      image.current.visible = props.visible
      image.current.orthoIcon.visible = props.visible
    }
  }, [props.visible])

  useEffect(() => {
    if (!image.current) return
    if (!image.current.material) return

    image.current.material.userData.outlineParameters =
      isSelected
        ? {
          thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
        : {
          thickness: 0,
          color: [ 0, 0, 0 ],
        }

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
