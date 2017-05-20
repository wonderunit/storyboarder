/*

NOTE: theres an incorrect assumption with the angle and the cropping

To think about:
  Many shots are just closeup of hands doing things. I think its important to support this and as such, 
  there should be hand poses for these specific shots

  Need closup on feet or ability to set feet as the subject

  When a shot content type is OTS, should specify a very specific angles
    should limit the framing
    if wide enough, should frame both, otherwise should just frame subject

  Go through trailers and try to recreate every shot easily with a description. 
    Try to see where the system fails to do what is expected
    Try to identify missing parameters for the system



EXAMPLES FOR PARSER:
  medium single backlit
  wide single
  ultrawide long single
  long single
  medium ots left low
  close up two shot dead center birds eye
  extreme long shot single dead center low looking up frontlit in large room squatting
  ultra wide long shot left dynamic birdseye
  extreme close single right low looking down running night small room
  small room indian style light

STS TODO

  add decals and cool shit in the background


  hook up in params:
    head direction
    camera dynamic
    rotation
    background objects
      group
      boxes
    grid guides
    boxes instead of models
      boxes should have inner t thats thicker
    vertical composition
    content type:
      small
      medium
      large 
      extralarge box
    ability to set gender
    
  ots should have more specific angles
  fourshot type

  return specific settings
  clean up code

  overlay that says what kind of shot it is: 
    50mm lens
    3.2 meters
    4 feet off the ground
    angled down 15º
    left 32º

  -=-=-=-

  ui
  ability to type in shot settings
  drop downs OR mutliselects

-=-=-=-=

  fix textures
    remove grid decals (add later)

  NEED ASSETS:

    MALE WITH POSES
    FEMALE WITH POSES

    chair
    doorframe
    window
    plants
      small
      tall
    tree
    car
    table
// 1s dead center backlit ls eye
*/

const EventEmitter = require('events').EventEmitter

window.THREE = require('../vendor/three.min.js')
const JDLoader = require('../vendor/JDLoader.min.js')
const {MeshLine, MeshLineMaterial} = require('../vendor/THREE.Meshline.js')
const OutlineEffect = require('../vendor/effects/OutlineEffect.js')
const BufferSubdivisionModifier = require('../vendor/modifiers/BufferSubdivisionModifier.js')

const shotProperties = require('../shot-template-system/shot-properties.js')
const alternateValues = require('../shot-template-system/alternate-values.js')
const cameraLensAngles = require('../shot-template-system/camera-lens-angles.js')

const METERS_PER_FEET = 0.3048
const outlineWidth = 0.015

let backgroundScene
let contentScene
let gridScene

let effect
let camera
let tempGridCam

let renderer

let directionalLight

let manager 
let textures 
let dummyModels
let dummyGroup
let roomGroup 
let gridGroup

let mixer

let dimensions = [0,0]

let setup = (config) => {
  dimensions = [config.width, config.height]

  backgroundScene = new THREE.Scene()
  backgroundScene.background = new THREE.Color( 0xFFFFFF )
  backgroundScene.add(new THREE.AmbientLight(0x161616, 1))

  // create scene
  contentScene = new THREE.Scene()
  contentScene.add(new THREE.AmbientLight(0x161616, 1))

  gridScene = new THREE.Scene()
  gridScene.background = new THREE.Color( 0xFFFFFF )
  gridScene.add(new THREE.AmbientLight(0x111111, 1))


  // create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(config.width, config.height)
  renderer.autoClear = false
  //renderer.physicallyBasedShading = true
  // create effect system for renderer
  effect = new THREE.OutlineEffect(renderer)
  effect.setSize(config.width, config.height)
  effect.setViewport(0,0,config.width, config.height)

  manager = new THREE.LoadingManager()

  loadTextures()
  loadDummyModels()

  createGroundPlane()

  camera = new THREE.PerspectiveCamera(30, config.width / config.height, .01, 1000)
  camera.position.y = 1.3
  camera.position.z = 2
  camera.aspect = config.width / config.height
  camera.updateProjectionMatrix()
  
  contentScene.add(camera)
  backgroundScene.add(camera)
  
  tempGridCam = new THREE.PerspectiveCamera(30, config.width / config.height, .01, 1000)
  gridScene.add(tempGridCam)

  directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
  directionalLight.position.set(0, 1, 3);
  contentScene.add(directionalLight)
}

