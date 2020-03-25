import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
import VerticalOneThirdRule from "./VerticalOneThirdRule"
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength))
    return number
}

const generateRule = (box, camera) => {
    let i = getRandomNumber(6)
    let result = null
    switch(i) {
        case 1:
        case 2:
            result = new HorizontalOneThirdRule(box, camera, i > 1 ? "left" : "right")
            break;
        case 3:
            result = new VerticalOneThirdRule(box, camera)
            break;
        default:
            break;
    }
    return result
    
}

export default generateRule