import L from "leaflet";
import "@kalisio/leaflet-graphicscale";
import {
  disableInteractivity,
  enableInteractivity,
  animatePoint,
} from "./utils.js";
import tin from "@turf/tin";
import { featureCollection } from "@turf/helpers";

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
    this.finished = true;
    this.createMap();

    L.DomEvent.on(getId("startButton"), "click", () => {
      this.initGame();
    });
    L.DomEvent.on(getId("replayButton"), "click", () => {
      this.initGame();
    });
    L.DomEvent.on(getId("finishButton"), "click", () => {
      this.validateInput();
    });
  }

  createMap() {
    this.mapBackground = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        className: "mapBackground",
        attribution: `Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> & contributors`,
      }
    );

    this.map = L.map("map", {
      center: [48.85, 2.35],
      zoom: 12,
    })
      .addControl(
        L.control.graphicScale({
          fill: "fill",
          showSubunits: true,
        })
      )
      .addLayer(this.mapBackground)
      .on("click", (evt) => {
        if (this.finished) {
          return;
        }
        this.placePoint(
          this.guessingPoints[this.currentPointIndex],
          evt.latlng
        );
        this.advancePoint();
      });

    this.gameOverlays = L.layerGroup().addTo(this.map);
  }

  initGame() {
    L.DomUtil.addClass(L.DomUtil.get("dialog"), "hidden");

    this.mapBackground.setOpacity(0);
    this.gameOverlays.clearLayers();
    this.markers = L.layerGroup().addTo(this.gameOverlays);

    const { startPoints, guessingPoints } = this.preparePoints(this.points, 2);
    this.startPoints = startPoints;
    this.guessingPoints = guessingPoints;

    this.map.fitBounds(
      this.points.map((p) => p.position),
      { padding: [100, 100] }
    );
    startPoints.forEach((startPoint) => {
      this.createMarker(startPoint, true).addTo(this.markers);
    });

    this.finished = false;
    this.currentPointIndex = -1;

    this.map.getContainer().style.cursor = "crosshair";

    this.advancePoint();
  }

  drawMesh() {
    const points = featureCollection(
      this.markers.getLayers().map((marker) => marker.toGeoJSON())
    );
    const mesh = tin(points);
    if (this.mesh) {
      this.gameOverlays.removeLayer(this.mesh);
    }
    this.mesh = L.geoJSON(mesh, {
      style: () => ({
        fillOpacity: 0,
        weight: 1,
        color: "silver",
        dashArray: "2,2",
      }),
    }).addTo(this.gameOverlays);
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
      this.map.getContainer().style.cursor = "pointer";
    } else {
      this.showCurrentPoint(this.guessingPoints[this.currentPointIndex]);
    }
  }

  placePoint(pointDefinition, clickedPosition) {
    pointDefinition.userPosition = clickedPosition;
    this.createMarker(pointDefinition, false).addTo(this.markers);
    this.drawMesh();
  }

  getIcon(pointDefinition, isStarting) {
    return L.divIcon({
      className: "gameMarker" + (isStarting ? " startingPoint" : ""),
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      html: `<div style="background-image: url(pictos/${pointDefinition.picto});"></div>`,
    });
  }

  createMarker(pointDef, isStarting) {
    return L.marker(isStarting ? pointDef.position : pointDef.userPosition, {
      icon: this.getIcon(pointDef, isStarting),
      draggable: !isStarting,
    })
      .bindTooltip(pointDef.name, {
        direction: "bottom",
        offset: [0, 20],
      })
      .on("dragend", (evt) => {
        pointDef.userPosition = evt.target.getLatLng();
      })
      .on("drag", () => {
        this.drawMesh();
      });
  }

  async validateInput() {
    this.gameOverlays.removeLayer(this.mesh);
    L.DomUtil.addClass(L.DomUtil.get("dialog"), "hidden");

    disableInteractivity(this.map);
    this.markers.eachLayer((m) => {
      m.dragging.disable();
    });
    this.mapBackground.setOpacity(0.75);

    for (let i = 0; i < this.guessingPoints.length; i++) {
      await this.checkPlace(this.guessingPoints[i]);
    }

    this.showScoreScreen();
    enableInteractivity(this.map);
  }

  formatDistance(meters) {
    return `${Math.round(meters / 10) * 10} m`;
  }

  checkPlace(place) {
    return new Promise((resolve) => {
      this.map.setView(place.userPosition, 15, {
        animate: false,
      });

      setTimeout(() => {
        let stepDistance;
        const distanceLine = L.polyline([place.userPosition], {
          dashArray: "5,10",
        })
          .bindTooltip(() => this.formatDistance(stepDistance), {
            className: "distanceTooltip",
            permanent: true,
          })
          .addTo(this.gameOverlays);
        const fullDistance = place.userPosition.distanceTo(place.position);
        animatePoint(
          place.userPosition,
          place.position,
          this.getAnimationDuration(fullDistance),
          (p, isFinished) => {
            stepDistance = p.distanceTo(place.userPosition);
            distanceLine.addLatLng(p).openTooltip(p);
            this.map.panTo(p);

            if (isFinished) {
              setTimeout(resolve, 1000);
            }
          }
        );
      }, 1000);
    });
  }

  getAnimationDuration(distance) {
    if (DEBUG) {
      return 0;
    }
    // duration proportional to distance, with max 3s, min 1/2s
    return Math.min(3000, Math.max(distance, 500));
  }

  showDialog(content) {
    const dialog = getId("dialog");
    if (dialog.hasChildNodes() && dialog.dataset.saveNode) {
      getId("hide").appendChild(dialog.firstChild);
    } else {
      L.DomUtil.empty(dialog);
    }
    if (typeof content === "string") {
      dialog.innerHTML = content;
      dialog.dataset.saveNode = "";
    } else {
      dialog.appendChild(content);
      dialog.dataset.saveNode = "true";
    }
    dialog.classList.remove("hidden");
  }

  showStartScreen() {
    this.showDialog(getId("startMessage"));
  }

  showEndMessage() {
    this.showDialog(getId("endMessage"));
  }

  showScoreScreen() {
    this.map.flyToBounds(
      this.points.map((p) => p.position),
      { padding: [100, 100] }
    );

    const totalDistance = this.guessingPoints
      .map((pt) => pt.userPosition.distanceTo(pt.position))
      .reduce((sum, points) => sum + points, 0);
    getId("finalScore").innerHTML = Math.round(totalDistance) + " m";
    this.showDialog(getId("scoreMessage"));
  }

  showCurrentPoint(point) {
    this
      .showDialog(`<img class="previewPicto" src="pictos/${point.picto}" /><br />
            Placez <b>${point.name}</b>`);
  }
}

window.onload = function () {
  fetch("points.json")
    .then((response) => response.json())
    .then((points) => {
      const game = new Game(points);
      game.showStartScreen();
    });
};
