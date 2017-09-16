/**
forked from @dyoniziz and @jkammerl.
@author: caroline-lin
last modified: sept 16 2017
merging iterative wave and camera setup.

**/
// Check if the browser supports WebGL
if (!Detector.webgl) Detector.addGetWebGLMessage();

/** SIMULATION - SPECIFIC CONSTS **/
// simulation resolution
const N = 60;
// simulation grid size (in xz plane)
const W = 10000;
const H = W;
// depth of the water -- make it deep!
const D = 100;
// wave propagation speed (relationship between time and space)
const C = 0.04;
const C2 = C * C;
// damping coefficient
const DAMPING = 0.001;
const SIM_SPEED = 100;

// precompute some deltas for our finite differences
// because our step size in space is completely constant.
const DELTA_X = W / N;
const DELTA_X2 = DELTA_X * DELTA_X;
const DELTA_Z = H / N;
const DELTA_Z2 = DELTA_Z * DELTA_Z;

// should be the 'usual' iter of time to run
const MAX_DT = 20;
// only simulate 100ms if last iter elapsed more than 100ms.
const MAX_ITERATED_DT = 100;

// some constants for the initial state of the world
// also affects new clicks.

// amplitude of 'clicked' normal distributions
const MAX_Y = 200;
// width of the normal distribution.
const SIGMA = 0.01;

/** Constants for google cardboard
*** and rendering with three.js **/
var noSleep;
var container, stats;
var camera, scene, renderer, light1, effect, clock, controls;

var mesh, boxmesh;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var obj_pos = new THREE.Vector3(0, 0, 30);
var camera_pos = new THREE.Vector3(0, 0, 0);
var camera_fov = 90

var light_dist = 23.5;
var light_radius = 0.3;

var light_plane_height_half, light_plane_width_half;
var material_specular = new THREE.Color(5,5,5);

init();
animate();

/******************************************************* REAL CODE **********************************************/

// Set up the initial conditions for <geometry>
// geometry should be a mesh grid.
// uy is velocity in y direction, ay is acceleration in y direction.
var initGeometry = function ( geometry ){
    var result = [];
    for (var i = 0; i < geometry.vertices.length; i++) {
        var vertex = geometry.vertices[i];
        vertex.y = MAX_Y * Math.exp(-SIGMA * vertex.x * vertex.x) * Math.exp(-SIGMA * vertex.z * vertex.z);
        vertex.uy = 0;
        result.push(vertex.ay = 0);
        }
    return result;
    };


// Set up the WebGL interface.
function init() {
    noSleep = new NoSleep();

    /** CAMERA SETUP **/
    container = document.createElement('div');
    container.innerHTML = '<h3 style="color: white;">Loading mesh.. </h3>';
    document.body.appendChild(container);

    var light_plane_height = Math.sin((camera_fov / 2.0) * Math.PI / 180) * light_dist * 2.0;
    var aspect_ratio = window.innerWidth / window.innerHeight;
    var light_plane_width = light_plane_height * aspect_ratio;
    light_plane_height_half = light_plane_height / 2.0;
    light_plane_width_half = light_plane_width / 2.0;

    camera = new THREE.PerspectiveCamera(camera_fov, 1, 0.001, 700);
    camera.position = camera_pos;
    camera.lookAt(obj_pos);

    scene = new THREE.Scene();

    clock = new THREE.Clock(true); // alternative to Date.now

    function setOrientationControls(e) {
        if (!e.alpha) {
          return;
        }
        if (controls == null) {
            controls = new THREE.DeviceOrientationControls(camera, true);
            controls.connect();
            controls.update();
        }
        window.removeEventListener('deviceorientation', setOrientationControls.bind(this));
    }
    window.addEventListener('deviceorientation', setOrientationControls, true);

    /** SHAPE SETUP **/

    // start with a flat plane which we'll deform accordingly
    var geometry = new THREE.PlaneGeometry(W, H, N, N);
    // make it so that our wave function is in the form y = f(x, z, t)
    //var matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    //geometry.applyMatrix(matrix);
    //initGeometry(geometry);

    var materials = [
        new THREE.MeshPhongMaterial({color: 0xff99ff}),
        new THREE.MeshBasicMaterial({visible: false})
    ];

    mesh = new THREE.Mesh(geometry, materials[0]);
    mesh.position = obj_pos;
    // mesh.scale.set(0.05, 0.05, 0.05);
    /**
    var cubeGeometry = new THREE.BoxGeometry(W, D, H);
    for (face in cubeGeometry.faces) { face.materialIndex = 0; }
    cubeGeometry.faces[2].materialIndex = 1;
    var cubeMesh = new THREE.Mesh(cubeGeometry, new THREE.MeshFaceMaterial(materials));
    cubeMesh.position.set(0, -D / 2, 0);
    **/

    /** FINAL ADDITIONS **/
    scene.add(mesh);
    // scene.add(cubeMesh);
    noSleep.enable();
    /** END SHAPE SETUP **/

    light1 = new THREE.PointLight(0xffffff, 0.898, 15.145);
    scene.add(light1);

    // RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMapEnabled = true;
    renderer.shadowMapCullFace = THREE.CullFaceBack;
    container.appendChild(renderer.domElement);
    effect = new THREE.StereoEffect(renderer);

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

function animate() {
    requestAnimationFrame(animate);
    update();
    render();
}

function update() {
  onWindowResize();
  if (controls) {
      controls.update();
  }
  clock.getDelta();
}


function render() {
    light1.position.x = Math.sin(clock.elapsedTime * 1) * light_plane_width_half * light_radius;
    light1.position.y = Math.cos(clock.elapsedTime * 1) * light_plane_height_half * light_radius;
    light1.position.z = light_dist;

    var targetX = light1.position.x * .07 + Math.PI;
    var targetY = light1.position.y * -.07 ;

    if (mesh) {
        mesh.rotation.y += 0.05 * (targetX - mesh.rotation.y);
        mesh.rotation.x += 0.05 * (targetY - mesh.rotation.x);
    }

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

