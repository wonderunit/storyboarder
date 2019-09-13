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

    createObject(object, excludingList)
    {
        return new UniversalPickerObject(object, excludingList);
    }

    createCharacter(object, excludingList)
    {
        return new UniversalPickableCharacter(object, excludingList);
    }

    //TODO(): don't pass idPool
    createContainer(object, idPool, excludingList)
    {
        return new XRPickableObjectContainer(object, idPool, excludingList);
    }
    
    //TODO(): don't pass idPool
    createGUI(object, idPool, excludingList)
    {
        return new XRPickableGUI(object, idPool, excludingList);
    }
}
module.exports = XRGPUPickerFactory;
