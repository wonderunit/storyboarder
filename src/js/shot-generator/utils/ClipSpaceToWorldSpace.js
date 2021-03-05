const fromClipSpaceToWorldSpace = (mousePos, camera, targetZ) => {
    let vector = new THREE.Vector3();
    vector.set(mousePos.x, mousePos.y, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();
    let distance = (targetZ - camera.position.z) / vector.z;
    let position = new THREE.Vector3().copy(camera.position).add(vector.multiplyScalar(distance));
    return position;
}

export default fromClipSpaceToWorldSpace;