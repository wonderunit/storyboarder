/**
 * goal:
 *
  const material = new Material({map:wood})
  const table = new MeshCombined(
    [ 
      Mesh(legGeom,material ), 
      Mesh(legGeom,material ), 
      Mesh(legGeom,material ), 
      Mesh(legGeom,material ), 
      Mesh(boardGeom,material)
    ], 
    mergeOrInstance //either merges everything together, or returns an autoinstanced mesh of legs, and regular mesh board
)

//Then the wrapper would have to be computed when the geometries are there. 

*/

class MeshCombined extends Group{
  constructor(meshes, merge){
    super()
    
    this._ready = false

    this._meshes = meshes 

    this._merge = merge

    this.init()

  }

  canAnalyze(){
    //test somehow that the geometries are there?
    //should also include materials?
    return this._meshes.reduce((acc,val)=> acc && val.geometry , true)
  }

  init(){

    if(this._ready || !this.canAnalyze) return false


    const res = []

    if(!this._merge){
      
      const byGeometry = {}
      const byMaterial = {}

      this._meshes.forEach( mesh=>{

        const geomKey = mesh.geometry.uuid
        if(!byGeometry[ geomKey ]){
          byGeometry[ geomKey ] = []
        }

        byGeometry[ geomKey ].push(mesh) // leg: [m1,m2,m3,m4] board: [m5]

      })


      Object.keys(byGeometry).forEach( geomKey=>{
        
        //go through groups, this is for sure going to create different instances
        const group = byGeometry[geomKey]
        const geometry = group[0].geometry

        if( group.length === 1 ){
          res.push(group[0]) // Mesh(boardGeom)
          return 
        }
        const materialMap = {}

        group.forEach( mesh=>{
          const materialKey = this._getMaterialKey( mesh )

          if( !materialMap[ materialKey ] ){
            materialMap[ materialKey ] = []
          }

          materialMap[ materialKey ].push( mesh )

        })

        Object.keys( materialMap ).forEach( materialKey =>{
          const materialGroup = materialMap[materialKey]
          const material = materialGroup[0].material
          const numInstances = materialGroup.length

          const instance = new THREE.InstancedMesh(geometry,material,numInstances)
          res.push(instance) 

          materialGroup.forEach( (mesh,i)=>{
            instance.setQuaternionAt(i,mesh.quaternion)
            instance.setPositionAt(i,mesh.position)
            instance.setScaleAt(i,mesh.scale)
          })
          instance.needsUpdate()
        })

      })

      //Mesh['board'],InstanceMesh[mleg,mleg,mleg,mleg]

    } else {

      const byMaterial = {}

      this._meshes.forEach( mesh =>{
        const matKey = this._getMaterialKey(mesh)
        if(byMaterial[matKey]) byMaterial[matKey] = []

        byMaterial[matKey].push(mesh)

      })

      Object.keys(byMaterial).forEach(matKey=>{
        const group = byMaterial[matKey]

        const geometry = new THREE.BufferGeometry()

        group.forEach( mesh=> geometry.merge( mesh.geometry ) )

        res.push( new THREE.Mesh( geometry, byMaterial[matKey][0].material))
      })


      //Mesh['board','leg','leg','leg','leg']
    }

    res.forEach( obj=> this.add(obj) ) 

    return true

  }

  _getMaterialKey = (mesh)=>{

    //should do some kind of complex check to compare types
    //and maps, if the maps are different should not batch
    return mesh.material.uuid
  }

}

