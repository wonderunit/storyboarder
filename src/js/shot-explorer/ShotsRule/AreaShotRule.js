import ShotRule from "./ShotRule"
import * as THREE from 'three'

const isBoneInShot = (bone) => {
    let name = bone.name;
    return name === "Neck" || name === "Head" || name === "leaf" 
            || name === "LeftEye" || name === "RightEye" || name === "LeftShoulder"
            || name === "RightShoulder";
}

class AreaShotRule extends ShotRule {
    constructor(focusedCenter, camera, characters, shot) {
        super(focusedCenter, camera);
        this.characters = characters;
        this.shot = shot;
        this.radius = 1.5;
    }

    applyRule(scene) {
        super.applyRule();
        let character = this.shot.character;
        let charactersInRange = [];
        let characterPosition = character.worldPosition();
        let headPoints = [];
        let frustum = new THREE.Frustum();
        this.camera.updateMatrixWorld(true);
        this.camera.updateProjectionMatrix();

        frustum.setFromProjectionMatrix( new THREE.Matrix4().multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse ) );
        for( let i = 0; i < this.characters.length; i++) {
            let position = this.characters[i].worldPosition();
            if(Math.pow(position.x - characterPosition.x, 2) + Math.pow(position.y - characterPosition.y, 2) < Math.pow(this.radius, 2)) {
                let shotCharacter = this.characters[i];
                let skinnedMesh = shotCharacter.getObjectByProperty("type", "SkinnedMesh");
                let box = new THREE.Box3();
                for(let i = 0; i < skinnedMesh.skeleton.bones.length; i++) {
                    let bone = skinnedMesh.skeleton.bones[i];
                    box.expandByPoint(bone.worldPosition());
                }
                if(skinnedMesh && frustum.intersectsBox(box)) {
                    charactersInRange.push(shotCharacter);
                    headPoints = headPoints.concat(this.getCharacterShotPoints(skinnedMesh));
                }
            }
        }
        let box = new THREE.Box3().setFromPoints(headPoints);
        if(charactersInRange.length > 1) {

            //#region Camera distancing method
            let center = this.focusedCenter;
            let areaCenter = new THREE.Vector3();
            box.getCenter(areaCenter)
            areaCenter.y = box.max.y
            areaCenter.x = center.x
            areaCenter.z = center.z
            let BA = new THREE.Vector3().subVectors(center, this.camera.position);
            let BC = new THREE.Vector3().subVectors(areaCenter, this.camera.position);
            let cosineAngle = BA.dot(BC) / (BA.length() * BC.length());
            let angle = Math.acos(cosineAngle);

            let difference = center.clone().sub(areaCenter);
            let normalCenter = difference.clone().normalize();
            normalCenter.set(normalCenter.y, normalCenter.x, 0);
            let sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            this.camera.rotateOnAxis(normalCenter, angle);
            let direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            direction.negate();
            let depth = sphere.radius / Math.tan(this.camera.fov / 2 * Math.PI / 180.0);
            let newPos = new THREE.Vector3().addVectors(sphere.center, direction.clone().setLength(depth));
            if(sphere.center.distanceTo(newPos) + this.radius > sphere.center.distanceTo(this.camera.position)) {
                this.camera.position.copy(newPos)
            }
            this.camera.updateMatrixWorld(true);
            //#endregion

            //#region Establishing method
/* 
            let sphere = new THREE.Sphere()
            box.getBoundingSphere(sphere)
            let direction = new THREE.Vector3()
            this.camera.getWorldDirection(direction)
            direction.negate()
            for (let i = 0; i < charactersInRange.length - 1; i += 2) {
                direction.add(charactersInRange[i + 1].position.clone().sub(charactersInRange[i].position.clone()))
            }
            direction.divideScalar(charactersInRange.length)
      
            direction = this.camera.position.clone().sub(direction)
            direction.y = this.camera.y 
            let h = sphere.radius / Math.tan(this.camera.fov / 2 * Math.PI / 180.0)
            console.log(h)
            let newPos = new THREE.Vector3().addVectors(sphere.center, direction.clone().setLength(h))

            direction = sphere.center.clone().sub(newPos).normalize()

            //end action
            let currentDistance = newPos.distanceTo(sphere.center)
  
            direction.y = 0
            direction.normalize()
          //  let mainAxis = new THREE.Vector3().crossVectors(this.camera.up, direction)
          
          //  let quaternion = new THREE.Quaternion()
          //  quaternion.setFromAxisAngle(mainAxis, angle)
            
           // direction.applyQuaternion(quaternion)
            direction.setLength(currentDistance)
            newPos.copy(sphere.center).sub(direction)
            console.log("Current camera position", this.camera.position.clone())
            let y = this.camera.position.y
            this.camera.position.copy(newPos)
            this.camera.position.y = y
            this.camera.lookAt(sphere.center)
            this.camera.updateMatrixWorld(true)

            console.log("New camera position", newPos)
            console.log("sphere", sphere.center)
            console.log("direction", direction)
            console.log("Current camera position", this.camera.position.clone())
 */
            //#endregion Establishing method
        }
        return null
    }


    //#region private methods
    getCharacterShotPoints(skinnedMesh) {
        let headPoints = [];
        let shotBones = skinnedMesh.skeleton.bones.filter(bone => isBoneInShot(bone));
        for(let i = 0; i < shotBones.length; i++) {
            headPoints.push(shotBones[i].worldPosition());
        }
        return headPoints;
    }
    //#endregion
}

export default AreaShotRule;
