const fromWorldSpaceToClipSpace = (position, camera, gl) => {
    let rect = gl.domElement.getBoundingClientRect();
    let width = rect.width, height = rect.height;
    let widthHalf = width / 2, heightHalf = height / 2;
    
    position.project(camera);

    position.x = ( position.x * widthHalf ) + widthHalf;
    position.y = - ( position.y * heightHalf ) + heightHalf;
    return position;
} 

export default fromWorldSpaceToClipSpace;