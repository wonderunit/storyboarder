const mouse = (mousePos, gl, offsetTop = true) => {
    const rect = gl.domElement.getBoundingClientRect();
    let offsetX = offsetTop ? rect.left : 0
    let offsetY = offsetTop ? rect.top : 0
    let worldX = ( ( mousePos.x - offsetX ) / rect.width ) * 2 - 1;
    let worldY = - ( ( mousePos.y - offsetY ) / rect.height ) * 2 + 1;
    return { x: worldX, y: worldY }
  }

export default mouse