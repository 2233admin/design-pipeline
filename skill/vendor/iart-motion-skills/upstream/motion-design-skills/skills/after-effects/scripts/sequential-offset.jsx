/*
 * sequential-offset.jsx
 * Staggers the selected layers in time so each starts OFFSET_FRAMES after
 * the previous one (a "domino" / cascade start), based on the first
 * selected layer's start time.
 *
 * Usage: select layers in a comp, then File > Scripts > Run Script File...
 * Edit OFFSET_FRAMES and ORDER below.
 */

(function sequentialOffset() {
    var OFFSET_FRAMES = 2;       // frames between each layer's start
    var ORDER_BY_SELECTION = true; // true = order of selection; false = by current startTime

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Open a composition and select two or more layers first.");
        return;
    }

    var sel = comp.selectedLayers;
    if (sel.length < 2) {
        alert("Select at least two layers.");
        return;
    }

    var frameDur = comp.frameDuration;          // seconds per frame
    var offsetSec = OFFSET_FRAMES * frameDur;

    // Build the working order.
    var layers = [];
    for (var i = 0; i < sel.length; i++) layers.push(sel[i]);
    if (!ORDER_BY_SELECTION) {
        layers.sort(function (a, b) { return a.startTime - b.startTime; });
    }

    var base = layers[0].startTime;

    app.beginUndoGroup("Sequential Offset");
    try {
        for (var j = 0; j < layers.length; j++) {
            layers[j].startTime = base + (j * offsetSec);
        }
    } finally {
        app.endUndoGroup();
    }
})();
