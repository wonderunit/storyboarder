import { Vector3 } from 'three'
const getMidpoint = (...vectors) => {
    let midPoint = new Vector3()
    let length = vectors.length
    for(let i = 0; i < length; i++) {
        midPoint.add(vectors[i])
    }
    return midPoint.divideScalar(length)
}
export default getMidpoint