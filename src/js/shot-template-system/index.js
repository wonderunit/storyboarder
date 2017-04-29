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

*/

window.THREE = require('../vendor/three.min.js')
const JDLoader = require('../vendor/JDLoader.min.js')

let meshes = [], mixers = [], hemisphereLight, camera, scene, renderer, controls

let clock = new THREE.Clock

let manager 
let textures 
let dummyModels

let setup = (config) => {

  // create scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color( 0xffffff )                           
  scene.add(new THREE.AmbientLight(0x161616, 1));

  // create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(config.width, config.height)

  manager = new THREE.LoadingManager()

  loadTextures()

  loadDummyModels()


  createGroundPlane()
  createReferenceCube()
  // var loader = new THREE.JDLoader()
  // loader.load("data/Test_Dummy_Female__v1.JD", (data) => {
  //   var multiMaterial = new THREE.MultiMaterial(data.materials)
  //   for (var i = 0; i < data.geometries.length; ++i) {
  //     var mesh = new THREE.SkinnedMesh(data.geometries[i], multiMaterial)
  //     meshes.push(mesh)
  //     scene.add(mesh)
  //     if (mesh.geometry.animations) {
  //       var mixer = new THREE.AnimationMixer(mesh)
  //       mixers.push(mixer)
  //       mixer.clipAction(mesh.geometry.animations[0]).play()
  //     }
  //   }

  //   camera = new THREE.PerspectiveCamera(30, 2500 / 900, 1, 10 * data.boundingSphere.radius)
  //   camera.position.y = 1500
  //   camera.position.x = 1500
  //   camera.position.z = data.boundingSphere.center.z + 5 * data.boundingSphere.radius
  //   camera.lookAt(data.boundingSphere.center) 
  //   scene.add(camera)
  //   camera.add(new THREE.DirectionalLight(0xFFFFFF, 1))
  // })

    camera = new THREE.PerspectiveCamera(30, 2500 / 900, .01, 1000)
    camera.position.y = 1.3
    camera.position.z = 2
    scene.add(camera)
    camera.add(new THREE.DirectionalLight(0xFFFFFF, 1))



}

let loadTextures = () => {
  let imageLoader = new THREE.ImageLoader (manager)

  textures = {personMale: new THREE.Texture(), personFemale: new THREE.Texture(), ground: new THREE.Texture(), wall: new THREE.Texture()}

  imageLoader.load('data/dummy_tex.png', ( image ) => {
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

  imageLoader.load('data/wall_grid.png', ( image ) => {
    textures.wall.image = image;
    textures.wall.needsUpdate = true;
  })
}


let createGroundPlane = () => {
  var geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
  var material = new THREE.MeshBasicMaterial( {map: textures.ground, side: THREE.FrontSide} )
  material.outlineParameters = {
    defaultThickness: 0.62,                     // this paremeter won't work for MultiMaterial
    color: new THREE.Color( 0x888888 ),  // this paremeter won't work for MultiMaterial
    alpha: 0.8,                          // this paremeter won't work for MultiMaterial
    visible: false,
    keepAlive: true  // this paremeter won't work for Material in materials of MultiMaterial
  }
  var plane = new THREE.Mesh( geometry, material )
  plane.rotation.x = -Math.PI / 2
  addToScene(plane)
}

let createReferenceCube = () => {
  var geometry2 = new THREE.BoxGeometry( 1, 2, 1, 5, 5, 5 );

  // var modifier = new THREE.BufferSubdivisionModifier( 2 );
  // var smooth = modifier.modify( geometry2 );
  var material2 = new THREE.MeshBasicMaterial( {color: 0x999999} );
  material2.outlineParameters = {
    thickNess: 0.9,                     // this paremeter won't work for MultiMaterial
    color: new THREE.Color( 0x00 ),  // this paremeter won't work for MultiMaterial
    alpha: 0.6,                          // this paremeter won't work for MultiMaterial
    visible: true,
    keepAlive: true  // this paremeter won't work for Material in materials of MultiMaterial
  };
  var cube = new THREE.Mesh( geometry2, material2 );
  //cube.rotation.x = -Math.PI / 2;
  cube.position.y = 0+(2/2);
  cube.position.x = 2;
  cube.position.z = -5;
  addToScene(cube)
}


let loadDummyModels = () => {
  let loader = new THREE.JDLoader()
  
  dummyModels = {}

  loader.load("data/Test_Dummy_Female__v1.JD", (data) => {
    var material = new THREE.MeshToonMaterial( {
          map: textures.personFemale,
          color: 0xffffff,
          specular: 0x0,
          // reflectivity: beta,
          // shininess: specularShininess,
          shading: THREE.SmoothShading,
          //envMap: alphaIndex % 2 === 0 ? null : reflectionCube
        } )
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      dummyModels.female = mesh

      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.6256
      var scale = targetHeight / height
      console.log("scale: " + scale)
      mesh.scale.set(scale, scale, scale)
      mesh.translateX(1)
      addToScene(mesh)
    }
  })


  loader.load("data/Test_Dummy_v1.JD", (data) => {
    var material = new THREE.MeshToonMaterial( {
          map: textures.personMale,
          color: 0xffffff,
          specular: 0x0,
          // reflectivity: beta,
          // shininess: specularShininess,
          shading: THREE.SmoothShading,
          //envMap: alphaIndex % 2 === 0 ? null : reflectionCube
        } )
    for (var i = 0; i < data.geometries.length; ++i) {
      var mesh = new THREE.SkinnedMesh(data.geometries[i], material)
      dummyModels.male = mesh

      var bbox = new THREE.Box3().setFromObject(mesh);
      var height = bbox.max.y - bbox.min.y
      var targetHeight = 1.8
      var scale = targetHeight / height
      console.log("scale: " + scale)
      mesh.scale.set(scale, scale, scale)
      addToScene(mesh)
    }
  })


}



function addToScene(obj) {
  scene.add(obj)
}


// init();
// animate();

// setInterval(animate, 200)
// function init()
// {

// }

let animate = () => {
  
  var newPerson = dummyModels.male.clone()
  newPerson.translateX(Math.random()*2-1)
  addToScene(newPerson)


  console.log("animate frame")
  var delta = clock.getDelta()
  for (var i = 0; i < mixers.length; ++i) {
    mixers[i].update(delta)
  }        
  if (camera) {
    renderer.render(scene, camera)
  } 



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
    // clearScene()
    // createScene()

    // render()
    animate()
    
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