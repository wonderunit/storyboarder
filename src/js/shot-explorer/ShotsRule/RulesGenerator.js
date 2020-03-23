import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength))
    return number
}

const generateRule = (box, camera) => {
    let i = getRandomNumber(2)
    console.log(i)
    return i && box && new HorizontalOneThirdRule(box, camera)
}

export default generateRule