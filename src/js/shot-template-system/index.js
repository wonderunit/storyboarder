/*

  set up scene 
    with aspect ratio
    load models and textures

  setup each parameter:

    fov

    shot type
    content
    composition
    horizontalAngle
    verticalAngle
    headDirection
    roomSize

load rigged body
ability to focus on bones



STS TODO

  get room drawing working
  separate ground plane
    renderer.clear();
    renderer.render( scene, camera );
    renderer.clearDepth();
    renderer.render( scene2, camera );
  implement a pose system and poses
  character rotation setting
  lighting setting
  draw boxes instead of models setting // https://github.com/spite/THREE.MeshLine
  grid guides 
  blobs
  people or boxes at distances
  vertical composition
  head lookat
  content type:
    small
    medium
    large 
    extralarge box
  ots should have more specific angles
  fourshot type?
  ability to set gender
  make sure aspect ratio set dynamically
  return specific settings
  clean up code

  -==-=-=-

  fix line weights
  fix textures
  remove grid decals (add later)
  make grid transparent or multiply

  -=-=-=-

  ui
  ability to type in shot settings
  drop downs OR mutliselects

-=-=-=-=

OLD:

content
  delete models in the group
  add the appropriate characters and randomly position and rotate

setting content
  delete models from group
  add reference objects
  boxes
  plants
  trees


headDirection
  modify head bone

fov
  pick random camera angle based on the param

shot type
  based on the shot type
  figure out which bones should be in the shot
  based on the fov and the content box, figure out the distance from the subject

horizontalAngle
  rotate the camera position around the content point

verticalAngle
  rotate the camera position around the vertical content point

composition
  rotate the camera position to the left or right by (fov /2)-(fov/3)
    30/2=15 - 30/3=10 = 5 degrees

roomSize
  toggle on the right room size
    make sure there are reference room objects
      window
      door
      light


-=-=-=-=-=-

lighting

rotation of character

poses
  lower body
  upper body

volume grid visible

-=-=-=-=-=-

outline effect

-=-=-=-=-=-

NEED:

chair
doorframe
window
plants
  small
  tall
tree
box
car
table



*/

window.THREE = require('../vendor/three.min.js')
const JDLoader = require('../vendor/JDLoader.min.js')
const {MeshLine, MeshLineMaterial} = require('../vendor/THREE.Meshline.js')
const OutlineEffect = require('../vendor/effects/OutlineEffect.js')
const BufferSubdivisionModifier = require('../vendor/modifiers/BufferSubdivisionModifier.js')

const METERS_PER_FEET = 0.3048


let backgroundScene
let contentScene

let meshes = [], mixers = [], hemisphereLight, camera, renderer, controls
let effect
let clock = new THREE.Clock

let manager 
let textures 
let dummyModels

let dummyGroup

let mixer

let outlineWidth = 0.015

let setup = (config) => {

  backgroundScene = new THREE.Scene()
  backgroundScene.background = new THREE.Color( 0xFFFFFF )
  backgroundScene.add(new THREE.AmbientLight(0x161616, 1))






  // create scene
  contentScene = new THREE.Scene()
  //                           
  contentScene.add(new THREE.AmbientLight(0x161616, 1))

  // create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(config.width, config.height)
  renderer.autoClear = false

  effect = new THREE.OutlineEffect(renderer)
  effect.setSize(2500,900)
  effect.setViewport(0,0,2500,900)


  manager = new THREE.LoadingManager()

  loadTextures()

  loadDummyModels()

  // dummyGroup = THREE.Group()
  // addToScene(dummyGroup)

  createGroundPlane()
  createReferenceCube()
  createLineCube()

  // var loader = new THREE.JDLoader()
  // loader.load("data/STDummy_Male_TestPoses8.JD", (data) => {
  //   var multiMaterial = new THREE.MultiMaterial(data.materials)
  //   for (var i = 0; i < data.geometries.length; ++i) {
  //     var mesh = new THREE.SkinnedMesh(data.geometries[i], multiMaterial)
  //     meshes.push(mesh)
  //     mesh.scale.set(0.001,0.001,0.001)
  //     scene.add(mesh)
  //     if (mesh.geometry.animations) {
  //       var mixer = new THREE.AnimationMixer(mesh)
  //       mixers.push(mixer)
  //       var action = mixer.clipAction(mesh.geometry.animations[3])
  //       action.clampWhenFinished = true
  //       action.setLoop(THREE.LoopOnce)
  //       action.reset().play()
  //       mixers[0].update(5)
  //     }
  //   }

    // camera = new THREE.PerspectiveCamera(30, 2500 / 900, 1, 10 * data.boundingSphere.radius)
    // camera.position.y = 1500
    // camera.position.x = 1500
    // camera.position.z = data.boundingSphere.center.z + 5 * data.boundingSphere.radius
    // camera.lookAt(data.boundingSphere.center) 
    // scene.add(camera)
    // camera.add(new THREE.DirectionalLight(0xFFFFFF, 1))
  // })

  backgroundScene.add(buildSquareRoom(60, 60, 20, 1))



    camera = new THREE.PerspectiveCamera(30, 2500 / 900, .01, 1000)
    camera.position.y = 1.3
    camera.position.z = 2

    camera.aspect = 2500/900
    camera.updateProjectionMatrix()

    contentScene.add(camera)
    contentScene.add(new THREE.DirectionalLight(0xFFFFFF, 1))
    backgroundScene.add(camera)



}

