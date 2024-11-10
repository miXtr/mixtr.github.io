import * as THREE from '//unpkg.com/three/build/three.module.js';
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

export class MultiplayerManager {
    constructor(world, localSpaceship) {
        this.world = world;
        this.localSpaceship = localSpaceship;
        this.remotePlayers = new Map();
        this.socket = io();
        
        this.setupSocketHandlers();
        this.startUpdateLoop();
    }

    setupSocketHandlers() {
        // Handle initial players list
        this.socket.on('players', (players) => {
            players.forEach(playerData => {
                if (playerData.id !== this.socket.id) {
                    this.addRemotePlayer(playerData);
                }
            });
        });

        // Handle new player joining
        this.socket.on('playerJoined', (playerData) => {
            this.addRemotePlayer(playerData);
        });

        // Handle player movement
        this.socket.on('playerMoved', (playerData) => {
            this.updateRemotePlayer(playerData);
        });

        // Handle player disconnection
        this.socket.on('playerLeft', (playerId) => {
            this.removeRemotePlayer(playerId);
        });
    }

    addRemotePlayer(playerData) {
        const spaceship = this.createRemoteSpaceship();
        this.updateSpaceshipFromData(spaceship, playerData);
        this.remotePlayers.set(playerData.id, spaceship);
        this.world.scene().add(spaceship);
    }

    updateRemotePlayer(playerData) {
        const spaceship = this.remotePlayers.get(playerData.id);
        if (spaceship) {
            this.updateSpaceshipFromData(spaceship, playerData);
        }
    }

    removeRemotePlayer(playerId) {
        const spaceship = this.remotePlayers.get(playerId);
        if (spaceship) {
            this.world.scene().remove(spaceship);
            this.remotePlayers.delete(playerId);
        }
    }

    createRemoteSpaceship() {
        const shipGroup = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.ConeGeometry(1, 10, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff3366, // Different color for remote ships
            specular: 0x111111,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI * 0.5;
        shipGroup.add(body);

        // Wings
        const wingGeometry = new THREE.BoxGeometry(5, 0.2, 3);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0xcc2255,
            specular: 0x111111,
            shininess: 100
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        shipGroup.add(wings);

        return shipGroup;
    }

    updateSpaceshipFromData(spaceship, data) {
        spaceship.position.set(data.position.x, data.position.y, data.position.z);
        spaceship.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    }

    startUpdateLoop() {
        setInterval(() => {
            this.socket.emit('updatePlayer', {
                position: {
                    x: this.localSpaceship.mesh.position.x,
                    y: this.localSpaceship.mesh.position.y,
                    z: this.localSpaceship.mesh.position.z
                },
                rotation: {
                    x: this.localSpaceship.mesh.rotation.x,
                    y: this.localSpaceship.mesh.rotation.y,
                    z: this.localSpaceship.mesh.rotation.z
                },
                velocity: {
                    x: this.localSpaceship.velocity.x,
                    y: this.localSpaceship.velocity.y,
                    z: this.localSpaceship.velocity.z
                }
            });
        }, 50); // Update every 50ms (20 times per second)
    }
}