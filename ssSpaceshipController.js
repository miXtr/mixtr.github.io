import * as THREE from '//unpkg.com/three/build/three.module.js';

export class SpaceshipController {
    constructor(world, spaceship) {
        this.world = world;
        this.spaceship = spaceship;
        this.keys = {
            w: false, s: false, a: false, d: false,
            q: false, e: false, shift: false, space: false
        };

        // Movement parameters
        this.baseSpeed = 0.1;
        this.boostSpeed = 0.3;
        this.acceleration = 0.005;
        this.deceleration = 0.003;
        this.currentSpeed = 0;
        this.maxSpeed = this.baseSpeed;
        
        // Rotation parameters
        this.turnSpeed = 0.02;
        this.rollSpeed = 0.03;
        this.stabilizationSpeed = 0.02;
        this.bankingFactor = 0.15; // How much the ship tilts during turns
        
        // Movement state
        this.isMoving = false;
        this.isBoosting = false;
        this.currentRoll = 0;
        this.targetRoll = 0;
        
        // Environmental parameters
        this.globeRadius = 100;
        this.minDistance = this.globeRadius + 30;
        this.maxDistance = this.globeRadius * 30;
        this.gravitationalPull = 0.001;
        
        // Camera settings
        this.camera = {
            offset: new THREE.Vector3(0, 0.5, 5),
            smoothness: 0.1,
            lookAheadDistance: 3,
            heightDamping: 0.3,
            shake: {
                intensity: 0,
                decay: 0.95,
                max: 0.2
            }
        };

        // Add thrust particles
        this.setupThrustParticles();
        
        // Setup controls
        this.setupEventListeners();
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

    setupThrustParticles() {
        // Create particle system for engine thrust
        const particleCount = 1000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = 0;
            colors[i] = i % 3 === 0 ? 1 : 0.5; // Create orange/yellow color
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        this.thrustParticles = new THREE.Points(particles, particleMaterial);
        this.world.scene().add(this.thrustParticles);
    }

    updateThrustParticles() {
        if (!this.isMoving) {
            this.thrustParticles.visible = false;
            return;
        }

        this.thrustParticles.visible = true;
        const positions = this.thrustParticles.geometry.attributes.position.array;
        const particleCount = positions.length / 3;
        
        // Get the backward direction of the ship
        const backward = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(this.spaceship.mesh.quaternion);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Reset particles that are too far from the ship
            if (Math.random() < 0.1) {
                positions[i3] = this.spaceship.mesh.position.x + (Math.random() - 0.5) * 0.5;
                positions[i3 + 1] = this.spaceship.mesh.position.y + (Math.random() - 0.5) * 0.5;
                positions[i3 + 2] = this.spaceship.mesh.position.z + (Math.random() - 0.5) * 0.5;
            }
            
            // Move particles backward
            positions[i3] += backward.x * this.currentSpeed * 2;
            positions[i3 + 1] += backward.y * this.currentSpeed * 2;
            positions[i3 + 2] += backward.z * this.currentSpeed * 2;
        }
        
        this.thrustParticles.geometry.attributes.position.needsUpdate = true;
    }

    update() {
        this.handleInput();
        this.updateMovement();
        this.updateRotation();
        this.maintainSafeDistance();
        this.updateCamera();
        this.updateThrustParticles();
        this.spaceship.update();
    }

    handleInput() {
        // Update boost state
        this.isBoosting = this.keys.shift;
        this.maxSpeed = this.isBoosting ? this.boostSpeed : this.baseSpeed;
        
        // Update movement state
        this.isMoving = this.keys.w || this.keys.s;
        
        // Calculate target roll based on turning
        if (this.keys.d) this.targetRoll = -this.bankingFactor;
        else if (this.keys.a) this.targetRoll = this.bankingFactor;
        else this.targetRoll = 0;
    }

    updateMovement() {
        // Update speed
        if (this.isMoving) {
            if (this.keys.w) {
                this.currentSpeed = Math.min(this.currentSpeed + this.acceleration, this.maxSpeed);
            } else if (this.keys.s) {
                this.currentSpeed = Math.max(this.currentSpeed - this.acceleration, -this.maxSpeed * 0.5);
            }
        } else {
            // Apply deceleration
            if (Math.abs(this.currentSpeed) > 0.001) {
                this.currentSpeed *= (1 - this.deceleration);
            } else {
                this.currentSpeed = 0;
            }
        }

        // Apply movement
        const forward = new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.spaceship.mesh.quaternion)
            .multiplyScalar(this.currentSpeed);
        