let loadTextures = () => {
  let imageLoader = new THREE.ImageLoader(manager)

  textures = {}

  textures.male = new THREE.Texture()
  imageLoader.load('data/sts/stdummy_male_texture.png', ( image ) => {
    textures.male.image = image
    textures.male.needsUpdate = true
  })

  textures.female = new THREE.Texture()
  imageLoader.load('data/sts/stdummy_female_texture.png', ( image ) => {
    textures.female.image = image
    textures.female.needsUpdate = true
  })

  textures.boxmodel = new THREE.Texture()
  imageLoader.load('data/sts/stdummy_boxmodel_texture.png', ( image ) => {
    textures.boxmodel.image = image
    textures.boxmodel.needsUpdate = true
  })

  textures.ground = new THREE.Texture()
  imageLoader.load('data/sts/grid_floor.png', ( image ) => {
    textures.ground.image = image
    textures.ground.needsUpdate = true
  })

  textures.wall = new THREE.Texture()
  imageLoader.load('data/sts/grid_wall.png', ( image ) => {
    textures.wall.image = image
    textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping
    textures.wall.offset.set( 0, 0 )
    textures.wall.repeat.set( 4.5, 4.5 )
    textures.wall.needsUpdate = true
  })
 
  textures.trigrid = new THREE.Texture()
  imageLoader.load('data/sts/grid_tri.png', ( image ) => {
    textures.trigrid.image = image
    textures.trigrid.needsUpdate = true
  })

  textures.gradientMap = new THREE.Texture()
  imageLoader.load('data/sts/gradient_map.png', ( image ) => {
    textures.gradientMap.image = image
    textures.gradientMap.needsUpdate = true
  })

  textures.decalGreatjob = new THREE.Texture()
  imageLoader.load('data/sts/decal_logo.png', ( image ) => {
    textures.decalGreatjob.image = image
    textures.decalGreatjob.needsUpdate = true
  })

  textures.volume = new THREE.Texture()
  imageLoader.load('data/sts/grid_volume.png', ( image ) => {
    textures.volume.image = image
    textures.volume.needsUpdate = true
  })
}

let loadDummyModels = () => {
  let loader = new THREE.JDLoader()
  
  dummyModels = {}

  loader.load("data/sts/stdummy_female.jd", (data) => {
    let material = new THREE.MeshToonMaterial({
      map: textures.female,
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      shading: THREE.SmoothShading,
    })
    material.outlineParameters = {
      thickness: .005,//outlineWidth,
      color: new THREE.Color( 0x0 ),
      alpha: 0.6,
      visible: true,
      keepAlive: true
    }
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.6256
      var scale = targetHeight / height
      mesh.scale.set(scale, scale, scale)
      mesh.updateMatrix()
      mesh.renderOrder = 1.0
      dummyModels.female = mesh
    }
  })

  loader.load("data/sts/stdummy_male.jd", (data) => {
    let material = new THREE.MeshToonMaterial({
      map: textures.male,
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      gradientMap: textures.gradientMap,
      shading: THREE.SmoothShading,
    })
    material.outlineParameters = {
      thickness: .005, //outlineWidth,
      color: new THREE.Color( 0x0 ),
      alpha: 0.6,
      visible: true,
      keepAlive: true
    }
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.8
      var scale = targetHeight / height
      mesh.scale.set(scale, scale, scale)
      mesh.updateMatrix()
      mesh.renderOrder = 1.0
      dummyModels.male = mesh
    }
  })

  loader.load("data/sts/stdummy_boxmodel.jd", (data) => {
    let material = new THREE.MeshToonMaterial({
      map: textures.boxmodel,
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      gradientMap: textures.gradientMap,
      shading: THREE.SmoothShading,
    })
    material.outlineParameters = {
      thickness: .025, //outlineWidth,
      color: new THREE.Color( 0x0 ),
      alpha: 0.6,
      visible: true,
      keepAlive: true
    }
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.7
      var scale = targetHeight / height
      mesh.scale.set(scale, scale, scale)
      mesh.updateMatrix()
      mesh.renderOrder = 1.0
      dummyModels.boxmodel = mesh
    }
  })

}


let createGroundPlane = () => {
  var geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
  var material = new THREE.MeshBasicMaterial( {map: textures.ground, side: THREE.FrontSide} )
  material.transparent = true
  material.blending = THREE.MultiplyBlending
  material.opacity = 1
  var plane = new THREE.Mesh( geometry, material )
  plane.renderOrder = 0.7
  plane.rotation.x = -Math.PI / 2
  backgroundScene.add(plane)
}

let createReferenceCube = () => {
  var geometry = new THREE.BoxGeometry( 1, 1, 1, 5, 5, 5 )
  var modifier = new THREE.BufferSubdivisionModifier( 2 )
  var smooth = modifier.modify( geometry )
  let material = new THREE.MeshToonMaterial({
    map: textures.trigrid,
    color: 0xffffff,
    emissive: 0x0,
    specular: 0x0,
    shininess: 0,
    gradientMap: textures.gradientMap,
    shading: THREE.SmoothShading,
  })
  material.outlineParameters = {
    thickness: outlineWidth,
    color: new THREE.Color( 0x0 ),
    alpha: 0.6,
    visible: true,
    keepAlive: true
  }

  var cube = new THREE.Mesh( smooth, material )
  cube.position.y = 0+(1/2);
  cube.position.x = 3.5;
  cube.position.z = -1;
  addToScene(cube)
}

