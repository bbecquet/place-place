import 'leaflet-graphicscale';
import getJSON from 'simple-get-json';

function preparePoints(points) {
    // TODO: random pick 2, randomize the others
    return {
        startPoints: points.slice(0, 2),
        guessingPoints: points.slice(2)
    };
}

function validateInput(map, places) {
    // L.DomUtil.addClass(map.getContainer(), 'finished');
    mapBackground.setOpacity(1);

    let distance = 0;
    // display the real positions
    places.forEach(function(place) {
        distance += checkPlace(map, place);
    });

    document.getElementById('currentPoint').innerHTML = Math.round(distance) + ' m';
}

function checkPlace(map, place) {
    L.marker(place.position).addTo(map);
    return L.latLng(place.position).distanceTo(place.userPosition);
}

function createMarker(pointDef, isStarting) {
    return L.marker(isStarting ? pointDef.position : pointDef.userPosition, {
        icon: getIcon(pointDef, isStarting),
        // title: pointDef.name,
        draggable: !isStarting,
    }).bindTooltip(pointDef.name, {
        direction: 'bottom',
    });
}

function getIcon(pointDefinition, isStarting) {
    return L.divIcon({
        className: 'gameMarker' + (isStarting ? ' startingPoint' : ''),
        iconSize: [80, 80],
        html: `<div style="background-image: url(pictos/${pointDefinition.picto});"></div>`,
    });
}

let mapBackground;
function initGame(points) {
    const pointSets = preparePoints(points);

    const map = L.map('map', {
        center: [48.86, 2.35],
        zoom: 13,
        layers: [
            mapBackground = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                opacity: 0,
                className: 'mapBackground',
                attribution: '&copy; <a href="http://osm.org/copyright">openstreetmap</a> contributors'
            })
        ]
    });
    L.control.graphicScale().addTo(map);

    const guessingPoints = pointSets.guessingPoints;
    pointSets.startPoints.forEach(function(startPoint) {
        createMarker(startPoint, true).addTo(map);
    });
    // TODO: fit zoom

    let finished = false;
    const finishButton = document.getElementById('finishButton');
    L.DomEvent.on(finishButton, 'click', function() {
        finishButton.style.display = 'none';
        validateInput(map, guessingPoints);
    });

    const currentPointInfo = document.getElementById('currentPoint');
    let currentPointIndex = -1;
    function advancePoint() {
        currentPointIndex++;
        if(currentPointIndex >= guessingPoints.length) {
            currentPointInfo.innerHTML = "Vous pouvez encore changer la position des points";
            finished = true;
            finishButton.style.display = 'block';
        } else {
            currentPointInfo.innerHTML = `Placez <b>${guessingPoints[currentPointIndex].name}</b>`;
        }
    }

    function placePoint(pointDefinition, clickedPosition) {
        pointDefinition.userPosition = clickedPosition;
        createMarker(pointDefinition, false).addTo(map);
    }

    map.on('click', function(evt) {
        if(finished) { return; }
        placePoint(guessingPoints[currentPointIndex], evt.latlng);
        advancePoint();
    });

    advancePoint();
}

window.onload = function() {
    getJSON('points.json').then(obj => {
        initGame(obj);
    });
};
