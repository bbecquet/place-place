

export function disableInteractivity(map) {
    map._handlers.forEach(handler => { handler.disable(); });
};

export function enableInteractivity(map) {
    map._handlers.forEach(handler => { handler.enable(); });
};

function interpolateLatLng(p1, p2, duration, t) {
    let k = t/duration;
    k = (k < 0) ? 0 : k;
    k = (k > 1) ? 1 : k;
    return L.latLng(p1.lat + k * (p2.lat - p1.lat),
        p1.lng + k * (p2.lng - p1.lng));
};

export function animatePoint(p1, p2, duration, callback) {
    let start = null;

    console.log('plop');

    function animationFrame(timeStamp) {
        console.log('plip', timeStamp);

        if (start === null) { start = timeStamp; }
        const elapsed = timeStamp - start;
        let p = interpolateLatLng(L.latLng(p1), L.latLng(p2), duration, elapsed);

        if(p.equals(p2)) {
            callback(p, true);
            return;
        }

        callback(p);
        L.Util.requestAnimFrame(animationFrame);
    }

    L.Util.requestAnimFrame(animationFrame);
}
