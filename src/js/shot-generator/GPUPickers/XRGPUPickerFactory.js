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

    createContainer(object)
    {
        return new XRPickableObjectContainer(object);
    }

    createGUI(object)
    {
        return new XRPickableGUI(object);
    }
}
module.exports = XRGPUPickerFactory;
