import * as THREE from '//unpkg.com/three/build/three.module.js';

fetch('../ne_110m_admin_0_countries.geojson').then(res => res.json()).then(countries =>
//fetch('../ne_10m_time_zones_1.geojson').then(res => res.json()).then(timezones =>
//fetch('../timezone_0.geojson').then(res => res.json()).then(timezones =>
{
    let x = -300;
    let y = 300;
    let z = 3000;

    const timeEl = document.getElementById('time');
    const world = Globe({ animateIn: false })
    (document.getElementById('globeViz'))
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereAltitude(0.3)
        .lineHoverPrecision(0)
        .polygonsData(countries.features.filter(d => d.properties.ISO_A2 !== 'AQ'))
        .polygonAltitude(0.006)
        .polygonsTransitionDuration(200)
        .polygonCapColor(() => 'rgba(34,139,34, 0.1)')
        .polygonSideColor(() => 'rgba(34,139,34, 0.1)')
        .polygonStrokeColor(() => '#111')
        .polygonLabel(({ properties: d }) => `
            <b>${d.ADMIN} (${d.ISO_A2}):</b> <br />
            GDP: <i>${d.GDP_MD_EST}</i> M$<br/>
            Population: <i>${d.POP_EST}</i>
        `)
        .onPolygonClick(log)
        .onPolygonHover(hoverD => world
            .polygonAltitude(d => d === hoverD ? 0.03 : 0.006),
            //.polygonCapColor(d => d === hoverD ? 'steelblue' : 'rgba(200, 0, 0, 0.6)')
    )

    world.polygonsData(countries.features);

    const moonGeometry = new THREE.SphereGeometry( 50, 20, 20 );
    const moonMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff } );
    let moonTexture = new THREE.TextureLoader().load('./lroc_color_poles_1k.jpg');
    moonMaterial.map = moonTexture;

    const group = new THREE.Group();

    const moon = new THREE.Mesh( moonGeometry, moonMaterial );
    moon.position.set( -x , -y , -z );
    group.add( moon );

    world.scene().add(group);

// Modified Sun creation code
const sunGeometry = new THREE.SphereGeometry(800, 20, 20);
const sunMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffdd00,
    emissive: 0xffdd00,
    emissiveIntensity: 1,
    shininess: 100
});
let sunTexture = new THREE.TextureLoader().load('./Map_of_the_full_sun.jpg');
sunMaterial.map = sunTexture;

const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(x, y, z);

// Add glow effect
const sunGlowGeometry = new THREE.SphereGeometry(850, 20, 20);
const sunGlowMaterial = new THREE.ShaderMaterial({
    uniforms: {
        c: { type: "f", value: 0.5 },
        p: { type: "f", value: 3.0 },
        glowColor: { type: "c", value: new THREE.Color(0xffdd00) },
        viewVector: { type: "v3", value: world.camera().position }
    },
    vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormalized = normalize(viewVector);
            intensity = pow(0.63 - dot(vNormal, vNormalized), 3.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
            vec3 glow = glowColor * intensity;
            gl_FragColor = vec4(glow, 1.0);
        }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true
});

const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
sun.add(sunGlow);
group.add(sun);

// Add animation for the glow
function animateSunGlow() {
    if (sunGlowMaterial.uniforms) {
        sunGlowMaterial.uniforms.viewVector.value = new THREE.Vector3().subVectors(
            world.camera().position,
            sun.position
        );
    }
}

// Create a spaceship with custom geometry
function createSpaceship() {
    const shipGroup = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x3366ff,
        specular: 0x111111,
        shininess: 100,
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI * 0.5; // Rotate to point forward
    shipGroup.add(body);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(30, 2, 10);
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x2255cc,
        specular: 0x111111,
        shininess: 100
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = -2;
    shipGroup.add(wings);

    // Engine glow
    const engineGlow = new THREE.PointLight(0x00ffff, 2, 10);
    engineGlow.position.z = -5;
    shipGroup.add(engineGlow);

    // Add some details (antenna, etc.)
    const detailGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8);
    const detailMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        specular: 0x666666
    });
    const antenna = new THREE.Mesh(detailGeometry, detailMaterial);
    antenna.position.y = 5;
    shipGroup.add(antenna);

    return shipGroup;
}

// Add engine trails
function createEngineTrail() {
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.5,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    const positions = new Float32Array(300 * 3); // 100 particles * 3 coordinates
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particles = new THREE.Points(trailGeometry, trailMaterial);
    return particles;
}

const engineTrail = createEngineTrail();
world.scene().add(engineTrail);

// Update trail positions in animation loop
function updateEngineTrail() {
    const positions = engineTrail.geometry.attributes.position.array;

    // Shift existing positions
    for (let i = positions.length - 1; i >= 3; i--) {
        positions[i] = positions[i - 3];
    }

    // Add new position at start
    positions[0] = spaceship.position.x;
    positions[1] = spaceship.position.y;
    positions[2] = spaceship.position.z - 5; // Offset for engine position

    engineTrail.geometry.attributes.position.needsUpdate = true;
}

