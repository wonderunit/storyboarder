import VerticalOneThirdRule from "./VerticalOneThirdRule"
import RollRule from "./RollRule"
import * as THREE from 'three'
import HorizontalOneThirdRule from './HorizontalOneThirdRule'
import OrbitingRule from './OrbitingRule'
const clamRotationTo = (rotation, clampDegree = 180) => {
    if(rotation === clampDegree || rotation === -clampDegree) return rotation
    let clampLimit = Math.max(-clampDegree, Math.min(clampDegree, rotation))
    let newRotation = rotation
    if(clampLimit !== rotation) {
        newRotation = (rotation - clampLimit) - clampLimit
    }
    return newRotation
}

const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength));
    return number;
}

const generateRule = (focusedCenter, character, shot, camera, skinnedMesh) => {
    let i = getRandomNumber(100);
    let results = [];

    //#region Finds Headbone and it's children and calculates their center for vertical oneThird
    let headBone = skinnedMesh.skeleton.bones.filter(bone => bone.name === "Head")[0]
    let headPoints = []
    headPoints.push(headBone.worldPosition())
    for(let i = 0; i < headBone.children.length; i++) {
        if(headBone.children[i].name.includes('leaf'))
            headPoints.push(headBone.children[i].worldPosition())
    }
    let headBox = new THREE.Box3().setFromPoints(headPoints)
    let headCenter = new THREE.Vector3()
    headBox.getCenter(headCenter)
    //#endregion

    if(i < 100) {
        // Applies vertical oneThird rule; Should be always applied
        shot.orbitingRule = new OrbitingRule(headCenter, character, camera)          
        shot.cameraRotation = shot.orbitingRule.angle
        results.push(shot.orbitingRule)
    }
    if(i < 10) {
        results.push(new RollRule(focusedCenter, camera))
    }
    if(i < 70) {
        let headQuaternion = headBone.worldQuaternion()
        let rotation = new THREE.Euler().setFromQuaternion(headQuaternion)
        let characterRotation = rotation.y * THREE.Math.RAD2DEG
        let cameraRotation = shot.cameraRotation ? shot.cameraRotation * THREE.Math.RAD2DEG : 0
        let characterFacingRotation = cameraRotation - (characterRotation)
        characterFacingRotation = clamRotationTo(characterFacingRotation)
        results.push(new VerticalOneThirdRule(focusedCenter, camera, headCenter, characterFacingRotation < 0 ? "left" : "right"));
    }
    if(i < 100) {
        results.push( new HorizontalOneThirdRule(headCenter, camera, focusedCenter))
    }

    return results
}

export default generateRule