let createLineCube = (subdivisions) => {
  let lineCube = new THREE.Group()

  let material = new MeshLineMaterial({
    useMap: false,
    color: new THREE.Color(0x0),
    opacity: 0.6,
    resolution: THREE.Vector2(100,dimensions[1]),
    lineWidth: 0.015,
    sizeAttenuation: false,
    near: 0.1,
    far: 1000,
    transparent: true,
    side: THREE.DoubleSide,
  })

  let material2 = new MeshLineMaterial({
    useMap: false,
    color: new THREE.Color(0x0),
    opacity: 0.4,
    resolution: THREE.Vector2(100,dimensions[1]),
    lineWidth: 0.01,
    sizeAttenuation: false,
    near: 0.1,
    far: 1000,
    transparent: true,
    side: THREE.DoubleSide,
  })

  let squareDef = [[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,0,0],[0,1,0],[1,1,0],[1,1,1],[0,1,1],[0,1,0]]
  let mesh = createLineMesh(squareDef, material)
  lineCube.add(mesh)

  mesh = createLineMesh([[0,0,1],[0,1,1]], material)
  lineCube.add(mesh)

  mesh = createLineMesh([[1,0,1],[1,1,1]], material)
  lineCube.add(mesh)

  mesh = createLineMesh([[1,0,0],[1,1,0]], material)
  lineCube.add(mesh)

  for (var i = 0; i < subdivisions; i++) {

    let val = (1+i)/(subdivisions+1)

    squareDef = [[0,val,0],[1,val,0],[1,val,1],[0,val,1],[0,val,0]]
    mesh = createLineMesh(squareDef, material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[val,0,1],[val,1,1]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[0,0,val],[0,1,val]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[val,0,0],[val,1,0]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[1,0,val],[1,1,val]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[val,0,val],[val,1,val]], material2)
    lineCube.add(mesh)

    // X
    mesh = createLineMesh([[0,0,val],[1,0,val]], material2)
    lineCube.add(mesh)
    mesh = createLineMesh([[val,0,0],[val,0,1]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[0,val,val],[1,val,val]], material2)
    lineCube.add(mesh)
    mesh = createLineMesh([[val,val,0],[val,val,1]], material2)
    lineCube.add(mesh)

    mesh = createLineMesh([[0,1,val],[1,1,val]], material2)
    lineCube.add(mesh)
    mesh = createLineMesh([[val,1,0],[val,1,1]], material2)
    lineCube.add(mesh)
  }

  return lineCube
}

let createLineMesh = (pointsArray, material) => {
  let geometry = new THREE.Geometry()
  for (var i = 0; i < pointsArray.length; i++) {
    var n = 2
    while (n--) {
      geometry.vertices.push( new THREE.Vector3( pointsArray[i][0], pointsArray[i][1], pointsArray[i][2] ) )
    }
  }
  geometry.translate(-.5, 0, -.5)
  let line = new MeshLine()
  line.setGeometry( geometry, function( p ) { return 1 } )
  let mesh = new THREE.Mesh( line.geometry, material )
  return mesh
}

function addToScene(obj) {
  contentScene.add(obj)
}

let render = () => {
  effect.clear()
  effect.render(backgroundScene, camera)
  renderer.clearDepth()

  dummyGroup.children.forEach( (param) => {
    console.log(param)
    param.material.outlineParameters.thickness = 0.013
    param.material.outlineParameters.alpha = 0.8
    param.material.outlineParameters.color = new THREE.Color( 0x333333 )
  })

  effect.render(contentScene, camera)
  renderer.clearDepth()
  dummyGroup.children.forEach( (param) => {
    console.log(param)
    param.material.outlineParameters.thickness = 0.007
    param.material.outlineParameters.alpha = 0.6
    param.material.outlineParameters.color = new THREE.Color( 0x0 )
  })
  effect.render(contentScene, camera)

  // //renderer.clearDepth()
  // renderer.clear()
  // renderer.render(gridScene, tempGridCam)

}

let buildSquareRoom = (w, l, h, layer) => {
  w = w * METERS_PER_FEET
  l = l * METERS_PER_FEET
  h = h * METERS_PER_FEET

  var hw = w / 2
  var hl = l / 2

  var scale = 13.2
  var shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(w / scale, 0)
  shape.lineTo(w / scale, l / scale)
  shape.lineTo(0, l / scale)
  shape.lineTo(0, 0)

  var extrudeSettings = {
    steps: 1,
    amount: h / scale,
    bevelEnabled: false,
    uvGenerator: BoundingUVGenerator,
  }

  var materialWall = new THREE.MeshBasicMaterial({map: textures.wall, side: THREE.FrontSide})
  materialWall.depthTest = false
    materialWall.transparent = true
  //materialWall.blending = THREE.MultiplyBlending
  materialWall.opacity = 0.1

  var materialCeil = new THREE.MeshBasicMaterial({map: textures.wall, side: THREE.FrontSide})
  materialCeil.depthTest = false
    materialCeil.transparent = true
  //materialWall.blending = THREE.MultiplyBlending
  materialCeil.opacity = 0.1



  var materialFloor = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    side: THREE.BackSide,
    opacity: 0})

  var materials = [materialCeil, materialWall, materialFloor]

  var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  var material = new THREE.MultiMaterial(materials)
  var mesh = new THREE.Mesh(geometry, material)
  //mesh.layers.set(layer)
  mesh.rotation.x = Math.PI / 2

  for (var face in mesh.geometry.faces) {
    if (mesh.geometry.faces[face].normal.z === -1) {
      mesh.geometry.faces[face].materialIndex = 2
    }
  }

  var mS = (new THREE.Matrix4()).identity()
  mS.elements[0] = -1
  mS.elements[5] = -1
  mS.elements[10] = -1
  geometry.applyMatrix(mS)

  mesh.scale.set(scale, scale, scale)
  mesh.position.set(hw, 0, hl)

  mesh.geometry.verticesNeedUpdate = true
  mesh.geometry.normalsNeedUpdate = true
  mesh.geometry.uvsNeedUpdate = true
  mesh.geometry.buffersNeedUpdate = true
  mesh.geometry.computeBoundingSphere()
  mesh.geometry.computeFaceNormals()
  mesh.geometry.computeVertexNormals()

  mesh.renderOrder = 1.0

  var room = new THREE.Group()
  room.add(mesh)

  let cube = createLineCube(0)
  cube.scale.set(w,h,l)
  room.add(cube)




  return room
}

