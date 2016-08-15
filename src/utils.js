

export function disableInteractivity(map) {
    map._handlers.forEach(handler => { handler.disable(); });
};

export function enableInteractivity(map) {
    map._handlers.forEach(handler => { handler.enable(); });
};
