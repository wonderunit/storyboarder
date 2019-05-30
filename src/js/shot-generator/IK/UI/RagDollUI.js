const {connect} = require("react-redux");
const {undoGroupStart, undoGroupEnd} = require("../../../shared/reducers/shot-generator");

const NumberSliderComponent = require('../../NumberSlider')
const NumberSlider = connect(null, {
    onDragStart: undoGroupStart,
    onDragEnd: undoGroupEnd
})(NumberSliderComponent.NumberSlider)
const NumberSliderTransform = require('../../NumberSlider').transforms
const NumberSliderFormatter = require('../../NumberSlider').formatters

class RagDollUI
{
    constructor(ragDoll)
    {
        this.ragDoll = ragDoll;
    }

    getUIElements(sceneObject, addToX, createOnSetValueTarget)
    {
        let characterRig = this.ragDoll;
        let ui = [];
        let enableIk = characterRig.enableIk === true ? 1 : 0;
        let isShotMode = characterRig.isShotMode === true ? 1 : 0;
        console.log(addToX(1));
        ui.push(
            [NumberSlider,
                {
                    label: "EnableIK",
                    value: enableIk,
                    min: 0,
                    max: 1,
                    step: 1,
                    onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => value === 0 ? characterRig.turnOffIk() : characterRig.turnOnIk()),
                    transform: NumberSliderTransform.round,
                }]
        );

        ui.push(
            [NumberSlider,
                {
                    label: "EnableShotMode",
                    value: isShotMode,
                    min: 0,
                    max: 1,
                    step: 1,
                    onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => value === 0 ? this.shotMode(false) : this.shotMode(true)),
                    transform: NumberSliderTransform.round,
                }]
        );

        let poleConstraints = characterRig.poleConstraints;
        for(let i = 0; i < poleConstraints.length; i++)
        {
            let poleTarget = poleConstraints[i].poleTarget;
            let position = poleTarget.mesh.position;
            let x = position.x;
            let y = position.y;
            let z = position.z;
            ui.push([
                [NumberSlider,
                    {
                        label: poleTarget.mesh.name + 'X',
                        value: position.x,
                        min: -30,
                        max: 30,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => position.set(value, y, z))
                    }],
                [NumberSlider,
                    {
                        label: poleTarget.mesh.name + 'Y',
                        value: position.y,
                        min: -30,
                        max: 30,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => position.set(x, value, z))
                    } ],
                [NumberSlider,
                    {
                        label: poleTarget.mesh.name + 'Z',
                        value: position.z,
                        min: -30,
                        max: 30,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'z', (value) => addToX(0.00000000001 * value), (value) => position.set(x, y, value))
                    } ]
            ]);
        }
        return ui;
    }


    shotMode(isEnable)
    {
        let ragDoll = this.ragDoll;
        this.isShotMode = isEnable;
        let visible = isEnable ? false : true;
        let chainObjects = ragDoll.chainObjects;
        for (let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i];
            chain.controlTarget.target.visible = visible;
            chain.controlTarget.control.visible = visible;

            let constraints = ragDoll.poleConstraints[i];
            constraints.poleTarget.mesh.visible = visible;
        }
        ragDoll.hipsControlTarget.target.visible = visible;
        ragDoll.hipsControlTarget.control.visible = visible;
    }

}
module.exports = RagDollUI;
