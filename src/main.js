import L from 'leaflet';
import 'leaflet-graphicscale';
import { disableInteractivity, enableInteractivity, animatePoint } from './utils.js';

function shuffle(array) {
    const a = array.slice();
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

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

    async validateInput() {
        L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden');

        disableInteractivity(this.map);
        this.userMarkers.eachLayer(m => { m.dragging.disable(); });
        this.mapBackground.setOpacity(1);

        for(let i = 0; i < this.guessingPoints.length; i++) {
            await this.checkPlace(this.guessingPoints[i]);
        };

        this.showScoreScreen();
        enableInteractivity(this.map);
    }

    formatDistance(meters) {
        return `${Math.round(meters / 10) * 10} m`;
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
                            setTimeout(resolve, 1000);
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
        const totalDistance = this.guessingPoints
            .map(pt => pt.userPosition.distanceTo(pt.position))
            .reduce((sum, points) => sum + points, 0);
        getId('finalScore').innerHTML = Math.round(totalDistance) + ' m';
        this.showDialog(getId('scoreMessage'));
    }

    showCurrentPoint(point) {
        this.showDialog(`<img class="previewPicto" src="pictos/${point.picto}" /><br />
            Placez <b>${point.name}</b>`);
    }
}

window.onload = function() {
    fetch('points.json')
        .then(response => response.json())
        .then(points => {
            const game = new Game(points);
            game.showStartScreen();
        });
};
