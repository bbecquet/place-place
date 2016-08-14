import './style.less';

import 'leaflet';
import 'leaflet-graphicscale';
import getJSON from 'simple-get-json';

class Game {
    constructor(points) {
        this.createMap();
        this.initGame(points);
    }

    createMap() {
        this.mapBackground = L.tileLayer('http://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            opacity: 0,
            className: 'mapBackground',
            attribution: '&copy; <a href="http://osm.org/copyright">openstreetmap</a> contributors'
        })

        this.map = L.map('map')
            .addLayer(this.mapBackground)
            .addControl(L.control.graphicScale())
            .on('click', evt => {
                if(this.finished) { return; }
                this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng);
                this.advancePoint();
            });
    }

    initGame(points) {
        this.mapBackground.setOpacity(0);

        const { startPoints, guessingPoints } = this.preparePoints(points);
        this.startPoints = startPoints;
        this.guessingPoints = guessingPoints;

        this.map.fitBounds(startPoints.map(p => p.position), { padding: [100, 100] });

        startPoints.forEach(startPoint => {
            this.createMarker(startPoint, true).addTo(this.map);
        });

        this.finished = false;
        this.finishButton = document.getElementById('finishButton');
        L.DomEvent.on(this.finishButton, 'click', () => {
            this.finishButton.style.display = 'none';
            this.validateInput(this.guessingPoints);
        });

        this.currentPointInfo = document.getElementById('currentPoint');
        this.currentPointIndex = -1;
        this.totalDistance = 0;

        this.advancePoint();
    }

    preparePoints(points) {
        // TODO: random pick 2, randomize the others
        return {
            startPoints: points.slice(0, 2),
            guessingPoints: points.slice(2),
        };
    }

    advancePoint() {
        this.currentPointIndex++;
        if(this.currentPointIndex >= this.guessingPoints.length) {
            this.currentPointInfo.innerHTML = "Vous pouvez encore changer la position des points";
            this.finished = true;
            this.finishButton.style.display = 'inline-block';
        } else {
            this.currentPointInfo.innerHTML = `Placez <b>${this.guessingPoints[this.currentPointIndex].name}</b>`;
        }
    }

    placePoint(pointDefinition, clickedPosition) {
        pointDefinition.userPosition = clickedPosition;
        this.createMarker(pointDefinition, false).addTo(this.map);
    }

    getIcon(pointDefinition, isStarting) {
        return L.divIcon({
            className: 'gameMarker' + (isStarting ? ' startingPoint' : ''),
            iconSize: [80, 80],
            iconAnchor: [40, 80],
            html: `<div style="background-image: url(pictos/${pointDefinition.picto});"></div>`,
        });
    }

    createMarker(pointDef, isStarting) {
        return L.marker(isStarting ? pointDef.position : pointDef.userPosition, {
            icon: this.getIcon(pointDef, isStarting),
            draggable: !isStarting,
        }).bindTooltip(pointDef.name, {
            direction: 'top',
            offset: [0, -80],
        });
    }

    validateInput(places) {
        this.mapBackground.setOpacity(1);

        let sequence = Promise.resolve(0);
        places.forEach(place => {
            sequence = sequence.then(() => {
                return this.checkPlace(place);
            });
        });

        sequence.then(() => {
            this.displayDistance(this.totalDistance);
        });
    }

    displayDistance(distance) {
        document.getElementById('currentPoint').innerHTML = Math.round(distance) + ' m';
    }

    checkPlace(place) {
        return new Promise(resolve => {
            this.map.setView(place.userPosition, 15, {
                animate: false,
            });

            setTimeout(() => {
                this.map.panTo(place.position, {
                    animate: true,
                    duration: 1,
                }).once('moveend', () => {
                    this.createMarker(place, true).addTo(this.map);

                    const distance = L.latLng(place.position).distanceTo(place.userPosition);

                    this.totalDistance += distance;
                    this.displayDistance(this.totalDistance);

                    setTimeout(() => { resolve(); }, 1000);
                });
            }, 1000)
        });
    }
}

window.onload = function() {
    getJSON('points.json').then(obj => {
        new Game(obj);
    });
};
