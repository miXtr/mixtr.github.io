import * as THREE from '//unpkg.com/three/build/three.module.js';

export class CollisionSystem {
    constructor(world) {
        this.world = world;
        this.colliders = [];
        this.boundingSpheres = new Map();
    }

    addCollider(object, radius) {
        this.colliders.push(object);
        this.boundingSpheres.set(object, new THREE.Sphere(object.position, radius));
    }

    removeCollider(object) {
        const index = this.colliders.indexOf(object);
        if (index > -1) {
            this.colliders.splice(index, 1);
            this.boundingSpheres.delete(object);
        }
    }

    checkCollisions(spaceship) {
        const spaceshipSphere = this.boundingSpheres.get(spaceship.mesh);
        if (!spaceshipSphere) return;

        spaceshipSphere.center.copy(spaceship.mesh.position);

        for (const collider of this.colliders) {
            if (collider === spaceship.mesh) continue;

            const colliderSphere = this.boundingSpheres.get(collider);
            if (!colliderSphere) continue;

            colliderSphere.center.copy(collider.position);

            if (spaceshipSphere.intersectsSphere(colliderSphere)) {
                this.handleCollision(spaceship, collider);
            }
        }
    }

    handleCollision(spaceship, collider) {
        // Calculate collision response
        const direction = new THREE.Vector3()
            .subVectors(spaceship.mesh.position, collider.position)
            .normalize();

        // Bounce effect
        spaceship.velocity.reflect(direction);
        spaceship.velocity.multiplyScalar(0.5); // Reduce velocity after collision

        // Push spaceship away from collision
        spaceship.mesh.position.add(direction.multiplyScalar(5));

        // Emit collision event
        this.emitCollisionEvent(spaceship, collider);
    }

    emitCollisionEvent(spaceship, collider) {
        const event = new CustomEvent('collision', {
            detail: {
                spaceship: spaceship,
                collider: collider,
                position: spaceship.mesh.position.clone()
            }
        });
        document.dispatchEvent(event);
    }
}