// Add shield effect
function createShieldEffect() {
    const shieldGeometry = new THREE.SphereGeometry(15, 32, 32);
    const shieldMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });

    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    return shield;
}


// Add animation for the shield
function animateShield() {
    shield.scale.x = 1 + Math.sin(Date.now() * 0.001) * 0.05;
    shield.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.05;
    shield.scale.z = 1 + Math.sin(Date.now() * 0.001) * 0.05;
}

const spaceship = createSpaceship();
spaceship.position.set(150, 0, 150);
//const shield = createShieldEffect();
//spaceship.add(shield);
group.add(spaceship);
let previousCubePosition = spaceship.position.clone();

// Add space dust particles
function createSpaceDust() {
    const particles = new THREE.BufferGeometry();
    const particleCount = 1000;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 1000;
        positions[i + 1] = (Math.random() - 0.5) * 1000;
        positions[i + 2] = (Math.random() - 0.5) * 1000;

        colors[i] = Math.random();
        colors[i + 1] = Math.random();
        colors[i + 2] = Math.random();
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Points(particles, material);
}

const spaceDust = createSpaceDust();
world.scene().add(spaceDust);

let earthWater = new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-water.png');//, texture => {
world.globeMaterial().specularMap = earthWater;
world.globeMaterial().specular = new THREE.Color('grey');
world.globeMaterial().shininess = 15;

world.globeMaterial().bumpScale = 10;

let citylightsT = new THREE.TextureLoader().load('./night_lights_modified.png');
world.globeMaterial().emissiveMap = citylightsT;
world.globeMaterial().emissiveIntensity = 0.2;
world.globeMaterial().emissive = new THREE.Color(0xffff88);

const colorX = new THREE.Color( 'blue' );
const colorY = new THREE.Color( 'green' );
const colorZ = new THREE.Color( 'pink' );
const axesHelper = new THREE.AxesHelper( 500 );
axesHelper.setColors(colorX, colorY, colorZ);
//world.scene().add( axesHelper );

world.lights([]);

createLight();
function createLight()
{
    const dirLight1 = new THREE.DirectionalLight( 0xffffff, 0.1 );
    dirLight1.name= "MOONLIGHT";
    dirLight1.color.setHSL( -2, 1, 0.95 );
    dirLight1.position.set( -x, -y, -z );

    const dirLight = new THREE.DirectionalLight( 0xffffff, 5 );
    dirLight.name = "SUNLIGHT";
    dirLight.color.setHSL( -2, 1, 0.95 );
    dirLight.position.set( x, y, z);
    //dirLight.position.multiplyScalar( 30 );

    world.lights([dirLight, dirLight1]);
}

// Add clouds sphere
const CLOUDS_IMG_URL = './clouds.png';
const CLOUDS_ALT = 0.002;
const CLOUDS_ROTATION_SPEED = 0.003;

new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(world.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
    new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
);
world.scene().add(clouds);

    (function rotateClouds() {
        clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
        requestAnimationFrame(rotateClouds);
    })();
});

function log(polygon, event, { lat, lng, altitude }){
    console.log(lat, lng, altitude);
    var rotate = world.controls().autoRotate;
    world.controls().autoRotate = !rotate;

    //world.polygonsData([]);
};

// Create an object to track pressed keys
const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    q: false,
    e: false,
    shift: false
};

// Track keydown events
document.addEventListener("keydown", (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 'd':
            keys.d = true;
            break;
        case 'q':
            keys.q = true;
            break;
        case 'e':
            keys.e = true;
            break;
        case 'shift':
            keys.shift = true;
            break;
    }
});

// Track keyup events
document.addEventListener("keyup", (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 'd':
            keys.d = false;
            break;
        case 'q':
            keys.q = false;
            break;
        case 'e':
            keys.e = false;
            break;
        case 'shift':
            keys.shift = false;
            break;
    }
});

// Handle movement in the animation loop
function handleMovement() {
    const moveSpeed = keys.shift ? 2.0 : 1.0;

    // Create movement vector
    const movement = new THREE.Vector3(0, 0, 0);

    const sensitivity = 0.002;
    const delta = moveSpeed * sensitivity;

    // Store previous position for smooth camera following
    previousCubePosition.copy(spaceship.position);
    // Forward/backward movement (relative to cube's rotation)
    if (keys.w) {
        movement.z -= moveSpeed;
    }
    if (keys.s) {
        movement.z += moveSpeed;
    }

    // Left/right movement (relative to cube's rotation)
    if (keys.a) {
        movement.x -= moveSpeed;
    }
    if (keys.d) {
        movement.x += moveSpeed;
    }

    // Up/down movement
    if (keys.q) movement.y += moveSpeed;
    if (keys.e) movement.y -= moveSpeed;

    // Apply movement relative to cube's rotation
    movement.applyQuaternion(spaceship.quaternion);
    spaceship.position.add(movement);
}

