import * as THREE from '//unpkg.com/three/build/three.module.js';

export class SpaceshipController {
    constructor(world, spaceship) {
        this.world = world;
        this.spaceship = spaceship;
        this.keys = {
            w: false, s: false, a: false, d: false,
            q: false, e: false, shift: false, space: false
        };
        this.camera = {
            offset: new THREE.Vector3(0, 0.5, 5),
            smoothness: 0.1,
            lookAheadDistance: 30,
            heightDamping: 0.3
        };
        
       // Laser beam setup
       this.laserMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        this.laserBeams = [];
        this.laserLength = 100;
        this.laserLifetime = 1000; // milliseconds
        this.lastShotTime = 0;
        this.shootingDelay = 200; // milliseconds between shots

        this.setupEventListeners();
    }

    shootLaser() {
        console.log("shoot");
        const currentTime = Date.now();
        if (currentTime - this.lastShotTime < this.shootingDelay) {
            return;
        }
        this.lastShotTime = currentTime;

        // Calculate laser direction based on spaceship's orientation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.spaceship.mesh.quaternion);
        
        // Create laser beam geometry
        const laserGeometry = new THREE.BufferGeometry().setFromPoints([
            this.spaceship.mesh.position.clone(),
            this.spaceship.mesh.position.clone().add(direction.multiplyScalar(this.laserLength))
        ]);
        
        // Create laser beam
        const laser = new THREE.Line(laserGeometry, this.laserMaterial);
        this.world.scene().add(laser);
        
        // Add laser to tracking array with creation time
        this.laserBeams.push({
            beam: laser,
            creationTime: currentTime
        });

        // Add glow effect
        const glowGeometry = new THREE.CylinderGeometry(0.1, 0.1, this.laserLength, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(this.spaceship.mesh.position);
        glow.quaternion.copy(this.spaceship.mesh.quaternion);
        glow.rotateX(Math.PI / 2);
        this.world.scene().add(glow);

        // Remove laser and glow after lifetime
        setTimeout(() => {
            this.world.scene().remove(laser);
            this.world.scene().remove(glow);
            this.laserBeams = this.laserBeams.filter(item => item.beam !== laser);
        }, this.laserLifetime);
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('mousemove', this.handleMouseMove);
    }

    handleKeyDown = (event) => {
        if (event.key === ' ') {
            this.keys.space = true;
        } else if (this.keys.hasOwnProperty(event.key.toLowerCase())) {
            this.keys[event.key.toLowerCase()] = true;
        }
    }

    handleKeyUp = (event) => {
        if (event.key === ' ') {
            this.keys.space = false;
        } else if (this.keys.hasOwnProperty(event.key.toLowerCase())) {
            this.keys[event.key.toLowerCase()] = false;
        }
    }

    handleMouseDown = () => {
        this.isMouseDown = true;
    }

    handleMouseUp = () => {
        this.isMouseDown = false;
    }

    handleMouseMove = (event) => {
        if (this.isMouseDown) {
            const mouseSensitivity = 0.002;
            const deltaX = event.movementX * mouseSensitivity;
            const deltaY = event.movementY * mouseSensitivity;

            this.spaceship.mesh.rotation.y -= deltaX;
            this.spaceship.mesh.rotation.x = Math.max(
                Math.min(this.spaceship.mesh.rotation.x - deltaY, Math.PI * 0.25),
                -Math.PI * 0.25
            );
        }
    }

    update() {
        this.handleMovement();
        this.updateCamera();
        this.spaceship.update();

        if (this.keys.space) {
            this.shootLaser();
        }
    }

    handleMovement() {
        const moveSpeed = this.keys.shift ? 0.2 : 0.1;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.spaceship.mesh.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.spaceship.mesh.quaternion);
        const up = new THREE.Vector3(0, 1, 0);

        // Apply forces based on input
        if (this.keys.w) this.spaceship.applyForce(forward.multiplyScalar(moveSpeed));
        if (this.keys.s) this.spaceship.applyForce(forward.multiplyScalar(-moveSpeed));
        if (this.keys.d) this.spaceship.applyForce(right.multiplyScalar(moveSpeed));
        if (this.keys.a) this.spaceship.applyForce(right.multiplyScalar(-moveSpeed));
        if (this.keys.q) this.spaceship.applyForce(up.multiplyScalar(moveSpeed));
        if (this.keys.e) this.spaceship.applyForce(up.multiplyScalar(-moveSpeed));
    }

    updateCamera() {
        const spaceshipForward = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(this.spaceship.mesh.quaternion);
        
        const cameraPosition = this.spaceship.mesh.position.clone();
        const offsetVector = this.camera.offset.clone()
            .applyQuaternion(this.spaceship.mesh.quaternion);
        
        cameraPosition.add(offsetVector);
        
        const lookTarget = this.spaceship.mesh.position.clone();
        spaceshipForward.multiplyScalar(this.camera.lookAheadDistance);
        lookTarget.add(spaceshipForward);
        
        this.world.camera().position.lerp(cameraPosition, this.camera.smoothness);
        this.world.camera().lookAt(lookTarget);
        this.world.camera().quaternion.copy(this.spaceship.mesh.quaternion);
        this.world.controls().target.copy(this.spaceship.mesh.position);
    }
}