import WireframeShading from './WireframeShading'
import FlatShading from './FlatShading'
import DepthShading from './DepthShading'
import {OutlineEffect} from '../OutlineEffect'
import { ShadingType } from './ShadingType'

const createShadingEffect = (shadingMode, gl) => {
    let newRenderer
    switch(shadingMode) {
        case ShadingType.Wireframe:
          newRenderer = new WireframeShading(gl)
          break
        case ShadingType.Flat:
          newRenderer = new FlatShading(gl)
          break    
        case ShadingType.Depth:
          newRenderer = new DepthShading(gl)
          break
        case ShadingType.Outline:
        default:
          newRenderer = new OutlineEffect(gl, { defaultThickness: 0.015 })
          break
    }
    return newRenderer
}
export default createShadingEffect