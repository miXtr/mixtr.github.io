export class HUDController {
    constructor(spaceship) {
        this.spaceship = spaceship;
        this.messageTimeout = null;
    }

    update() {
        // Update speed and altitude
        const speed = this.spaceship.velocity.length() * 100;
        const altitude = (this.spaceship.mesh.position.length() - 100) * 100;
        document.getElementById('speed').textContent = `SPEED: ${speed.toFixed(1)} km/s`;
        document.getElementById('altitude').textContent = `ALTITUDE: ${altitude.toFixed(0)} km`;

        // Update coordinates
        const position = this.spaceship.mesh.position.clone().normalize();
        const lat = Math.asin(position.y) * 180 / Math.PI;
        const lon = Math.atan2(position.x, position.z) * 180 / Math.PI;
        document.getElementById('coordinates').textContent = 
            `LAT: ${lat.toFixed(3)}° LON: ${lon.toFixed(3)}°`;
    }

    showMessage(text, duration = 3000) {
        const container = document.getElementById('message-container');
        container.textContent = text;
        container.style.opacity = '1';

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            container.style.opacity = '0';
        }, duration);
    }
}