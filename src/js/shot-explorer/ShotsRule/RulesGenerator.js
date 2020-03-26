import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength));
    return number;
}

const generateRule = (focusedCenter, camera) => {
    let i = getRandomNumber(6);
    let result = null;
    switch(i) {
        case 1:
        case 2:
            result = new HorizontalOneThirdRule(focusedCenter, camera, i > 1 ? "left" : "right");
            break;
        default:
            break;
    }
    return result
    
}

export default generateRule