// Add rotation handling
function handleRotation() {
    const rotateSpeed = 0.03;

    // Rotate left/right
    if (keys.a) {
        spaceship.rotation.z += rotateSpeed;
        spaceship.rotation.y += rotateSpeed;
    }
    if (keys.d) {
        spaceship.rotation.z -= rotateSpeed;
        spaceship.rotation.y -= rotateSpeed;
    } 

    // Optional: Add pitch control (up/down rotation)
    if (keys.w) spaceship.rotation.x -= rotateSpeed * 0.5;
    if (keys.s) spaceship.rotation.x += rotateSpeed * 0.5;

    // Limit pitch rotation to prevent flipping
    spaceship.rotation.x = Math.max(Math.min(spaceship.rotation.x, Math.PI * 0.25), -Math.PI * 0.25);
}



const cameraSettings = {
    offset: new THREE.Vector3(0, 3, 20), // Positive Z to move in front
    smoothness: 0.1,
    lookAheadDistance: 30, // Looking forward
    heightDamping: 0.3
};

function frontViewCamera() {
    // Get the spaceship's forward direction
    const spaceshipForward = new THREE.Vector3(0, 0, 1);
    spaceshipForward.applyQuaternion(spaceship.quaternion);

    // Calculate camera position relative to spaceship
    const cameraPosition = spaceship.position.clone();

    // Apply offset in spaceship's local space
    const offsetVector = cameraSettings.offset.clone();
    offsetVector.applyQuaternion(spaceship.quaternion);
    cameraPosition.add(offsetVector);

    // Calculate look target (ahead of the spaceship)
    const lookTarget = spaceship.position.clone();
    spaceshipForward.multiplyScalar(cameraSettings.lookAheadDistance);
    lookTarget.add(spaceshipForward);

    // Smooth camera movement
    world.camera().position.lerp(cameraPosition, cameraSettings.smoothness);

    // Update camera look direction
    world.camera().lookAt(lookTarget);

    // Match camera rotation to spaceship rotation
    world.camera().quaternion.copy(spaceship.quaternion);

    world.controls().target.copy(spaceship.position);
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 1;
}

requestAnimationFrame(() =>
    (function animate() {
        
        handleMovement();
        handleRotation();
        frontViewCamera();
        updateEngineTrail();
        //animateShield();
        animateSunGlow();
        // Disable any automatic camera controls
        world.controls().enabled = false;

        rotateSunLight();

        requestAnimationFrame(animate);
    })())


 // Add these variables at the top with your other constants
const ROTATION_RADIUS = 10000; // Distance of sun from earth center
const ROTATION_SPEED = 0.0005; // Speed of rotation
let rotationAngle = 70; // Current angle of rotation

// Replace the existing rotateSunLight function with this new version
function rotateSunLight() {
    // Update the rotation angle
    rotationAngle += ROTATION_SPEED;

    // Calculate new position using trigonometric functions
    const sunX = ROTATION_RADIUS * Math.cos(rotationAngle);
    const sunZ = ROTATION_RADIUS * Math.sin(rotationAngle);
    const sunY = ROTATION_RADIUS * Math.sin(rotationAngle);
    //console.log(sunX, sunY, sunZ);
    // Update sun position
    sun.position.set(sunX, sunY, sunZ);
    
    // Update sun's light position
    const sunLight = world.lights().find(light => light.name === 'SUNLIGHT');
    if (sunLight) {
        // Scale down the position for the directional light
        const lightScale = 0.001; // Adjust this value to change light distance
        sunLight.position.set(sunX * lightScale, sunY * lightScale, sunZ * lightScale);
    }

    // Update moon position (opposite to sun)
    moon.position.set(-sunX/10, -sunY/10, -sunZ/10);
    
    // Update moon's light position
    const moonLight = world.lights().find(light => light.name === 'MOONLIGHT');
    if (moonLight) {
        const lightScale = 0.001;
        moonLight.position.set(-sunX * lightScale, -sunY * lightScale, -sunZ * lightScale);
    }

    // Optional: Update the time based on sun position
    const hours = ((rotationAngle % (Math.PI * 2)) / (Math.PI * 2)) * 24;
    const date = new Date();
    date.setHours(hours);
    if (timeEl) {
        timeEl.textContent = date.toLocaleTimeString();
    }
}

// Add mouse look control
let isMouseDown = false;

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        const mouseSensitivity = 0.002;
        const deltaX = event.movementX * mouseSensitivity;
        const deltaY = event.movementY * mouseSensitivity;

        spaceship.rotation.y -= deltaX;
        spaceship.rotation.x = Math.max(
            Math.min(spaceship.rotation.x - deltaY, Math.PI * 0.25),
            -Math.PI * 0.25
        );
    }
});

});