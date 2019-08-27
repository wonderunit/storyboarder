const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const UniversalPickerObject = require("../PickersObjects/UniversalPickableObject");
const UniversalPickableCharacter = require("../PickersObjects/UniversalPickableCharacter");
const XRPickableObjectContainer = require("../PickersObjects/XRPickableObjectContainer");
const XRPickableGUI = require("../PickersObjects/XRPickableGUI");
class XRGPUPickerFactory extends AbstractGPUPickerFactory
{
    constructor()
    {
        super();
    }

    createObject(object)
    {
        return new UniversalPickerObject(object);
    }

    createCharacter(object)
    {
        return new UniversalPickableCharacter(object);
    }

    //TODO(): don't pass idPool
    createContainer(object, idPool)
    {
        return new XRPickableObjectContainer(object, idPool);
    }
    //TODO(): don't pass idPool
    createGUI(object, idPool)
    {
        return new XRPickableGUI(object, idPool);
    }
}
module.exports = XRGPUPickerFactory;
