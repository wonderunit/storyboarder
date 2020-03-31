import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
import RollRule from "./RollRule"
import * as THREE from 'three'
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength));
    return number;
}

const generateRule = (focusedCenter, character, shot, camera) => {
    let i = getRandomNumber(100);
    let results = [];

    if(i < 10) {
        results.push(new RollRule(focusedCenter, camera))
    }
    if(i < 50) {
        let characterRotation = character.rotation.y * THREE.Math.RAD2DEG
        let cameraRotation = shot.cameraRotation ? shot.cameraRotation * THREE.Math.RAD2DEG : 0
        let characterFacingRotation = cameraRotation + (characterRotation)
      //  results.push(new HorizontalOneThirdRule(focusedCenter, camera, characterFacingRotation < 0 ? "left" : "right"));
    }

    return results
    
}

export default generateRule