const { useMemo, useRef } = React = require('react')
const { useRender } = require('react-three-fiber')

const useGltf = require('../../hooks/use-gltf')

const SCALE = 0.025
const POSITION = [0.07, 0.01, -0.1]

class CanvasRenderer {
  constructor (size) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context

    ctx.font = '20pt Arial'
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20)
    ctx.fillStyle = 'black'
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(Date.now(), canvas.width / 2, canvas.height / 2)
  }
}

const Controls = () => {
  const ref = useRef()
  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = () => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(1024)
    }
    return canvasRendererRef.current
  }

  const textureRef = useRef(null)
  const getTexture = () => {
    if (textureRef.current === null) {
      textureRef.current = new THREE.CanvasTexture(getCanvasRenderer().canvas)
      textureRef.current.flipY = false
    }
    return textureRef.current
  }

  const gltf = useGltf('/data/system/xr/ui/controls.glb')

  const mesh = useMemo(
    () => {
      let mesh = gltf.scene.children[0].clone()

      let material = new THREE.MeshBasicMaterial({
        map: getTexture()
      })

      mesh.material = material

      return mesh
    },
    [gltf]
  )

  useRender((state, delta) => {
    getCanvasRenderer().render()
    getTexture().needsUpdate = true
  })

  return mesh
    ? <primitive
      ref={ref}
      object={mesh}

      position={POSITION}
      scale={[SCALE, SCALE, SCALE]}

      onController={() => null}
      userData={{
        type: 'ui',
        id: 'controls'
      }}>
    </primitive>
    : null
}

module.exports = Controls
