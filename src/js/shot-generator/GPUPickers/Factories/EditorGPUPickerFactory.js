const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const UniversalPickerObject = require("../PickersObjects/UniversalPickableObject");
const EditorPickableCharacter = require("../PickersObjects/EditorPickableCharacter");
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
        return new EditorPickableCharacter(object);
    }
}
module.exports = EditorGPUPickerFactory;
