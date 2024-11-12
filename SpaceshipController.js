import * as THREE from '//unpkg.com/three/build/three.module.js';

export class SpaceshipController {
    constructor(world, spaceship) {
        this.world = world;
        this.spaceship = spaceship;
        this.keys = {
            w: false, s: false, a: false, d: false,
            q: false, e: false, shift: false, space: false
        };

        this.isMoving = false;
        this.turnSpeed = 0.02; // Adjust this value to control how fast the ship turns

        this.globeRadius = 100;
        this.minDistance = this.globeRadius + 30; // Keep 10 units above the surface
        this.maxDistance = this.globeRadius * 30;  // Don't go too far from globe

        this.camera = {
            offset: new THREE.Vector3(0, 0.5, 5),
            smoothness: 0.1,
            lookAheadDistance: 3,
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

        this.inertia = 0.98;
        this.rotationInertia = 0.95;
        this.currentThrust = 0;
        this.maxThrust = 0.2;
        this.thrustIncrement = 0.01;
    }

    shootLaser() {
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
        // Check if any movement keys are pressed
        this.isMoving = Object.values(this.keys).some(key => key);
        if (this.isMoving) {
            this.handleMovement();
        } else {
            this.turnTowardCenter();
        }
        //this.handleMovement();
        this.updateCamera();
        this.spaceship.update();

        if (this.keys.space) {
            this.shootLaser();
        }
    }

    maintainSafeDistance() {
        // Calculate distance from center
        const distanceFromCenter = this.spaceship.mesh.position.length();
        
        // If too close to the surface
        if (distanceFromCenter < this.minDistance) {
            // Normalize the position vector and scale it to minimum distance
            this.spaceship.mesh.position.normalize().multiplyScalar(this.minDistance);
            
            // Cancel any velocity moving towards the center
            const radialVelocity = this.spaceship.velocity.dot(this.spaceship.mesh.position.normalize());
            if (radialVelocity < 0) {
                const radialComponent = this.spaceship.mesh.position.clone()
                    .normalize()
                    .multiplyScalar(radialVelocity);
                this.spaceship.velocity.sub(radialComponent);
                
                // Add a small outward bounce
                this.spaceship.velocity.add(
                    this.spaceship.mesh.position.clone()
                        .normalize()
                        .multiplyScalar(0.1)
                );
            }
        }
        
        // If too far from the globe
        if (distanceFromCenter > this.maxDistance) {
            this.spaceship.mesh.position.normalize().multiplyScalar(this.maxDistance);
            // Add a small force towards the center
            this.spaceship.applyForce(
                this.spaceship.mesh.position.clone()
                    .normalize()
                    .multiplyScalar(-0.1)
            );
        }
    }

    turnTowardCenter() {
        // Calculate direction to center
        const directionToCenter = new THREE.Vector3(0, 0, 0)
            .sub(this.spaceship.mesh.position)
            .normalize();

        // Get current forward direction of the spaceship
        const currentDirection = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.spaceship.mesh.quaternion);

        // Calculate the rotation needed
        const targetQuaternion = new THREE.Quaternion()
            .setFromRotationMatrix(
                new THREE.Matrix4().lookAt(
                    this.spaceship.mesh.position,
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 1, 0)
                )
            );

        // Smoothly interpolate the rotation
        this.spaceship.mesh.quaternion.slerp(targetQuaternion, this.turnSpeed);

        // Only apply force towards center if we're outside the safe zone
        const distanceFromCenter = this.spaceship.mesh.position.length();
        if (distanceFromCenter > this.minDistance + 5) {  // Add a small buffer
            this.spaceship.applyForce(directionToCenter.multiplyScalar(0.01));
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