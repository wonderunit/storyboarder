const THREE = require('three')
window.THREE = window.THREE || THREE
const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const path = require('path')
const React = require('react')
const { useRef, useEffect, useState } = React

const { dialog } = require('electron').remote
const fs = require('fs')
const ModelLoader = require('../services/model-loader')

const applyDeviceQuaternion = require('./apply-device-quaternion')

const Group = React.memo(({ scene, id, type, isSelected, loaded, modelData, updateObject, remoteInput, camera, storyboarderFilePath, ...props }) => {
  const setLoaded = loaded => updateObject(id, { loaded })

  const container = useRef()

  useEffect(() => {
    console.log(type, id, 'added')

    container.current = new THREE.Group();
    container.current.userData.id = id
    container.current.userData.type = type
    

    console.log(type, id, 'added to scene')
    scene.add(container.current)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      scene.remove(container.current.orthoIcon)
      scene.remove(container.current)
    }
  }, [])

  useEffect(() => {
    container.current.visible = props.visible
  }, [
    props.visible
  ])

  useEffect(() => {
    if (!container.current.children[0]) return
    if (!container.current.children[0].material) return

    container.current.children[0].material.userData.outlineParameters =
      isSelected
        ? {
          thickness: 0.008,
          color: [ 122/256.0/2, 114/256.0/2, 233/256.0/2 ]
        }
        : {
          thickness: 0.008,
          color: [ 0, 0, 0 ],
        }

    container.current.orthoIcon.setSelected(isSelected)
  }, [isSelected, loaded])

  return null
})

module.exports = Group