let loadTextures = () => {
  let imageLoader = new THREE.ImageLoader (manager)

  textures = {personMale: new THREE.Texture(), personFemale: new THREE.Texture(), ground: new THREE.Texture(), wall: new THREE.Texture()}

  imageLoader.load('data/STDumy_Male_tex.png', ( image ) => {
    textures.personMale.image = image;
    textures.personMale.needsUpdate = true;
  })

  imageLoader.load('data/dummy_female_tex.jpg', ( image ) => {
    textures.personFemale.image = image;
    textures.personFemale.needsUpdate = true;
  })

  imageLoader.load('data/grid.png', ( image ) => {
    textures.ground.image = image;
    textures.ground.needsUpdate = true;
  })

  imageLoader.load('data/wall_grid2.png', ( image ) => {
    textures.wall.image = image;
    textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
    textures.wall.offset.set( 0, 0 );
    textures.wall.repeat.set( 4.5, 4.5 );

    textures.wall.needsUpdate = true;
  })
}


let createGroundPlane = () => {
  var geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
  var material = new THREE.MeshBasicMaterial( {map: textures.ground, side: THREE.FrontSide} )
  material.transparent = true
  material.blending = THREE.MultiplyBlending
  material.opacity = 1
  //material.depthFunc = THREE.NotEqualDepth
  var plane = new THREE.Mesh( geometry, material )
  plane.renderOrder = 1.0
  plane.rotation.x = -Math.PI / 2
  //addToScene(plane)
  backgroundScene.add(plane)
}

let createReferenceCube = () => {
  var geometry2 = new THREE.BoxGeometry( 1, 1, 1, 5, 5, 5 );

  var modifier = new THREE.BufferSubdivisionModifier( 2 );
  var smooth = modifier.modify( geometry2 );
  var material2 = new THREE.MeshBasicMaterial( {color: 0x999999} );
  material2.outlineParameters = {
    thickness: outlineWidth,                     // this paremeter won't work for MultiMaterial
    color: new THREE.Color( 0x0 ),  // this paremeter won't work for MultiMaterial
    alpha: 0.6,                          // this paremeter won't work for MultiMaterial
    visible: true,
    keepAlive: true  // this paremeter won't work for Material in materials of MultiMaterial
  };
  var cube = new THREE.Mesh( smooth, material2 );
  //cube.rotation.x = -Math.PI / 2;
  cube.position.y = 0+(1/2);
  cube.position.x = 2;
  cube.position.z = -5;
  addToScene(cube)
}

let createLineCube = () => {
var geometry = new THREE.Geometry();

// bottom
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );

geometry.vertices.push( new THREE.Vector3( 0, 0.5, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0.5, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0.5, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0.5, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0.5, 0 ) );


// top
geometry.vertices.push( new THREE.Vector3( 0, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 0 ) );


// back
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );

geometry.vertices.push( new THREE.Vector3( 0, 0, 0.5 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 0.5 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 0.5 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 0.5 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 0.5 ) );



// front
geometry.vertices.push( new THREE.Vector3( 0, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 1 ) );

// left
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );

// right
geometry.vertices.push( new THREE.Vector3( 0.5, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0.5, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0.5, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 0.5, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 0.5, 0, 0 ) );



// right
geometry.vertices.push( new THREE.Vector3( 1, 0, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 1 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 1 ) );
geometry.vertices.push( new THREE.Vector3( 1, 1, 0 ) );
geometry.vertices.push( new THREE.Vector3( 1, 0, 0 ) );

geometry.translate(-.5, 0, -.5)


//var geometry = new THREE.CubeGeometry( 1, 1, 1, 5, 5,5 )
console.log(MeshLine)
var line = new MeshLine()
line.setGeometry( geometry );
line.setGeometry( geometry, function( p ) { return 1; } )

var material = new MeshLineMaterial({
color: new THREE.Color(0x00),
opacity: 0.6,
resolution: THREE.Vector2(2500,900),
lineWidth: 0.02,
sizeAttenuation: true,
near: 0.1,
far: 1000,
transparent: true,
side: THREE.DoubleSide,
});




