/*
 * apply-effect-to-layers.jsx
 * Applies an effect (by internal matchName) to every selected layer.
 *
 * Why matchName: display names are localized and change between AE language
 * versions; matchName is stable. Examples:
 *   "ADBE Gaussian Blur 2"  -> Gaussian Blur
 *   "ADBE Fast Box Blur"     -> Fast Box Blur
 *   "ADBE Tint"              -> Tint
 *   "ADBE Drop Shadow"       -> Drop Shadow
 *   "ADBE Glo2"              -> Glow
 *
 * Usage: select layers in a comp, then File > Scripts > Run Script File...
 * Edit EFFECT_MATCHNAME (and the optional parameter block) below.
 */

(function applyEffectToLayers() {
    var EFFECT_MATCHNAME = "ADBE Gaussian Blur 2";

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

    app.beginUndoGroup("Apply Effect To Layers");
    try {
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            if (!(layer instanceof AVLayer)) continue; // effects need an AVLayer

            var effects = layer.property("ADBE Effect Parade");
            if (!effects.canAddProperty(EFFECT_MATCHNAME)) continue;

            var fx = effects.addProperty(EFFECT_MATCHNAME);

            // --- Optional: set a parameter. Example for Gaussian Blur radius ---
            // try { fx.property("Blurriness").setValue(25); } catch (e) {}
        }
    } finally {
        app.endUndoGroup();
    }
})();
