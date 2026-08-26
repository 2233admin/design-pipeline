/*
 * batch-rename.jsx
 * Renames the selected layers in the active comp to:  baseName_##
 * with a zero-padded, incrementing index.
 *
 * Usage: select layers in a comp, then File > Scripts > Run Script File...
 * Edit BASE_NAME, START_INDEX, and PAD below.
 */

(function batchRename() {
    var BASE_NAME   = "layer";   // base name applied to every selected layer
    var START_INDEX = 1;          // first number
    var PAD         = 2;          // zero-padding width (2 -> 01, 02 ...)

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Open a composition and select one or more layers first.");
        return;
    }

    var sel = comp.selectedLayers;
    if (sel.length === 0) {
        alert("No layers selected.");
        return;
    }

    function pad(n, width) {
        var s = String(n);
        while (s.length < width) s = "0" + s;
        return s;
    }

    app.beginUndoGroup("Batch Rename Layers");
    try {
        for (var i = 0; i < sel.length; i++) {
            sel[i].name = BASE_NAME + "_" + pad(START_INDEX + i, PAD);
        }
    } finally {
        app.endUndoGroup();
    }
})();
