import './style.less';

import 'leaflet';
import 'leaflet-graphicscale';
import getJSON from 'simple-get-json';
import Promise from 'bluebird';
import { disableInteractivity, enableInteractivity, animatePoint } from './utils.js';
import { shuffle } from 'lodash';

class Game {
    constructor() {
        this.createMap();

        this.finishButton = document.getElementById('finishButton');
        L.DomEvent.on(this.finishButton, 'click', () => {
            this.finishButton.style.display = 'none';
            this.validateInput(this.guessingPoints);
        });
        this.replayButton = document.getElementById('replayButton');
        this.currentPointInfo = document.getElementById('currentPoint');
        this.scoreElement = document.getElementById('score');
    }

    createMap() {
        // OSM-HOT 'http://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png'
        this.mapBackground = L.tileLayer('http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
            opacity: 0,
            className: 'mapBackground',
            attribution: `Map by <a href="http://stamen.com">Stamen Design</a>.
                          Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> & contributors`,
        });

        this.map = L.map('map')
            .addControl(L.control.graphicScale())
            .addLayer(this.mapBackground)
            .on('click', evt => {
                if(this.finished) { return; }
                this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng);
                this.advancePoint();
            });

        this.gameOverlays = L.layerGroup().addTo(this.map);
    }

    initGame(points) {
        this.mapBackground.setOpacity(0);
        this.gameOverlays.clearLayers();
        this.userMarkers = L.layerGroup().addTo(this.gameOverlays);

        L.DomUtil.empty(this.scoreElement);
        L.DomUtil.addClass(this.replayButton, 'hidden');

        const { startPoints, guessingPoints } = this.preparePoints(points, 2);
        this.startPoints = startPoints;
        this.guessingPoints = guessingPoints;

        this.map.fitBounds(startPoints.map(p => p.position), { padding: [100, 100] });
        startPoints.forEach(startPoint => {
            this.createMarker(startPoint, true).addTo(this.gameOverlays);
        });

        this.finished = false;
        this.currentPointIndex = -1;
        this.totalDistance = 0;
        this.scores = [];

        this.advancePoint();
    }

    preparePoints(points, nbStart) {
        const shuffledPoints = shuffle(points);
        return {
            startPoints: shuffledPoints.slice(0, nbStart),
            guessingPoints: shuffledPoints.slice(nbStart),
        };
    }

    advancePoint() {
        this.currentPointIndex++;
        if (this.currentPointIndex >= this.guessingPoints.length) {
            this.currentPointInfo.innerHTML = 'Vous pouvez encore changer la position des points';
            this.finished = true;
            this.finishButton.style.display = 'inline-block';
        } else {
            const currentPoint = this.guessingPoints[this.currentPointIndex];
            this.currentPointInfo.innerHTML = `<img class="previewPicto" src="pictos/${currentPoint.picto}" /><br />
                Placez <b>${currentPoint.name}</b>`;
        }
    }

    placePoint(pointDefinition, clickedPosition) {
        pointDefinition.userPosition = clickedPosition;
        this.createMarker(pointDefinition, false).addTo(this.userMarkers);
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
        }).on('dragend', evt => {
            pointDef.userPosition = evt.target.getLatLng();
        });
    }

    validateInput(places) {
        L.DomUtil.empty(this.currentPointInfo);
        disableInteractivity(this.map);
        this.userMarkers.eachLayer(m => { m.dragging.disable(); });
        this.mapBackground.setOpacity(1);

        let sequence = Promise.each(places, place => this.checkPlace(place));

        sequence.then(() => {
            this.displayDistance(this.totalDistance);
            enableInteractivity(this.map);
            L.DomUtil.removeClass(this.replayButton, 'hidden');
        });
    }

    formatDistance(meters) {
        return `${Math.round(meters / 10) * 10} m`;
    }

    displayDistance(distance) {
        this.scoreElement.innerHTML = this.formatDistance(distance);
    }

    scoreFromDistance(meters) {
        // 10 points when < 200m, then 1 point less for every 200 m
        return Math.ceil((Math.max(0, 2000 - meters)) / 200);
    }

    addScore(place, meters) {
        this.totalDistance += meters;
        this.displayDistance(this.totalDistance);
    }

    checkPlace(place) {
        return new Promise(resolve => {
            this.map.setView(place.userPosition, 15, {
                animate: false,
            });

            setTimeout(() => {
                let distance;
                const distanceLine = L.polyline([place.userPosition], {
                    dashArray: '5,10',
                })
                .bindTooltip(() => this.formatDistance(distance), {
                    className: 'distanceTooltip',
                })
                .addTo(this.gameOverlays);
                animatePoint(place.userPosition, place.position, 1000, (p, isFinished) => {
                    distance = p.distanceTo(place.userPosition);
                    distanceLine
                        .addLatLng(p)
                        .openTooltip(p);
                    this.map.panTo(p);

                    if(isFinished) {
                        setTimeout(() => {
                            this.addScore(place, distance);
                            resolve();
                        }, 1000);
                    }
                });
            }, 1000);
        });
    }
}

window.onload = function() {
    getJSON('points.json').then(obj => {
        const game = new Game();
        game.initGame(obj);

        L.DomEvent.on(document.getElementById('replayButton'), 'click', () => {
            game.initGame(obj);
        });
    });
};
