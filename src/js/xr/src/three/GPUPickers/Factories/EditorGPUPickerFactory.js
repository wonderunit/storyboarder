const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const UniversalPickerObject = require("../PickersObjects/UniversalPickableObject");
const UniversalPickableCharacter = require("../PickersObjects/UniversalPickableCharacter");
class EditorGPUPickerFactory extends AbstractGPUPickerFactory
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
}
module.exports = EditorGPUPickerFactory;
