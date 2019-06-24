const getCameraSetups = scene => {
  const comparable = (a, b, tolerance = 0.01) => Math.abs(a - b) < tolerance

  let setups = []
  for (let board of scene.boards) {
    if (!board.sg) continue

    let cameras = Object.values(board.sg.data.sceneObjects).filter(o => o.type === 'camera')

    for (let camera of cameras) {
      let matchingSetup

      for (let setup of setups) {
        // is it probably the same camera?
        if (
          comparable(setup.camera.roll, camera.roll) &&
          comparable(setup.camera.rotation, camera.rotation) &&
          comparable(setup.camera.tilt, camera.tilt) &&
          comparable(setup.camera.x, camera.x) &&
          comparable(setup.camera.y, camera.y) &&
          comparable(setup.camera.z, camera.z)
        ) {
          matchingSetup = setup.camera.id
        }
      }

      if (matchingSetup) {
        // console.log('update')
        let setup = setups.find(o => o.camera.id === matchingSetup)
        setup.boards.push(board)
      } else {
        // console.log('insert')
        setups.push({
          camera,
          boards: [board]
        })
      }
    }
  }

  return setups
}

module.exports = {
  getCameraSetups
}
