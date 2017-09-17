/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let mesh = null;
let renderer = null;
let scene = null;
let camera = null;
let geometry = null;
let controls = null;
let projector = null;

// simulation resolution
const N = 60;
// simulation size (in x and z directions)
const W = 200;
const H = W;

// depth of the cube on which it stands
const D = 10;

// wave propagation speed (relationship between time and space)
const C = 0.04;
const C2 = C * C;
// damping coefficient
const DAMPING = 0.001;
const SIM_SPEED = 1;
// precompute some deltas for our finite differences
const DELTA_X = W / N;
const DELTA_X2 = DELTA_X * DELTA_X;
const DELTA_Z = H / N;
const DELTA_Z2 = DELTA_Z * DELTA_Z;

// we're using iterated Euler's method
// specify iteration dt
const MAX_DT = 12;
// we won't be simulating beyond this dt
const MAX_ITERATRED_DT = 100;

// some constants for the initial state of the world
// the height of the original droplet
const MAX_Y = 50;
// the concentration of the original droplet
// this is the square of the inverse of the usual "sigma" used in the gaussian distribution
const SIGMA = 0.01;

// initialization of three.js, a basic camera, some lights, and the overall scene
const init = function() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 200;
    camera.position.y = 150;
    camera.position.x = 100;

    scene = new THREE.Scene();

    /** GYROSCOPE CONTROLS **/
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


    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);

    // start with a flat plane which we'll deform accordingly
    geometry = new THREE.PlaneGeometry(W, H, N, N);
    // make it so that our wave function is in the form y = f(x, z, t)
    const matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    geometry.applyMatrix(matrix);

    initGeometry();

    const materials = [
        new THREE.MeshPhongMaterial({color: 0x0099ff}),
        new THREE.MeshBasicMaterial({visible: false})
    ];

    mesh = new THREE.Mesh(geometry, materials[0]);

    const cubeGeometry = new THREE.CubeGeometry(W, D, H);
    for (let face of Array.from(cubeGeometry.faces)) { face.materialIndex = 0; }
    cubeGeometry.faces[2].materialIndex = 1;

    const cubeMesh = new THREE.Mesh(cubeGeometry, new THREE.MeshFaceMaterial(materials));

    cubeMesh.position.set(0, -D / 2, 0);

    scene.add(mesh);
    scene.add(cubeMesh);

    controls = new THREE.TrackballControls(camera);

    projector = new THREE.Projector();

    renderer = new THREE.WebGLRenderer();
    const updateViewport = function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        return controls.target.set(0, 0, 0);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    document.addEventListener('mousedown', hitTest);

    return document.body.appendChild(renderer.domElement);
};
let now = Date.now();
// main loop function
var animate = function() {
    let dt = Date.now() - now;
    // let dt = clock.getDelta(); breaks the time evolution.
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();

    clock.getDelta();
    console.log(clock.elapsedTime);

    dt *= SIM_SPEED;

    if (dt > MAX_ITERATRED_DT) {
        dt = MAX_ITERATRED_DT;
    }
    
    // iterated Euler's method
    while (dt > 0) {
        if (dt > MAX_DT) {
            integrate(MAX_DT);
        } else {
            integrate(dt);
        }
        dt -= MAX_DT;
    }
    now = Date.now();
    return;
};

// convert from (x, z) indices to an index in the vertex array
const idx = (x, z) => x + ((N + 1) * z);

// generate the initial condition for the simulation
var initGeometry = () =>
    (() => {
        const result = [];
        for (let index = 0; index < geometry.vertices.length; index++) {
        // vertex.y = MAX_Y * Math.sin((vertex.x + W / 2) / W * SPACE_X_OMEGA) * Math.sin((vertex.z + H / 2) / H * SPACE_Z_OMEGA) * Math.exp(-Math.abs(0.01 * vertex.x)) * Math.exp(-Math.abs(0.02 * vertex.z))
        // the initial condition is a symmetric 2d Gaussian
        // See http://en.wikipedia.org/wiki/Gaussian_function
            const vertex = geometry.vertices[index];
            vertex.y = MAX_Y * Math.exp(-SIGMA * vertex.x * vertex.x) * Math.exp(-SIGMA * vertex.z * vertex.z);
            vertex.uy = 0;
            result.push(vertex.ay = 0);
        }
        return result;
    })()
