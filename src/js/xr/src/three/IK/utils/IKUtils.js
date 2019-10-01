const TargetControl = require("../objects/XrTargetControl");
const ControlTargetSelection = require( "../../../../../shot-generator/IK/objects/ControlTargetSelection");

function AddTransformationControl(position, camera, domElement, scene, name)
{
  let targetControl = new TargetControl(camera, domElement, name);
  targetControl.initialize(position);
  return targetControl;
}

module.exports.createTransformationControls = function createTransformationControls(camera, domElement, scene)
{
  let controls = [];
  let controlsName = ["hips", "back", "leftHand", "rightHand", "leftLeg", "rightLeg"];
  for(let i = 0; i < 6; i++)
  {
    controls.push(AddTransformationControl(new THREE.Vector3(0, 0, 0), camera, domElement, scene, controlsName[i]));
  }
  let controlTargetSelection = new ControlTargetSelection(domElement, scene, camera, controls);
  return {controls: controls, controlTargetSelection: controlTargetSelection };
}