let BoundingUVGenerator = {
    generateTopUV: function( geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
        var ax = geometry.vertices[ indexA ].x,
            ay = geometry.vertices[ indexA ].y,

            bx = geometry.vertices[ indexB ].x,
            by = geometry.vertices[ indexB ].y,

            cx = geometry.vertices[ indexC ].x,
            cy = geometry.vertices[ indexC ].y,

            bb = extrudedShape.getBoundingBox(),
            bbx = bb.maxX - bb.minX,
            bby = bb.maxY - bb.minY;

        return [
            new THREE.UV( ( ax - bb.minX ) / bbx, 1 - ( ay - bb.minY ) / bby ),
            new THREE.UV( ( bx - bb.minX ) / bbx, 1 - ( by - bb.minY ) / bby ),
            new THREE.UV( ( cx - bb.minX ) / bbx, 1 - ( cy - bb.minY ) / bby )
        ];
    },

    generateBottomUV: function( geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
        return this.generateTopUV( geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC );
    },

    generateSideWallUV: function( geometry, extrudedShape, wallContour, extrudeOptions,
                                  indexA, indexB, indexC, indexD, stepIndex, stepsLength,
                                  contourIndex1, contourIndex2 ) {
        var ax = geometry.vertices[ indexA ].x,
            ay = geometry.vertices[ indexA ].y,
            az = geometry.vertices[ indexA ].z,

            bx = geometry.vertices[ indexB ].x,
            by = geometry.vertices[ indexB ].y,
            bz = geometry.vertices[ indexB ].z,

            cx = geometry.vertices[ indexC ].x,
            cy = geometry.vertices[ indexC ].y,
            cz = geometry.vertices[ indexC ].z,

            dx = geometry.vertices[ indexD ].x,
            dy = geometry.vertices[ indexD ].y,
            dz = geometry.vertices[ indexD ].z;

        var amt = extrudeOptions.amount,
            bb = extrudedShape.getBoundingBox(),
            bbx = bb.maxX - bb.minX,
            bby = bb.maxY - bb.minY;

        if ( Math.abs( ay - by ) < 0.01 ) {
            return [
                new THREE.UV( ax / bbx, az / amt),
                new THREE.UV( bx / bbx, bz / amt),
                new THREE.UV( cx / bbx, cz / amt),
                new THREE.UV( dx / bbx, dz / amt)
            ];
        } else {
            return [
                new THREE.UV( ay / bby, az / amt ),
                new THREE.UV( by / bby, bz / amt ),
                new THREE.UV( cy / bby, cz / amt ),
                new THREE.UV( dy / bby, dz / amt )
            ];
        }
    }
}




