const THREE = require('three')


const allIcons = {}

const fu = new Image;
fu.crossOrigin = 'anonymous';
fu.onload = ( material ) => () => {
    var bar = new THREE.Texture (fu);
    bar.needsUpdate = true;

    material.wireframe = false;
    material.map = bar;
    material.needsUpdate = true;
};
fu.onerror = function (e) {
		console.log (e);
}
fu.src = 'https://upload.wikimedia.org/wikipedia/commons/1/18/SVG_example7.svg';

const loadIcons = () => {
    const character = loadIconPromise("data/shot-generator/icons/character-icon.svg")
    const camera = loadIconPromise("data/shot-generator/icons/character-icon.svg")
    const light = loadIconPromise("data/shot-generator/icons/character-icon.svg")
    const object = loadIconPromise("data/shot-generator/icons/character-icon.svg")

    return Promise.all( [ character, camera, light, object ] ).then(( values ) => {
        allIcons.character = values[0]
        allIcons.camera = values[1]
        allIcons.light = values[2]
        allIcons.object = values[3]
        return new Promise( resolve => {
            resolve(allIcons)
        })
    })
}

function getIcons()
{
    return loadIcons()
}

module.exports = allIcons