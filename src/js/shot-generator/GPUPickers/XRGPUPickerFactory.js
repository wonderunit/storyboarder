const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const UniversalPickerObject = require("./PickersContainers/UniversalPickableObject");
const XRPickableCharacter = require("./PickersContainers/XRPickableCharacter");
const XRPickableObjectContainer = require("./PickersContainers/XRPickableObjectContainer");
const XRPickableGUI = require("./PickersContainers/XRPickableGUI");
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
        return new XRPickableCharacter(object);
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