let setupContent = (params) => {

  // BACKGROUND
  directionalLight.color = new THREE.Color( 0xFFFFFF )
  directionalLight.intensity = 1
  switch (params.background) {
    case "light":
      backgroundScene.background = new THREE.Color( 0xffffff )
      break
    case "dim":
      backgroundScene.background = new THREE.Color( 0x666666 )
      break
    case "dark":
      backgroundScene.background = new THREE.Color( 0x333333 )
      break
    case "night":
      backgroundScene.background = new THREE.Color( 0x111111 )
      break
    case "fire":
      backgroundScene.background = new THREE.Color( 0xffba00 )
      directionalLight.color = new THREE.Color( 0xffc000 )
      break
  }

  // LIGHTING DIRECTION
  switch (params.lightDirection) {
    case "abovelit":
      directionalLight.position.set(0, 1, 1)
      break
    case "frontlit":
      directionalLight.position.set(0, 1, 4)
      break
    case "frontleftlit":
      directionalLight.position.set(-4, 1, 4)
      break
    case "frontrightlit":
      directionalLight.position.set(4, 1, 4)
      break
    case "backlit":
      directionalLight.position.set(0, 8, -6)
      break
    case "backleftlit":
      directionalLight.position.set(-4, 8, -6)
      break
    case "backrightlit":
      directionalLight.position.set(4, 8, -6)
      break
    case "underlit":
      directionalLight.position.set(0, -2, 1)
      break
    case "silhouette":
      directionalLight.position.set(0, -2, 1)
      directionalLight.color = new THREE.Color( 0x0 )
      directionalLight.intensity = 0
      break
  }

  // ROOM SETUP
  backgroundScene.remove(roomGroup)
  roomGroup = new THREE.Group()
  switch (params.roomSize) {
    case "smallRoom":
      roomGroup.add(buildSquareRoom(12, 10, 8, 1))
      break
    case "mediumRoom":
      roomGroup.add(buildSquareRoom(20, 20, 8, 1))
      break
    case "largeRoom":
      roomGroup.add(buildSquareRoom(40, 40, 20, 1))
      break
    case "extraLargeRoom":
      roomGroup.add(buildSquareRoom(80, 80, 20, 1))
      break
    case "auditorium":
      roomGroup.add(buildSquareRoom(250, 250, 40, 1))
      break
    case "outside":
      break
  }
  backgroundScene.add(roomGroup)

  // ADD STUFF TO ROOM!!!
  // createReferenceCube()

  // SET UP DUMMIES
  contentScene.remove(dummyGroup)
  dummyGroup = new THREE.Group()

  let mainCharacter

  switch (params.model) {
    case "male":
      mainCharacter = dummyModels.male.clone()
      break
    case "female":
      mainCharacter = dummyModels.female.clone()
      break
    case "boxmodel":
      mainCharacter = dummyModels.boxmodel.clone()
      break
  }    

  switch (params.content) {
    case "oneShot":
      dummyGroup.add(mainCharacter)
      break
    case "twoShot":
      dummyGroup.add(mainCharacter)
      mainCharacter.rotation.set(0, Math.random()*.6,0)
      mainCharacter.translateX(-.75)
      var newPerson2 = mainCharacter.clone()
      newPerson2.rotation.set(0, -Math.random()*.6,0)
      newPerson2.translateX(.75)
      dummyGroup.add(newPerson2)
      break
    case "threeShot":
      mainCharacter.position.set(0,0,-Math.random()*.6)
      dummyGroup.add(mainCharacter)

      var newPerson2 = mainCharacter.clone()
      newPerson2.rotation.set(0, Math.random()*1,0)
      newPerson2.position.set(-(.45+Math.random()*.5),0,Math.random()*.6)
      dummyGroup.add(newPerson2)

      var newPerson3 = mainCharacter.clone()
      newPerson3.rotation.set(0, -Math.random()*1,0)
      newPerson3.position.set((.45+Math.random()*.5),0,Math.random()*.6)
      dummyGroup.add(newPerson3)
      break
    case "groupShot":
      dummyGroup.add(mainCharacter)
      let numPeople = Math.round(Math.random()*30+6)
      for (var i = 0; i < numPeople; i++) {
        var newPerson = mainCharacter.clone()
        newPerson.translateX(Math.random()*10-5)
        newPerson.translateZ(-Math.random()*10)
        newPerson.rotateY(Math.random()*1.5-(1.5/2))
        dummyGroup.add(newPerson)
      }
      break
    case "ots":
      mainCharacter.translateZ(-1)
      dummyGroup.add(mainCharacter)
      var newPerson2 = mainCharacter.clone()
      newPerson2.translateZ(1)
      newPerson2.rotateY(Math.PI)
      dummyGroup.add(newPerson2)
      break
  }

  // spit out poses
  // for (var i = 0; i < mainCharacter.geometry.animations.length; i++) {
  //   console.log(mainCharacter.geometry.animations[i])
  // }


  // POSE MAIN CHARACTER
  var mixer1 = new THREE.AnimationMixer( mainCharacter )
  var action
  if (params.pose) {
    action = mixer1.clipAction(params.pose, mainCharacter)
  } else {
    action = mixer1.clipAction('stand', mainCharacter)
  }

  // action = mixer1.clipAction('on_bicycle', mainCharacter)
  // console.log(action)

  action.clampWhenFinished = true
  action.setLoop(THREE.LoopOnce)
  action.play()
  mixer1.update(10)

  // HEAD DIRECTION
  var direction = [0,-.3,Math.random()*.1 - .05]
  switch (params.headDirection) {
    case "headFront":
      direction = [0,-.3,Math.random()*.3 - .15]
      break
    case "headUp":
      direction = [0,-(.7+Math.random()*.3),Math.random()*.3 - .15]
      break
    case "headDown":
      direction = [0,.2,Math.random()*.3 - .15]
      break
    case "headLeft":
      direction = [-.8,-.3,- (Math.random()*.6-.3)]
      break
    case "headRight":
      direction = [.8,-.3,Math.random()*.6-.3]
      break
  }


  let headBoneIndex

  let bones = mainCharacter.skeleton.bones
  for (var i = 0; i < bones.length; i++) {
    let boneName = bones[i].name.split("_")
    boneName = boneName[boneName.length-1]
    if (boneName == "Head") {
      headBoneIndex = i
      break
    }
  }




  mainCharacter.skeleton.bones[headBoneIndex].rotation.set( direction[0], direction[1], direction[2], 'XYZ' )


    // //console.log(newPerson.skeleton.bones[56].lookAt(new THREE.Vector3(10,0,10)))
    //   //var euler = new THREE.Euler( 1, 0, 0, 'XYZ' );

    //   newPerson.skeleton.bones[55].rotation.set( 1, -.3, -.1, 'XYZ' )


    //   //newPerson.rotation.set(0,Math.PI,0)

    //   console.log(newPerson.skeleton.bones[56].rotation)




  //camera.updateProjectionMatrix()

  // let cube = createLineCube(1)
  // cube.scale.set(1,1.8,1)
  // dummyGroup.add(cube)


  contentScene.add(dummyGroup)



  gridScene.remove(gridGroup)
  gridGroup = new THREE.Group()


  tempGridCam.position.y = Math.random() * .4+.4
  tempGridCam.position.z = Math.random() * .4+.4
  tempGridCam.position.x = Math.random() * .4+.4
   tempGridCam.rotation.x = Math.random() * .4
   tempGridCam.rotation.y = Math.random() * 2



  // DRAW GRID
  let material = new THREE.MeshBasicMaterial({
    map: textures.volume,
    transparent: true,
    opacity: .3,
    belnding: THREE.MultiplyBlending,
    side: THREE.DoubleSide
  })
  //material.depthFunc = THREE.LessEqualDepth
  material.depthWrite = false
  material.premultipliedAlpha = true
  textures.volume.wrapS = THREE.RepeatWrapping;
  textures.volume.wrapT = THREE.RepeatWrapping;

  let scale = 1

  textures.volume.repeat.set(100*scale, 100*scale)
  // material.transparent = true
  // material.blending = THREE.MultiplyBlending
  // material.opacity = 1

  console.log(material)
  var geometry = new THREE.PlaneGeometry( 100, 100, 32 );
  //var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
  
  for (var i = -100; i < 100; i++) {
    material.opacity = Math.random() * 1
    var plane = new THREE.Mesh( geometry, material );
    plane.translateZ((i*(1/scale)))
    gridGroup.add( plane )
  }

  for (var i = -100; i < 100; i++) {
    var plane = new THREE.Mesh( geometry, material );
    plane.rotation.y = -Math.PI / 2
    plane.translateZ((i*(1/scale)))
    gridGroup.add( plane )
  }


  gridScene.add(gridGroup)
  console.log(gridScene)
}


