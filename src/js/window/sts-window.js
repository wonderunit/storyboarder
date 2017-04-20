const THREE = require('../vendor/three.min.js')

console.log(THREE)

function addToScene(obj) {
  scene.add(obj)
}

  var scene = new THREE.Scene();

  var ambient = new THREE.AmbientLight( 0x222222 );
  addToScene(ambient)

  var directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.set( 0, 8, 1 );
  addToScene(directionalLight)


var cameraNear = 0.05
var cameraAspecRatio = 1.85

  var camera

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, cameraNear );
  camera.position.z = 2.5;
  camera.layers.enable(1)

  var container = document.getElementById('inspector')

  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );
