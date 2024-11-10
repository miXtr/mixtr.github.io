import * as THREE from '//unpkg.com/three/build/three.module.js';
import { SpaceshipController } from './SpaceshipController.js';
import { CelestialSystem } from './CelestialSystem.js';
import { MultiplayerManager } from './MultiplayerManager.js';

// Initialize the world
let world;
let spaceshipController;
let celestialSystem;
let multiplayerManager;

async function initializeWorld() {
    const countries = await fetch('../ne_110m_admin_0_countries.geojson').then(res => res.json());
    
    // Initialize Globe
    world = Globe({ animateIn: false })(document.getElementById('globeViz'))
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
            .polygonAltitude(d => d === hoverD ? 0.03 : 0.006));

    // Initialize systems
    celestialSystem = new CelestialSystem(world);
    spaceshipController = new SpaceshipController(world, celestialSystem.spaceship);
    
    // Initialize multiplayer
    multiplayerManager = new MultiplayerManager(world, celestialSystem.spaceship);

    // Set up Earth materials
    setupEarthMaterials();
    
    // Start animation
    requestAnimationFrame(animate);
}

function log(polygon, event, { lat, lng, altitude }){
    console.log(lat, lng, altitude);
    var rotate = world.controls().autoRotate;
    world.controls().autoRotate = !rotate;
};

function setupEarthMaterials() {
    // Load Earth textures
    const earthWater = new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-water.png');
    const citylightsT = new THREE.TextureLoader().load('./night_lights_modified.png');
    
    // Apply materials to globe
    world.globeMaterial().specularMap = earthWater;
    world.globeMaterial().specular = new THREE.Color('grey');
    world.globeMaterial().shininess = 15;
    world.globeMaterial().bumpScale = 10;
    world.globeMaterial().emissiveMap = citylightsT;
    world.globeMaterial().emissiveIntensity = 0.2;
    world.globeMaterial().emissive = new THREE.Color(0xffff88);
    initializeClouds();
}

function initializeClouds() {
    const CLOUDS_IMG_URL = './clouds.png';
    const CLOUDS_ALT = 0.002;
    const CLOUDS_ROTATION_SPEED = 0.003;

    new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(
                world.getGlobeRadius() * (1 + CLOUDS_ALT),
                75,
                75
            ),
            new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
        );
        world.scene().add(clouds);

        (function rotateClouds() {
            clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
            requestAnimationFrame(rotateClouds);
        })();
    });
};

function animate() {
    spaceshipController.update();
    celestialSystem.update();

    requestAnimationFrame(animate);
}

// Initialize everything
initializeWorld();