let setupFov = (param) => {
  // https://en.wikipedia.org/wiki/Angle_of_view

  let fov
  let lenses
  let lens

  switch (param) {
    case 'ultraWide':
      lenses = [12,14,16,20]
      lens = lenses[Math.floor(Math.random()*lenses.length)]
      fov = cameraLensAngles[lens]
      break
    case 'wide':
      //24-35
      lenses = [24,35]
      lens = lenses[Math.floor(Math.random()*lenses.length)]
      fov = cameraLensAngles[lens]
      break
    case 'medium':
      //50-85
      lenses = [50,70,85]
      lens = lenses[Math.floor(Math.random()*lenses.length)]
      fov = cameraLensAngles[lens]
      break
    case 'long':
      //105-200
      lenses = [105,200]
      lens = lenses[Math.floor(Math.random()*lenses.length)]
      fov = cameraLensAngles[lens]
      break
  }
  camera.fov = fov
  camera.updateProjectionMatrix()
}

let setupShotType = (params) => {
  // var hFOV = 2 * Math.atan( Math.tan( vFOV / 2 ) * aspect );


  contentScene.updateMatrixWorld()


  let topmostPoint = 0
  let bottommostPoint = 9999
  let zPos = 0
  let xPos = 0

  let requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf", "Toe0Nub"]
  requiredBones = ["Head", "HeadNub"]


    // ECU: {
    //   weight: 10
    // },
    // VCU: {
    //   weight: 10
    // },
    // CU: {
    //   weight: 10
    // },
    // MCU: {
    //   weight: 10
    // },
    // Bust: {
    //   weight: 10
    // },
    // MS: {
    //   weight: 80
    // },
    // MLS: {
    //   weight: 10
    // },
    // LS: {
    //   weight: 10
    // },
    // ELS: {
    //   weight: 10
    // }

  let distAdd = 0
  let distMult = 1
  let vertAdjust = true
  let cameraVerticalCenter = false

  switch (params.shotType) {
    case 'ecu':
      requiredBones = ["Head", "HeadNub"]
      distMult = 0.4
      break
    case 'vcu':
      requiredBones = ["Head", "HeadNub"]
      distMult = 0.8
      break
    case 'cu':
      requiredBones = ["Head", "HeadNub", "Neck"]
      break
    case 'mcu':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2"]
      break
    case 'bust':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1"]
      break
    case 'ms':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine"]
      break
    case 'mls':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf"]
      break
    case 'ls':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf", "Toe0Nub"]
      distAdd = Math.round(Math.random()*5)
      cameraVerticalCenter = true
      vertAdjust = false
      break
    case 'els':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf", "Toe0Nub"]
      distAdd = 5+Math.round(Math.random()*30)
      cameraVerticalCenter = true
      vertAdjust = false
      break
  }


  // loop through bones and set if a requested bone
  let bones = dummyGroup.children[0].skeleton.bones
  for (var i = 0; i < bones.length; i++) {
    let boneName = bones[i].name.split("_")
    boneName = boneName[boneName.length-1]
    if (requiredBones.indexOf(boneName) !== -1) {
      topmostPoint = Math.max(topmostPoint, bones[i].getWorldPosition().y)
      bottommostPoint = Math.min(bottommostPoint, bones[i].getWorldPosition().y)
    }
    if (boneName == "HeadNub") {
      topmostPoint = Math.max(topmostPoint, bones[i].getWorldPosition().y+0.1)
      zPos = bones[i].getWorldPosition().z + 0.1
      xPos = bones[i].getWorldPosition().x
    }
  }

  let dist = (topmostPoint-bottommostPoint) / ( 2 * Math.tan( camera.fov * Math.PI / 360 ) );
  dist = (dist + distAdd)*distMult


  if (cameraVerticalCenter) {
    camera.position.set(xPos,bottommostPoint+((topmostPoint-bottommostPoint)/2),zPos)
  } else {
    camera.position.set(xPos,topmostPoint-0.19,zPos)
  }

  camera.rotation.set(0,0,0)

  console.log(params.horizontalAngle)
  switch (params.horizontalAngle) {
    case 'left':
      camera.rotateY(-Math.random()*(Math.PI/3)-.2)
      break
    case 'center':
      camera.rotateY(Math.random()*0.3-(0.3/2))
      break
    case 'deadCenter':
      camera.rotateY(0)
      break
    case 'right':
      camera.rotateY(Math.random()*(Math.PI/3)+.2)
      break
  }


    // birdsEye: {
    //   weight: 1
    // },
    // high: {
    //   weight: 3
    // },
    // eye: {
    //   weight: 10
    // },
    // low: {
    //   weight: 5
    // },
    // wormsEye: {
    //   weight: 2
    // }



  console.log(params.verticalAngle)
  switch (params.verticalAngle) {
    case 'birdsEye':
      var angle = Math.random()*40+40
      camera.rotateX(-angle*(Math.PI / 180))
      break
    case 'high':
      var angle = Math.random()*30+5
      camera.rotateX(-angle*(Math.PI / 180))
      break
    case 'eye':
      var angle = Math.random()*10-10
      camera.rotateX(angle*(Math.PI / 180))
      break
    case 'low':
      var angle = Math.random()*30+5
      camera.rotateX(angle*(Math.PI / 180))
      break
    case 'wormsEye':
      var angle = Math.random()*40+40
      camera.rotateX(angle*(Math.PI / 180))
      break
  }

  //
  //camera.rotateX(Math.PI/7)
  

  camera.translateZ(dist)

  if (camera.position.y < 0) {
    camera.position.set(camera.position.x, Math.max(camera.position.y, 0.1), camera.position.z)
    camera.lookAt(new THREE.Vector3(xPos,topmostPoint-0.16,zPos))    
  }


  
  if (vertAdjust) {
    camera.rotateX(-(camera.fov * Math.PI / 180/4))
  }
  let hFOV = 2 * Math.atan( Math.tan( camera.fov * Math.PI / 180 / 2 ) * (2500/900) )
  console.log(hFOV)
  

//  camera.updateMatrixWorld()
  //camera.geometry.applyMatrix(camera.matrixWorld)

  console.log(params.horizontalComposition)
  switch (params.horizontalComposition) {
    case 'auto':

      switch (params.horizontalAngle) {
        case 'left':
          //camera.rotateY(-hFOV/5)
          //console.log(camera)

          var q = new THREE.Quaternion(); // create once and reuse
          q.setFromAxisAngle( new THREE.Vector3(0,1,0), -hFOV/5 ); // axis must be normalized, angle in radians
          camera.quaternion.premultiply( q );


          //camera.rotateOnAxis(camera.rotation,-hFOV/5);
          break
        case 'center':
          let randomCase = (Math.floor(Math.random()*3))
          switch (randomCase) {
            case 0:
              camera.rotateY(-hFOV/5)
              break
            case 1: 
              camera.rotateY(hFOV/5)
              break
          }

          break
        case 'deadCenter':
          camera.rotateY(0)
          break
        case 'right':
          camera.rotateY(hFOV/5)
          break
      }
      break
    case 'firstThird':
      camera.rotateY(-hFOV/5)
      break;
    case 'lastThird':
      camera.rotateY(hFOV/5)
      break;
  }


  //camera.rotateY(hFOV/5)

  // for (var i = 0; i < bones.length; i++) {
  //   console.log(bones[i].name)
  // }
}





