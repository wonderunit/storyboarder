import { useRef, useEffect } from 'react'

import { ShadingType } from '../../vendor/shading-effects/ShadingType'
import createShadingEffect from '../../vendor/shading-effects/createShadingEffect'

const create = gl => ({
  [ShadingType.Wireframe]: createShadingEffect(ShadingType.Wireframe, gl),
  [ShadingType.Flat]: createShadingEffect(ShadingType.Flat, gl),
  [ShadingType.Depth]: createShadingEffect(ShadingType.Depth, gl),
  [ShadingType.Outline]: createShadingEffect(ShadingType.Outline, gl)
})

const cleanup = instances => {
  instances.current[ShadingType.Wireframe].cleanupCache()
  instances.current[ShadingType.Flat].cleanupCache()
  instances.current[ShadingType.Depth].cleanupCache()
  instances.current[ShadingType.Outline].cleanupCache()
}

const update = (renderer, shadingMode, backgroundColor) => {
  switch (shadingMode) {
    case ShadingType.Depth:
      renderer.fog.color = new THREE.Color(backgroundColor)
      break
  }
}

const useShadingEffect = (sourceGl, shadingMode, backgroundColor) => {
  const renderer = useRef()
  const instances = useRef()

  if (!instances.current) {
    instances.current = create(sourceGl)
    renderer.current = instances.current[shadingMode]
    update(renderer.current, shadingMode, backgroundColor)
  }

  useEffect(() => {
    renderer.current = instances.current[shadingMode]
    update(renderer.current, shadingMode, backgroundColor)
  }, [shadingMode, backgroundColor])

  useEffect(() => {
    return () => {
      cleanup(instances)
    }
  }, [])

  return renderer
}

export default useShadingEffect