        this.spaceship.velocity.add(forward);
        
        // Apply gravity towards the center
        const directionToCenter = new THREE.Vector3()
            .subVectors(new THREE.Vector3(), this.spaceship.mesh.position)
            .normalize();
        
        this.spaceship.velocity.add(
            directionToCenter.multiplyScalar(this.gravitationalPull)
        );
    }

    updateRotation() {
        // Smooth roll transition
        this.currentRoll = THREE.MathUtils.lerp(
            this.currentRoll,
            this.targetRoll,
            this.rollSpeed
        );
        
        // Apply roll
        this.spaceship.mesh.rotation.z = this.currentRoll;
        
        // Handle turning
        if (this.keys.d) {
            this.spaceship.mesh.rotateY(-this.turnSpeed);
            // Add camera shake during sharp turns
            this.addCameraShake(0.05);
        }
        if (this.keys.a) {
            this.spaceship.mesh.rotateY(this.turnSpeed);
            this.addCameraShake(0.05);
        }
        
        // Vertical movement
        if (this.keys.q) this.spaceship.mesh.rotateX(-this.turnSpeed);
        if (this.keys.e) this.spaceship.mesh.rotateX(this.turnSpeed);
        
        // Auto-stabilize pitch when no vertical input
        if (!this.keys.q && !this.keys.e) {
            this.spaceship.mesh.rotation.x *= (1 - this.stabilizationSpeed);
        }
    }

    addCameraShake(amount) {
        this.camera.shake.intensity = Math.min(
            this.camera.shake.intensity + amount,
            this.camera.shake.max
        );
    }

    updateCamera() {
        // Calculate base camera position
        const cameraOffset = this.camera.offset.clone()
            .applyQuaternion(this.spaceship.mesh.quaternion);
        const targetPosition = this.spaceship.mesh.position.clone().add(cameraOffset);
        
        // Apply camera shake
        if (this.camera.shake.intensity > 0.001) {
            targetPosition.x += (Math.random() - 0.5) * this.camera.shake.intensity;
            targetPosition.y += (Math.random() - 0.5) * this.camera.shake.intensity;
            targetPosition.z += (Math.random() - 0.5) * this.camera.shake.intensity;
            this.camera.shake.intensity *= this.camera.shake.decay;
        }
        
        // Smooth camera movement
        this.world.camera().position.lerp(targetPosition, this.camera.smoothness);
        
        // Look ahead of the ship based on velocity
        const lookAheadOffset = this.spaceship.velocity.clone()
            .multiplyScalar(this.camera.lookAheadDistance);
        const lookTarget = this.spaceship.mesh.position.clone().add(lookAheadOffset);
        
        this.world.camera().lookAt(lookTarget);
    }

    maintainSafeDistance() {
        const distanceFromCenter = this.spaceship.mesh.position.length();
        
        // Handle minimum distance (bounce off atmosphere)
        if (distanceFromCenter < this.minDistance) {
            const normal = this.spaceship.mesh.position.clone().normalize();
            const bounceForce = 0.2;
            
            // Position correction
            this.spaceship.mesh.position.copy(
                normal.multiplyScalar(this.minDistance)
            );
            
            // Velocity reflection
            const reflection = this.spaceship.velocity.clone()
                .reflect(normal)
                .multiplyScalar(0.8); // Add some energy loss
            
            this.spaceship.velocity.copy(reflection);
            this.addCameraShake(0.15); // Add camera shake on bounce
        }
        
        // Handle maximum distance (gentle pull back)
        if (distanceFromCenter > this.maxDistance) {
            const pullDirection = this.spaceship.mesh.position.clone()
                .normalize()
                .multiplyScalar(-0.1);
            
            this.spaceship.velocity.add(pullDirection);
            this.spaceship.mesh.position.normalize()
                .multiplyScalar(this.maxDistance);
        }
    }
}