let parseShotText = (text) => {
  let parsedShotParams = {}
  text = text.toLowerCase()
  while (text.length > 0) {
    let parameter = ['','', '']
    for (var prop in shotProperties) {
      for (var value in shotProperties[prop]) {
        let possibilities = []
        possibilities.push(value.toLowerCase())
        possibilities.push(value.replace(/([A-Z])/g, function($1){return " "+$1.toLowerCase()}))
        possibilities = possibilities.concat(alternateValues[value])
        for (var i = 0; i < possibilities.length; i++) {
          if (text.indexOf(possibilities[i]) == 0) {
            if (parameter[1].length < possibilities[i].length) {
              parameter[0] = prop
              parameter[1] = possibilities[i]
              parameter[2] = value
            }
          }
        }
      }
    }
    for (var i2 = 0; i2 < dummyModels.male.geometry.animations.length; i2++) {
      var value = dummyModels.male.geometry.animations[i2].name
      let possibilities = []
      possibilities.push(value.split('_').join('').toLowerCase())
      possibilities.push(value.split('_').join(' ').toLowerCase())
      possibilities = possibilities.concat(alternateValues[value])
      for (var i = 0; i < possibilities.length; i++) {
        if (text.indexOf(possibilities[i]) == 0) {
          if (parameter[1].length < possibilities[i].length) {
            parameter[0] = 'pose'
            parameter[1] = possibilities[i]
            parameter[2] = value
          }
        }
      }
    }
    if (parameter[0] !== '') {
      parsedShotParams[parameter[0]] = parameter[2]
      text = text.substring(parameter[1].length).trim()
    } else {
      if (text.indexOf(' ') == -1) {
        text = ''
      } else {
        text = text.substring(text.indexOf(' ')).trim()
      }
    }
  }
  return parsedShotParams
}

