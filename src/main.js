import './style.less';

import 'leaflet';
import 'leaflet-graphicscale';
import getJSON from 'simple-get-json';
import Promise from 'bluebird';
import { disableInteractivity, enableInteractivity, animatePoint } from './utils.js';
import { shuffle, sum } from 'lodash';

const DEBUG = true;
const getId = L.DomUtil.get;

class Game {
    constructor(points) {
        this.points = points;
        this.createMap();

        L.DomEvent.on(getId('startButton'), 'click', () => { this.initGame(); });
        L.DomEvent.on(getId('replayButton'), 'click', () => { this.initGame(); });
        L.DomEvent.on(getId('finishButton'), 'click', () => { this.validateInput(); });
    }

    createMap() {
        this.mapBackground = L.tileLayer('http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
            opacity: 0,
            className: 'mapBackground',
            attribution: `Map by <a href="http://stamen.com">Stamen Design</a>.
                          Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> & contributors`,
        });

        this.map = L.map('map', {
            center: [48, 2],
            zoom: 0,
        })
            .addControl(L.control.graphicScale({
                fill: 'fill',
                showSubunits: true,
            }))
            .addLayer(this.mapBackground)
            .on('click', evt => {
                if(this.finished) { return; }
                this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng);
                this.advancePoint();
            });

        this.gameOverlays = L.layerGroup().addTo(this.map);
    }

    initGame() {
        L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden');

        this.mapBackground.setOpacity(0);
        this.gameOverlays.clearLayers();
        this.userMarkers = L.layerGroup().addTo(this.gameOverlays);

        const { startPoints, guessingPoints } = this.preparePoints(this.points, 2);
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
            this.showEndMessage();
            this.finished = true;
        } else {
            this.showCurrentPoint(this.guessingPoints[this.currentPointIndex]);
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

    validateInput() {
        L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden');

        disableInteractivity(this.map);
        this.userMarkers.eachLayer(m => { m.dragging.disable(); });
        this.mapBackground.setOpacity(1);

        let sequence = Promise.each(this.guessingPoints, place => this.checkPlace(place));

        sequence.then(() => {
            this.showScoreScreen(this.totalDistance);
            enableInteractivity(this.map);
        });
    }

    formatDistance(meters) {
        return `${Math.round(meters / 10) * 10} m`;
    }

    scoreFromDistance(meters) {
        // 10 points when < 200m, then 1 point less for every 200 m
        return Math.ceil((Math.max(0, 2000 - meters)) / 20);
    }

    addScore(place, meters) {
        place.score = {
            meters,
            points: this.scoreFromDistance(meters),
        };
    }

    checkPlace(place) {
        return new Promise(resolve => {
            this.map.setView(place.userPosition, 15, {
                animate: false,
            });

            setTimeout(() => {
                let stepDistance;
                const distanceLine = L.polyline([place.userPosition], {
                    dashArray: '5,10',
                })
                .bindTooltip(() => this.formatDistance(stepDistance), {
                    className: 'distanceTooltip',
                })
                .addTo(this.gameOverlays);
                const fullDistance = place.userPosition.distanceTo(place.position);
                animatePoint(place.userPosition, place.position, this.getAnimationDuration(fullDistance),
                    (p, isFinished) => {
                        stepDistance = p.distanceTo(place.userPosition);
                        distanceLine
                            .addLatLng(p)
                            .openTooltip(p);
                        this.map.panTo(p);

                        if(isFinished) {
                            setTimeout(() => {
                                this.addScore(place, stepDistance);
                                resolve();
                            }, 1000);
                        }
                    }
                );
            }, 1000);
        });
    }

    getAnimationDuration(distance) {
        if (DEBUG) { return 0; }
        // duration proportional to distance, with max 3s, min 1/2s
        return Math.min(3000, Math.max(distance, 500));
    }

    showDialog(content) {
        const dialog = getId('dialog');
        if (dialog.hasChildNodes() && dialog.dataset.saveNode) {
            getId('hide').appendChild(dialog.firstChild);
        } else {
            L.DomUtil.empty(dialog);
        }
        if (typeof content === 'string') {
            dialog.innerHTML = content;
            dialog.dataset.saveNode = '';
        } else {
            dialog.appendChild(content);
            dialog.dataset.saveNode = 'true';
        }
        dialog.classList.remove('hidden');
    }

    showStartScreen() {
        this.showDialog(getId('startMessage'));
    }

    showEndMessage() {
        this.showDialog(getId('endMessage'));
    }

    showScoreScreen() {
        const totalPoints = sum(this.guessingPoints.map(pt => pt.score.points));
        getId('finalScore').innerHTML = totalPoints;
        this.showDialog(getId('scoreMessage'));
    }

    showCurrentPoint(point) {
        this.showDialog(`<img class="previewPicto" src="pictos/${point.picto}" /><br />
            Placez <b>${point.name}</b>`);
    }
}

window.onload = function() {
    getJSON('points.json').then(points => {
        const game = new Game(points);
        game.showStartScreen();
    });
};
