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
        let enableIk = characterRig.isEnabledIk === true ? 1 : 0;
        let isShotMode = characterRig.isShotMode === true ? 1 : 0;
/*
        ui.push(
            [NumberSlider,
                {
                    label: "EnableIK",
                    value: isEnabledIk,
                    min: 0,
                    max: 1,
                    step: 1,
                    onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => value === 0 ? characterRig.turnOffIk() : characterRig.turnOnIk()),
                    transform: NumberSliderTransform.round,
                }]
        );
*/

/*        ui.push(
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
        );*/

        let poleConstraints = characterRig.poleConstraints;
        //for(let i = 0; i < poleConstraints.length; i++)
        //{
            //let poleTarget = poleConstraints[i].poleTarget;
            let originalHips = characterRig.originalObject.children[0].children[0];
            let position = originalHips.rotation;
            let x = position.x;
            let y = position.y;
            let z = position.z;
            ui.push([
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'X',
                        value: position.x,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => position.set(value, y, z))
                    }],
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'Y',
                        value: position.y,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => position.set(x, value, z))
                    } ],
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'Z',
                        value: position.z,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'z', (value) => addToX(0.00000000001 * value), (value) => position.set(x, y, value))
                    } ]
            ]);
            let rotation = characterRig.originalObject.children[0].rotation;
            x = rotation.x;
            y = rotation.y;
            z = rotation.z;
            ui.push([
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'X',
                        value: rotation.x,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => rotation.set(value, y, z))
                    }],
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'Y',
                        value: rotation.y,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => rotation.set(x, value, z))
                    } ],
                [NumberSlider,
                    {
                        label: "rotate original hips" + 'Z',
                        value: rotation.z,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'z', (value) => addToX(0.00000000001 * value), (value) => rotation.set(x, y, value))
                    } ]
            ]);
            let leftLegRotation = characterRig.originalObject.children[0].children[1].rotation;
            x = leftLegRotation.x;
            y = leftLegRotation.y;
            z = leftLegRotation.z;
            ui.push([
                [NumberSlider,
                    {
                        label: "rotate original LeftLeg" + 'X',
                        value: leftLegRotation.x,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => leftLegRotation.set(value, y, z))
                    }],
                [NumberSlider,
                    {
                        label: "rotate original LeftLeg" + 'Y',
                        value: leftLegRotation.y,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => leftLegRotation.set(x, value, z))
                    } ],
                [NumberSlider,
                    {
                        label: "rotate original LeftLeg" + 'Z',
                        value: leftLegRotation.z,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'z', (value) => addToX(0.00000000001 * value), (value) => leftLegRotation.set(x, y, value))
                    } ]
            ]);
            let rightLegRotation = characterRig.originalObject.children[0].children[2].rotation;
            x = rightLegRotation.x;
            y = rightLegRotation.y;
            z = rightLegRotation.z;
            ui.push([
                [NumberSlider,
                    {
                        label: "rotate original RightLeg" + 'X',
                        value: rightLegRotation.x,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'x', (value) => addToX(0.00000000001 * value), (value) => rightLegRotation.set(value, y, z))
                    }],
                [NumberSlider,
                    {
                        label: "rotate original RightLeg" + 'Y',
                        value: rightLegRotation.y,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'y', (value) => addToX(0.00000000001 * value), (value) => rightLegRotation.set(x, value, z))
                    } ],
                [NumberSlider,
                    {
                        label: "rotate original RightLeg" + 'Z',
                        value: rightLegRotation.z,
                        min: -90,
                        max: 90,
                        onSetValue: createOnSetValueTarget(sceneObject.id, 'z', (value) => addToX(0.00000000001 * value), (value) => rightLegRotation.set(x, y, value))
                    } ]
            ]);
        //}
        return ui;
    }


    //shotMode(isEnable)
    //{
    //    let ragDoll = this.ragDoll;
    //    this.isShotMode = isEnable;
    //    let visible = isEnable ? false : true;
    //    let chainObjects = ragDoll.chainObjects;
    //    for (let i = 0; i < chainObjects.length; i++)
    //    {
    //        let chain = chainObjects[i];
    //        chain.controlTarget.target.visible = visible;
    //        chain.controlTarget.control.visible = visible;
//
    //        let constraints = ragDoll.poleConstraints[i];
    //        constraints.poleTarget.mesh.visible = visible;
    //    }
    //    ragDoll.hipsControlTarget.target.visible = visible;
    //    ragDoll.hipsControlTarget.control.visible = visible;
    //}

}
module.exports = RagDollUI;
