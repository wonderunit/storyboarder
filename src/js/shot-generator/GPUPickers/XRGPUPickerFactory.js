const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const PickerObject = require("./PickersContainers/UPickerObject")
class XRGPUPickerFactory extends AbstractGPUPickerFactory
{
    constructor()
    {
        super();
    }

    createObject(object)
    {
        return new PickerObject(object);
    }

    createCharacter(object)
    {

    }
}
module.exports = XRGPUPickerFactory;