let getTextString = (params) => {
  string = []
  Object.getOwnPropertyNames(params).forEach( (param) => {
    if (alternateValues[params[param]]) {
      string.push(alternateValues[params[param]][0]) 
    } else {
      string.push(params[param].replace(/([A-Z])/g, function($1){return " "+$1.toLowerCase()})) 
    }
  })
  return string.join(', ')
}

////////////////////////////////////////////////////
// ShotTemplateSystem
////////////////////////////////////////////////////

class ShotTemplateSystem extends EventEmitter {
  constructor (config) {
    super()

    this.ready = false
    this.definedShotParams = {}
    this.shotParams = {}

    setup(config)
  }

  parseParamsText (string) {
    return parseShotText(string)
  }

  setDefinedShotParams (shotParams) {
    this.definedShotParams = {}
    if (shotParams) {
      for (let param in shotParams) {
        this.definedShotParams[param] = shotParams[param]
      }
    }
  }

  requestShot (shotParams, imgOpts) {
    if (shotParams) {
      this.setDefinedShotParams(shotParams)
    }
    this.createShotParams()
    
    setupContent(this.shotParams)
    setupFov(this.shotParams.fov)
    setupShotType(this.shotParams)

    render()
    if (imgOpts) {
      return {image: renderer.domElement.toDataURL(imgOpts), shotParams: this.shotParams}
    } else {
      return {image: renderer.domElement.toDataURL(), shotParams: this.shotParams}
    }
  }
 
  saveImagesToDisk (count) {
    let shot
    for (var i = 0; i < count; i++) {
      shot = this.requestShot({}, {format: 'image/jpeg', quality: 0.4})
      shot.image = shot.image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "")
      //require("fs").writeFileSync("/Users/setpixel/Desktop/images/img" + i + ".jpg", shot.image, 'base64')

      // require("fs").writeFileSync("~/Desktop/images/img" + i + ".jpg", shot.image, 'base64', function(err) {
      //   console.log(err)
      // })
      console.log("writing to disk: " + i)
    }
  }

  getParamSelects (shotParams) {
    let baseParams = ['content', 'shotType', 'horizontalAngle', 'verticalAngle', 'roomSize']
    let selectOptions = {}

    // this is janky here.. shouldnt be setting selected
    for (let param in shotProperties) {
      for (let value in shotProperties[param]) {
        shotProperties[param][value].selected = false
      }
    }

    for (let param in shotParams) {
      selectOptions[param] = shotProperties[param]
      if (selectOptions[param][shotParams[param]]) {

        selectOptions[param][shotParams[param]].selected = true
      }
    }

    for (var i = 0; i < baseParams.length; i++) {
      selectOptions[baseParams[i]] = shotProperties[baseParams[i]]
    }

    let html = []

    Object.getOwnPropertyNames(selectOptions).forEach( (param) => {

      // is a param selected?
      let isSelected = false
      for (let vals in selectOptions[param]) {
        //console.log(selectOptions[param][vals])
        if (selectOptions[param][vals].selected) {
          isSelected = true
          break
        } 
      }
      if (isSelected) {
        html.push('<select class="picked" id="' + param + '">')
      } else {
        html.push('<select id="' + param + '">')
      }

      let paramText = param.replace(/([A-Z])/g, function($1){return " "+$1.toLowerCase()})
      paramText = paramText[0].toUpperCase() + paramText.substring(1)

      html.push('<option selected value="">' + paramText + '</option>')
      html.push('<option disabled>————</option>')
      let paramObj = selectOptions[param]
      Object.getOwnPropertyNames(selectOptions[param]).forEach( (param) => {
        let paramText = param.replace(/([A-Z])/g, function($1){return " "+$1.toLowerCase()}).split('_').join(' ')
        paramText = paramText[0].toUpperCase() + paramText.substring(1)

        if (paramObj[param].selected) {
          html.push('<option selected value="' + param + '">')
        } else {
          html.push('<option value="' + param + '">')
        }

        if (paramObj[param].caption) {
          html.push(paramObj[param].caption)
        } else {
          html.push(paramText)
        }
        html.push('</option>')

      })

      html.push('</select>')

    })
    
    return html.join('')
  }

  getTextString (params) {
    return getTextString(params)
  }

  createShotParams() {
    this.shotParams = this.definedShotParams
    for (let property in shotProperties) {
      if (this.definedShotParams[property]) {
        this.shotParams[property] = this.definedShotParams[property]
      } else {
        this.shotParams[property] = this.chooseRandomValue(shotProperties[property])
      }
    }
  }

  rand (min, max) {
    return Math.random() * (max - min) + min
  }

  chooseRandomValue (values) {
    let totalWeight = 0
    for (let value in values) {
      totalWeight += values[value].weight
    }
    let randomNum = this.rand(0, totalWeight)
    let weightSum = 0
    for (let value in values) {
      weightSum += values[value].weight
      weightSum = +weightSum.toFixed(2)
      if (randomNum <= weightSum) {
        return value
      }
    }
  }

}

module.exports = ShotTemplateSystem