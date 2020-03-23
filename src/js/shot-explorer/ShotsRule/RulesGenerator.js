import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength))
    return number
}

const generateRule = (box, camera) => {
    let i = getRandomNumber(3)
    console.log(i)
    return i && box && new HorizontalOneThirdRule(box, camera, i > 1 ? "left" : "right")
}

export default generateRule