var mesh = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!
mesh.position.set(0,0,0)
mesh.scale.set(0.4,1.6,0.4)
addToScene( mesh );  
}

let loadDummyModels = () => {
  let loader = new THREE.JDLoader()
  
  dummyModels = {}

  loader.load("data/STDummy_Female03.JD", (data) => {
    var material = new THREE.MeshToonMaterial( {
          map: textures.personFemale,
          color: 0xffffff,
          specular: 0x0,
          // reflectivity: beta,
          // shininess: specularShininess,
          shading: THREE.SmoothShading,
          //envMap: alphaIndex % 2 === 0 ? null : reflectionCube
        } )
    material.outlineParameters = {
      thickness: outlineWidth,                     // this paremeter won't work for MultiMaterial
      color: new THREE.Color( 0x0 ),  // this paremeter won't work for MultiMaterial
      alpha: 0.6,                          // this paremeter won't work for MultiMaterial
      visible: true,
      keepAlive: true  // this paremeter won't work for Material in materials of MultiMaterial
    }

    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.6256
      var scale = targetHeight / height
      console.log("scale: " + scale)
      mesh.scale.set(scale, scale, scale)
      dummyModels.female = mesh
    }
  })

  loader.load("data/STDummy_Male_List-Poses_v02.JD", (data) => {
    console.log(data)
    var material = new THREE.MeshToonMaterial( {
          map: textures.personMale,
          color: 0xffffff,
          emissive: 0x0,
          specular: 0x0,
          skinning: true,
          // reflectivity: beta,
          shininess: 0,
          shading: THREE.SmoothShading,
          //envMap: alphaIndex % 2 === 0 ? null : reflectionCube
        } )
    material.outlineParameters = {
      thickness: outlineWidth,                     // this paremeter won't work for MultiMaterial
      color: new THREE.Color( 0x0 ),  // this paremeter won't work for MultiMaterial
      alpha: 0.6,                          // this paremeter won't work for MultiMaterial
      visible: true,
      keepAlive: true  // this paremeter won't work for Material in materials of MultiMaterial
    }
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)

      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.8
      var scale = targetHeight / height
      console.log("scale: " + scale)
      mesh.scale.set(scale, scale, scale)
      mesh.updateMatrix()
      dummyModels.male = mesh
    }
  })


}



function addToScene(obj) {
  contentScene.add(obj)
}


// init();
// animate();

// setInterval(animate, 200)
// function init()
// {

// }

