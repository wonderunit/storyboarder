const TargetControl = require("../objects/TargetControl");
module.exports.AddTransformationControl =  function AddTransformationControl(position, camera, domElement, scene, name)
{
  let targetControl = new TargetControl(camera, domElement, name);
  targetControl.initialize(position, scene);
  return targetControl;
}
