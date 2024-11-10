import * as THREE from '//unpkg.com/three/build/three.module.js';
import { Spaceship } from './Spaceship.js';
import { CollisionSystem } from './CollisionSystem.js';

export class CelestialSystem {
    constructor(world) {
        this.world = world;
        this.spaceship = new Spaceship();
        this.rotationAngle = 70;
        this.ROTATION_RADIUS = 10000;
        this.ROTATION_SPEED = 0.0005;
        
        this.initializeCelestialBodies();
        this.initializeLights();

        this.collisionSystem = new CollisionSystem(world);
        this.collisionSystem.addCollider(this.spaceship.mesh, 10);
        this.collisionSystem.addCollider(this.sun, 800);
        this.collisionSystem.addCollider(this.moon, 50);
        this.collisionSystem.addCollider(this.world.scene(), 95);
        
        // Add collision event listener
        document.addEventListener('collision', this.handleCollision.bind(this));
    }

    handleCollision(event) {
        const { spaceship, collider } = event.detail;
        
        // Add visual feedback for collision
        const flash = new THREE.PointLight(0xff0000, 1, 100);
        flash.position.copy(event.detail.position);
        this.world.scene().add(flash);
        
        // Remove flash after animation
        setTimeout(() => {
            this.world.scene().remove(flash);
        }, 200);
    }

    initializeCelestialBodies() {
        // Create Sun
        const sunGeometry = new THREE.SphereGeometry(800, 20, 20);
        const sunMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdd00,
            emissive: 0xffdd00,
            emissiveIntensity: 1,
            shininess: 100
        });
        
        const sunTexture = new THREE.TextureLoader().load('./Map_of_the_full_sun.jpg');
        sunMaterial.map = sunTexture;
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        
        // Create Moon
        const moonGeometry = new THREE.SphereGeometry(50, 20, 20);
        const moonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const moonTexture = new THREE.TextureLoader().load('./lroc_color_poles_1k.jpg');
        moonMaterial.map = moonTexture;
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        
        // Add to scene
        const group = new THREE.Group();
        group.add(this.sun);
        group.add(this.moon);
        group.add(this.spaceship.mesh);
        this.world.scene().add(group);
    }

    initializeLights() {
        const sunLight = new THREE.DirectionalLight(0xffffff, 5);
        sunLight.name = "SUNLIGHT";
        sunLight.color.setHSL(-2, 1, 0.95);
        
        const moonLight = new THREE.DirectionalLight(0xffffff, 0.1);
        moonLight.name = "MOONLIGHT";
        moonLight.color.setHSL(-2, 1, 0.95);
        
        this.world.lights([sunLight, moonLight]);
    }

    update() {
        this.updateCelestialPositions();
        this.updateTimeDisplay();
        this.collisionSystem.checkCollisions(this.spaceship);
    }

    updateCelestialPositions() {
        this.rotationAngle += this.ROTATION_SPEED;

        // Calculate positions
        const sunX = this.ROTATION_RADIUS * Math.cos(this.rotationAngle);
        const sunY = this.ROTATION_RADIUS * Math.sin(this.rotationAngle);
        const sunZ = this.ROTATION_RADIUS * Math.sin(this.rotationAngle);

        // Update sun position
        this.sun.position.set(sunX, sunY, sunZ);
        
        // Update moon position
        this.moon.position.set(-sunX/10, -sunY/10, -sunZ/10);
        
        // Update lights
        const lightScale = 0.001;
        const sunLight = this.world.lights().find(light => light.name === 'SUNLIGHT');
        const moonLight = this.world.lights().find(light => light.name === 'MOONLIGHT');
        
        if (sunLight) {
            sunLight.position.set(sunX * lightScale, sunY * lightScale, sunZ * lightScale);
        }
        
        if (moonLight) {
            moonLight.position.set(-sunX * lightScale, -sunY * lightScale, -sunZ * lightScale);
        }
    }

    updateTimeDisplay() {
        const hours = ((this.rotationAngle % (Math.PI * 2)) / (Math.PI * 2)) * 24;
        const date = new Date();
        date.setHours(hours);
        const timeEl = document.getElementById('time');
        if (timeEl) {
            timeEl.textContent = date.toLocaleTimeString();
        }
    }
}