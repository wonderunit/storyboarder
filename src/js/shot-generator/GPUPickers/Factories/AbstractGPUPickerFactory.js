class AbstractGPUPickerFactory
{
    constructor()
    {
        if(new.target === AbstractGPUPickerFactory)
        {
            throw new TypeError("Cannot construct abstract Pickable directly");
        }

        if(this.createObject === undefined)
        {
            throw new TypeError("Must override method createObject(object)");
        }

        if(this.createCharacter === undefined)
        {
            throw new TypeError("Must override method createCharacter(object)");
        }
    }

}
module.exports = AbstractGPUPickerFactory;
