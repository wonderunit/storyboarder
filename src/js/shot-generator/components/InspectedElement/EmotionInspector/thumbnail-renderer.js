import * as THREE from 'three'

import ThumbnailRenderer from '../../../utils/ThumbnailRenderer'

import cloneGltf from '../../../helpers/cloneGltf'
import { patchMaterial } from '../../../helpers/outlineMaterial'
import getMidpoint from '../../Three/Helpers/midpoint'
import clampInstance from '../../../utils/clampInstance'

import FaceMesh from '../../../components/Three/Helpers/FaceMesh'

// TODO extract createCharacter function to module
const createCharacter = (gltf) => {
  let lod = new THREE.LOD()
  let { scene } = cloneGltf(gltf)
  let map

  // for built-in Characters
  // SkinnedMeshes are immediate children
  let meshes = scene.children.filter((child) => child.isSkinnedMesh)

  // if no SkinnedMeshes are found there, this may be a custom model file
  if (
    meshes.length === 0 &&
    scene.children.length &&
    scene.children[0].children
  ) {
    // try to find the first SkinnedMesh in the first child object's children
    let mesh = scene.children[0].children.find((child) => child.isSkinnedMesh)
    if (mesh) {
      meshes = [mesh]
    }
  }

  // if there's only 1 mesh
  let startAt =
    meshes.length == 1
      ? // start at mesh index 0 (for custom characters)
        0
      : // otherwise start at mesh index 1 (for built-in characters)
        1

  for (let i = startAt, d = 0; i < startAt + 1; i++, d++) {
    let mesh = meshes[i]
    mesh.matrixAutoUpdate = false
    map = mesh.material.map

    mesh.material = new THREE.MeshToonMaterial({
      map: map,
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      flatShading: false,
      morphNormals: true,
      morphTargets: true
    })

    patchMaterial(mesh.material)

    lod.addLevel(mesh, d * 4)
  }

  let skeleton = lod.children[0].skeleton
  skeleton.pose()

  let originalSkeleton = skeleton.clone()
  originalSkeleton.bones = originalSkeleton.bones.map((bone) => bone.clone())

  let armature = scene.getObjectByProperty('type', 'Bone').parent
  let character = new THREE.Group()
  character.add(lod)
  character.add(armature)
  return character
}

class EmotionPresetThumbnailRenderer {
  constructor ({ characterGltf, inverseSide }) {
    this.thumbnailRenderer = new ThumbnailRenderer( { inverseSide})

    let characterGroup = createCharacter(characterGltf)
  
    this.thumbnailRenderer.getGroup().add(characterGroup)
    characterGroup.rotation.y = Math.PI / 22

    let character = characterGroup.getObjectByProperty('type', 'SkinnedMesh')

    this.faceMesh = new FaceMesh()
    this.faceMesh.setSkinnedMesh({ children: [character] })

    let camera = this.thumbnailRenderer.camera

    let boxGeometry = new THREE.BoxGeometry(2.5, 2)
    let headBone = character.skeleton.getBoneByName('Head').worldPosition()
    let leftEye = character.skeleton.getBoneByName('LeftEye').worldPosition()
    let rightEye = character.skeleton.getBoneByName('RightEye').worldPosition()
    let material = new THREE.MeshBasicMaterial()
    let mesh = new THREE.Mesh(boxGeometry, material)
    let midPoint = getMidpoint(headBone, leftEye, rightEye)
    mesh.scale.multiplyScalar(0.15 / character.scale.x)
    mesh.position.copy(midPoint)
    mesh.updateWorldMatrix(true, true)
    clampInstance(mesh, camera, new THREE.Vector3(0, 0, 1))
    mesh.visible = false
  }

  clear () {
    this.thumbnailRenderer.clear()
  }

  render ({ faceTexture }) {
    this.faceMesh.draw(faceTexture)
    this.thumbnailRenderer.render()
  }

  toDataURL (...args) {
    return this.thumbnailRenderer.toDataURL(...args)
  }

  toBase64 (...args) {
    return this.thumbnailRenderer.toBase64(...args)
  }

  dispose () {
    this.thumbnailRenderer.dispose()
  }
}

export default EmotionPresetThumbnailRenderer
