const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const UniversalPickerObject = require("./PickersContainers/UniversalPickableObject");
const EditorPickableCharacter = require("./PickersContainers/EditorPickableCharacter");
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
