const AbstractGPUPickerFactory = require("./AbstractGPUPickerFactory");
const PickerObject = require("./PickersContainers/UPickerObject");
const EditorPickableCharacter = require("./PickersContainers/EditorPickableCharacter");
class EditorGPUPickerFactory extends AbstractGPUPickerFactory
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
        return new EditorPickableCharacter(object);
    }
}
module.exports = EditorGPUPickerFactory;
