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
const W = 300;
const H = W;
// depth of the water -- make it deep!
const D = 100;
// wave propagation speed (relationship between time and space)
const C = 0.04;
const C2 = C * C;
// damping coefficient
const DAMPING = 0.001;
const SIM_SPEED = 1;

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
const MAX_Y = 50;
// width of the normal distribution.
const SIGMA = 0.01;

/** Constants for google cardboard
*** and rendering with three.js **/
var noSleep;
var container, stats;
var camera, scene, renderer, light1, effect, clock, controls;

var mesh, boxmesh;
var geometry; // for the plane
var cubeGeometry; // for the box of water

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var obj_pos = new THREE.Vector3(0, 0, 30);
var camera_pos = new THREE.Vector3(100, 150, 200);
var camera_fov = 90;

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
function initGeometry( geom ){
    var result = [];
    for (var i = 0; i < geom.vertices.length; i++) {
        var vertex = geom.vertices[i];
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
    geometry = new THREE.PlaneGeometry(W, H, N, N);
    // make it so that our wave function is in the form y = f(x, z, t)
    var matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    geometry.applyMatrix(matrix);
    initGeometry( geometry );

    var materials = [
        new THREE.MeshPhongMaterial({
            ambient: 0xffffff,
            color: 0x0099ff,
            shininess: 30,
            shading: THREE.SmoothShading,
            metal: false,
            side: THREE.DoubleSide
        }),
        new THREE.MeshBasicMaterial({visible: false})
    ];

    mesh = new THREE.Mesh(geometry, materials[0]);
    mesh.position = obj_pos;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material.vertexColors = THREE.FaceColors;
    mesh.scale.set(1,1,1);
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

    //var light = new THREE.AmbientLight( 0x404040 ); // soft white light
    //scene.add( light );
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);
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
    var dt = clock.getDelta();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    onWindowResize();
    // from the update function
    if (controls){
        controls.update();
    }

    render();
}

// this should be replaced by integrate() from main.js.
function idx(x, z){
    return (x + ((N + 1) * z));
};

// num solve across a unit time interval dt
// dt should be given three js's clock
function euintegrate( dt ){
    var i; var d2x; var d2z;
    var v = geometry.vertices;
    
    //document.write(geometry);

    for (var z=1; z <= N; z++) {
        for (var x=1; x <= N; x++) {
            i = idx(x, z);
            // find neighbouring points in grid
            iPrevX = idx(x - 1, z);
            iNextX = idx(x + 1, z);
            iPrevZ = idx(x, z - 1);
            iNextZ = idx(x, z + 1);

            d2x = (v[iNextX].y - 2 * v[i].y + v[iPrevX].y) / DELTA_X2;
            d2z = (v[iNextZ].y - 2 * v[i].y + v[iPrevZ].y) / DELTA_Z2;

            // wave eqn
            v[i].ay = C2 * (d2x + d2z);

            // introduce damping
            v[i].ay += -DAMPING * v[i].uy;

            // use Euler integration to find the new velocity w.r.t. time
            // and the new vertical position
            v[i].uy += dt * v[i].ay;
            v[i].newY = v[i].y + dt * v[i].uy;
        };
    };

    // loop again to update the y values .. but only after all computations are completed.
    for (var z=1; z <= N; z++) {
        for (var x=1; x <= N; x++) {
            i = idx(x, z);
            v[i].y = v[i].newY;
        };
    };

    geometry.verticesNeedUpdate = true;
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.normalsNeedUpdate = true;
};


function render() {
    // move the spotlight.
    light1.position.x = Math.sin(clock.elapsedTime * 1) * light_plane_width_half * light_radius;
    light1.position.y = Math.cos(clock.elapsedTime * 1) * light_plane_height_half * light_radius;
    light1.position.z = light_dist;

    // TODO: here is where to integrate.
    var dt = clock.getDelta();
    dt = dt * SIM_SPEED; // speed up the simulation by SIM_SPEED

    if (dt > MAX_ITERATED_DT){
        dt = MAX_ITERATED_DT;
    };

    while (dt > 0){
        if (dt > MAX_DT){
            euintegrate(MAX_DT); // just this time length
        } else{
            euintegrate(dt);
        };
        dt = dt - MAX_DT;
    };
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

