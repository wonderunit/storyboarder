import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
import RollRule from "./HorizontalOneThirdRule"
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength));
    return number;
}

const generateRule = (focusedCenter, camera) => {
    let i = getRandomNumber(100);
    let results = [];

    if(i < 10) {
        results.push(new RollRule(focusedCenter, camera))
    }
    if(i < 50) {
        results.push(new HorizontalOneThirdRule(focusedCenter, camera, i < 25 ? "left" : "right"));
    }

    return results
    
}

export default generateRule