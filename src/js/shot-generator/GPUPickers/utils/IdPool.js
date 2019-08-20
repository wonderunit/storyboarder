class IdPool
{
    constructor(poolSize)
    {
        this.avaibleIds = [];
        this.usedIds = {};
        this.startingPoint = 1;
        this.poolSize = poolSize + this.startingPoint;
        for(let i = this.startingPoint, n = this.poolSize; i <= n; i++)
        {
            this.avaibleIds.push(i);
        }
    }

    getAvaibleId()
    {
        if(this.avaibleIds.length === 0)
        {
            this.avaibleIds.push(++this.poolSize)
        }
        let id = this.avaibleIds.shift();
        this.usedIds[id] = id;
     
        return id;
    }

    returnId(id)
    {
        let usedId = this.usedIds[id]
        if(usedId)
        {
            this.avaibleIds.push(usedId);
            delete this.usedIds[id];
        }
    }

}
module.exports = IdPool;