let render = () => {
  var delta = clock.getDelta()


 // mixer.update(1)
 
  if (camera) {
    //renderer.render(scene, camera)
    
    effect.clear()
    effect.render(backgroundScene, camera)
    renderer.clearDepth()
    effect.render(contentScene, camera)


   
    // renderer.render( scene, camera );
    // renderer.clearDepth();
    // renderer.render( scene2, camera );




  } 
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




let setupContent = (param) => {
  contentScene.remove(dummyGroup)
  dummyGroup = new THREE.Group()


  switch (param) {
    case "oneShot":
      var newPerson = dummyModels.male.clone()
      dummyGroup.add(newPerson)

      for (var i = 0; i < newPerson.geometry.animations.length; i++) {
        console.log(newPerson.geometry.animations[i].name)
      }

     // console.log(newPerson)
    var mixer1 = new THREE.AnimationMixer( newPerson )
     var action = mixer1.clipAction('run', newPerson)
    action.clampWhenFinished = true
    action.setLoop(THREE.LoopOnce)
    action.play()
    console.log(action)
    mixer1.update(2.1)

    //console.log(newPerson.skeleton.bones[56].lookAt(new THREE.Vector3(10,0,10)))
      //var euler = new THREE.Euler( 1, 0, 0, 'XYZ' );

      //newPerson.skeleton.bones[56].rotation.set( -1, -.3, .1, 'XYZ' )


      //newPerson.rotation.set(0,Math.PI,0)

      console.log(newPerson.skeleton.bones[56].rotation)
      break
    case "twoShot":
      var newPerson = dummyModels.female.clone()
      dummyGroup.add(newPerson)
      newPerson.translateX(-.25)
      var newPerson2 = dummyModels.female.clone()
      newPerson2.translateX(.25)
      dummyGroup.add(newPerson2)
      break
    case "threeShot":
      var newPerson3 = dummyModels.male.clone()
      dummyGroup.add(newPerson3)
      var newPerson = dummyModels.male.clone()
      newPerson.rotation.set(0, Math.random()*1.6,0)
      newPerson.position.set(-.45,0,Math.random()*.6)
      dummyGroup.add(newPerson)
      var newPerson2 = dummyModels.male.clone()
      newPerson2.rotation.set(0, -Math.random()*1.6,0)
      newPerson2.position.set(.45,0,Math.random()*.6)
      dummyGroup.add(newPerson2)
      break
    case "groupShot":
      let numPeople = Math.round(Math.random()*30+6)
      for (var i = 0; i < numPeople; i++) {
        var newPerson = dummyModels.female.clone()
        newPerson.translateX(Math.random()*10-5)
        newPerson.translateZ(-Math.random()*10)
        newPerson.rotateY(Math.random()*1.5-(1.5/2))
        dummyGroup.add(newPerson)
      }
      break
    case "OTS":
      var newPerson = dummyModels.female.clone()
      dummyGroup.add(newPerson)
      var newPerson2 = dummyModels.female.clone()

      newPerson2.translateZ(1)
      newPerson2.rotateY(Math.PI)
      dummyGroup.add(newPerson2)
      break
  }

  contentScene.add(dummyGroup)
}


let setupFov = (param) => {
  // https://en.wikipedia.org/wiki/Angle_of_view
  let cameraLensAngles = {
    0:180.0,
    2:161.1,
    12:90.0,
    14:81.2,
    16:73.9,
    20:61.9,
    24:53.1,
    35:37.8,
    50:27.0,
    70:19.5,
    85:16.1,
    105:13.0,
    200:6.87,
    300:4.58,
    400:3.44,
    500:2.75,
    600:2.29,
    700:1.96,
    800:1.72,
    1200:1.15,
  }

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
    case 'ECU':
      requiredBones = ["Head", "HeadNub"]
      distMult = 0.4
      break
    case 'VCU':
      requiredBones = ["Head", "HeadNub"]
      distMult = 0.8
      break
    case 'CU':
      requiredBones = ["Head", "HeadNub", "Neck"]
      break
    case 'MCU':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2"]
      break
    case 'Bust':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1"]
      break
    case 'MS':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine"]
      break
    case 'MLS':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf"]
      break
    case 'LS':
      requiredBones = ["Head", "HeadNub", "Neck", "UpperArm",  "Spine2", "Spine1", "Spine", "Thigh", "Calf", "Toe0Nub"]
      distAdd = Math.round(Math.random()*5)
      cameraVerticalCenter = true
      vertAdjust = false
      break
    case 'ELS':
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
  
  console.log(params.horizontalComposition)
  switch (params.horizontalComposition) {
    case 'auto':

      switch (params.horizontalAngle) {
        case 'left':
          camera.rotateY(-hFOV/5)
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
// function onWindowResize()
// {
//     if (camera)
//     {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//     }
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }






const EventEmitter = require('events').EventEmitter


const shotProperties = require('../shot-template-system/shot-properties.js')





// var width   = 64
// var height  = 64
// var (width, height, { preserveDrawingBuffer: true })

// //Clear screen to red
// gl.clearColor(1, 0, 0, 1)
// gl.clear(gl.COLOR_BUFFER_BIT)


class ShotTemplateSystem extends EventEmitter {
  constructor (config) {
    super()

 
    this.ready = false
    this.definedShotParams = {}
    this.shotParams = {}

    setup(config)

    // create scene
    // loader models and textures
    // after it's done, set ready

    // options = aspect ratio / width / height 
  }

  setSize(width, height) {

  }

  setDefinedShotParams (shotParams) {
    this.definedShotParams = {}
    if (shotParams) {
      for (let param in shotParams) {
        this.definedShotParams[param] = shotParams[param]
      }
    }
  }

  requestShot (shotParams) {
    if (shotParams) {
      this.setDefinedShotParams(shotParams)
    }
    this.createShotParams()
    
    setupContent(this.shotParams.content)
    setupFov(this.shotParams.fov)
    setupShotType(this.shotParams)

    // clearScene()
    // createScene()

    // render()
    render()
    
    return {image: renderer.domElement.toDataURL(), shotParams: this.shotParams}
  }


  renderShot () {
     
    render()
    
    return {image: renderer.domElement.toDataURL(), shotParams: this.shotParams}
  }


  createShotParams() {
    this.shotParams = {}
    // find unset params
    for (let property in shotProperties) {
      if (this.definedShotParams[property]) {
        this.shotParams[property] = this.definedShotParams[property]
      } else {
        this.shotParams[property] = this.chooseRandomValue(shotProperties[property])
      }
    }
    // for the rest, randomize each

  }

  rand (min, max) {
    return Math.random() * (max - min) + min
  }

  chooseRandomValue (values) {
    let totalWeight = 0

    for (let value in values) {
      //console.log(value)
      totalWeight += values[value].weight
    }

    let randomNum = this.rand(0, totalWeight)
    let weightSum = 0

    //return totalWeight
    for (let value in values) {
      //console.log(value)
      weightSum += values[value].weight
      weightSum = +weightSum.toFixed(2)

      if (randomNum <= weightSum) {
        return value
      }
    }
  }

}

module.exports = ShotTemplateSystem