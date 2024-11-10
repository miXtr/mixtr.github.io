import * as THREE from '//unpkg.com/three/build/three.module.js';

export class Spaceship {
    constructor() {
        this.mesh = this.createSpaceshipMesh();
        //this.engineEffect = new EngineEffect();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 2.0;
        this.drag = 0.98;
        this.enginePower = 0.1;
        this.rotationSpeed = 0.03;
        this.position = new THREE.Vector3(0, 0, 120);

        // Set initial position of the mesh
        this.mesh.position.copy(this.position);
    }

    createSpaceshipMesh() {
        const shipGroup = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.ConeGeometry(1, 10, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x3366ff,
            specular: 0x111111,
            shininess: 100,
            metalness: 0.8,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI * 0.5;
        shipGroup.add(body);

        // Wings
        const wingGeometry = new THREE.BoxGeometry(5, 0.2, 3);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0x2255cc,
            specular: 0x111111,
            shininess: 100
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        //wings.position.y = 2;
        shipGroup.add(wings);

        return shipGroup;
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    update() {
        // Update physics
        this.velocity.add(this.acceleration);
        this.velocity.multiplyScalar(this.drag);
        this.velocity.clampLength(0, this.maxSpeed);
        this.mesh.position.add(this.velocity);
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
    }
}