
if (!Detector.webgl) Detector.addGetWebGLMessage();
var noSleep;
var container, stats;
var camera, scene, renderer, mesh, material, effect, clock, controls;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var obj_pos = new THREE.Vector3(0, 0, 30);
var camera_pos = new THREE.Vector3(0, 0, 0);
var camera_fov = 90

var material_specular = new THREE.Color(0.21, 0.21, 0.21);

init();
animate();

function init() {
    noSleep = new NoSleep();

    container = document.createElement('div');
    container.innerHTML = '<h1 style="color: white;">let this be light </h3>';
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000); // changing some shit
    camera.position = camera_pos;
    camera.lookAt(obj_pos);

    scene = new THREE.Scene();

    // my 'loader'
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    material = new THREE.MeshBasicMaterial( { color: 0x00eeff } );
    mesh = new THREE.Mesh(geometry, material);
    mesh.position = obj_pos;
    scene.add(mesh);

    // RENDERER
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild( renderer.domElement );

    effect = new THREE.StereoEffect( renderer );

    // EVENTS
    window.addEventListener('resize', onWindowResize, false);
    container.addEventListener('click', fullscreen, false);
}


function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() { // don't touch this shit
    requestAnimationFrame( animate );
    // update(); -- broken right now
    render();
}

function update() {
}


function render() {
    //renderer.render(scene, camera);
    effect.render(scene, camera);
}

function fullscreen() {
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  }
}
