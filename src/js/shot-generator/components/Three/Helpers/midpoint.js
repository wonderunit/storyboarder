import { Vector3 } from 'three'
const getMidpoint = (...vectors) => {
    let midPoint = new Vector3()
    let length = vectors.length
    console.log(length)
    for(let i = 0; i < length; i++) {
        console.log(vectors[i])
        midPoint.add(vectors[i])
    }
    console.log(midPoint)
    return midPoint.divideScalar(length)
}
export default getMidpoint