;


var integrate = function(dt) {
    let i, x, z;
    let asc, end;
    let asc2, end2;
    const v = geometry.vertices;
    for (z = 1, end = N, asc = 1 <= end; asc ? z < end : z > end; asc ? z++ : z--) {
        var asc1, end1;
        for (x = 1, end1 = N, asc1 = 1 <= end1; asc1 ? x < end1 : x > end1; asc1 ? x++ : x--) {
            i = idx(x, z);
            // find neighbouring points in grid
            const iPrevX = idx(x - 1, z);
            const iNextX = idx(x + 1, z);
            const iPrevZ = idx(x, z - 1);
            const iNextZ = idx(x, z + 1);

            // evaluate the second space-derivatives using finite differences
            // see http://en.wikipedia.org/wiki/Finite_difference#Higher-order_differences
            const d2x = ((v[iNextX].y - (2 * v[i].y)) + v[iPrevX].y) / DELTA_X2;
            const d2z = ((v[iNextZ].y - (2 * v[i].y)) + v[iPrevZ].y) / DELTA_Z2;

            // the Wave partial differential equation in 2D
            // see https://en.wikipedia.org/wiki/Wave_equation
            // "d2x + d2z" is the spacial laplacian, ay is the acceleration w.r.t time
            v[i].ay = C2 * (d2x + d2z);

            // add a non-homogeneous term to introduce damping
            // see http://uhaweb.hartford.edu/noonburg/m344lecture16.pdf
            v[i].ay += -DAMPING * v[i].uy;

            // use Euler integration to find the new velocity w.r.t. time
            // and the new vertical position
            // see https://en.wikipedia.org/wiki/Euler_integration
            v[i].uy += dt * v[i].ay;
            v[i].newY = v[i].y + (dt * v[i].uy);
        }
    }

    // Commit the changes in the simulation
    // This is done in a separate step so that each simulation step doesn't affect itself
    for (z = 1, end2 = N, asc2 = 1 <= end2; asc2 ? z < end2 : z > end2; asc2 ? z++ : z--) {
        var asc3, end3;
        for (x = 1, end3 = N, asc3 = 1 <= end3; asc3 ? x < end3 : x > end3; asc3 ? x++ : x--) {
            i = idx(x, z);
            v[i].y = v[i].newY;
        }
    }

    geometry.verticesNeedUpdate = true;
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    return geometry.normalsNeedUpdate = true;
};

var hitTest = function(e) {
    // see http://mrdoob.github.io/three.js/examples/canvas_interactive_cubes.html for details on hit testing
    const vector = new THREE.Vector3(((e.clientX / window.innerWidth) * 2) - 1, (-(e.clientY / window.innerHeight) * 2) + 1, 0.5);
    projector.unprojectVector(vector, camera);

    const raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

    const intersects = raycaster.intersectObjects([mesh]);
    if (intersects.length) {
        const p = intersects[0].point;
        // create a new initial condition (droplet) based on clicked location
        return (() => {
            const result = [];
            for (let index = 0; index < geometry.vertices.length; index++) {
                const vertex = geometry.vertices[index];
                const x = vertex.x - p.x;
                const z = vertex.z - p.z;
                vertex.y += MAX_Y * Math.exp(-SIGMA * x * x) * Math.exp(-SIGMA * z * z);
                if ((vertex.x === (-W / 2)) || (vertex.x === (W / 2)) || (vertex.z === (-H / 2)) || (vertex.z === (H / 2))) {
                    result.push(vertex.y = 0);
                } else {
                    result.push(undefined);
                }
            }
            return result;
        })();
    }
};

init();
animate();