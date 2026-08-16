/*
 Shoe Auto Layout v7 - Photoshop 2021
 Goal:
 1) Canvas exactly 3253 x 3405 px
 2) The source image is placed/scaled to the guide-defined center rectangle.
 3) The source image inside that rectangle is never used as a content-aware fill source.
 4) Outside the rectangle, extend ONLY narrow background strips sampled from the four edges of the placed image.
 5) Keep the original image intact on its own layer.

 IMPORTANT:
 - This version deliberately avoids duplicating the full subject image as a background.
 - It uses edge strips instead of Content-Aware Fill, so a foreground object (e.g. the yellow star)
   cannot be selected as the fill source.
 - It assumes the guide layout is the same as the test PSD: two vertical guides and three horizontal
   guides defining the center rectangle. The innermost horizontal guides define its top/bottom.
*/

#target photoshop
app.displayDialogs = DialogModes.NO;

(function () {
    var TARGET_W = 3253;
    var TARGET_H = 3405;
    var doc = app.activeDocument;

    function px(v) { return Number(v); }

    function guidePositions(axis) {
        var a = [];
        for (var i = 0; i < doc.guides.length; i++) {
            var g = doc.guides[i];
            if (g.direction == axis) a.push(px(g.coordinate.as('px')));
        }
        a.sort(function(x,y){return x-y;});
        return a;
    }

    function uniqueSorted(a) {
        var out=[];
        for(var i=0;i<a.length;i++) {
            if(i===0 || Math.abs(a[i]-a[i-1])>1) out.push(a[i]);
        }
        return out;
    }

    // Detect the center rectangle from guides.
    var xs = uniqueSorted(guidePositions(Direction.VERTICAL));
    var ys = uniqueSorted(guidePositions(Direction.HORIZONTAL));

    if (xs.length < 2 || ys.length < 2) {
        alert('需要至少 2 条竖参考线和 2 条横参考线。请先打开你的参考 PSD。');
        return;
    }

    // For the current template, the center rectangle is between the middle two vertical guides
    // and between the middle two horizontal guides when extra guides exist.
    var left = xs[Math.floor((xs.length - 2) / 2)];
    var right = xs[Math.floor((xs.length - 2) / 2) + 1];
    var top = ys[Math.floor((ys.length - 2) / 2)];
    var bottom = ys[Math.floor((ys.length - 2) / 2) + 1];

    // If there are exactly 2 guides on an axis, use them directly.
    if (xs.length === 2) { left=xs[0]; right=xs[1]; }
    if (ys.length === 2) { top=ys[0]; bottom=ys[1]; }

    if (right <= left || bottom <= top) {
        alert('无法从参考线确定有效的中心矩形。');
        return;
    }

    // Ensure target canvas size without scaling the document content unexpectedly.
    if (doc.width.as('px') != TARGET_W || doc.height.as('px') != TARGET_H) {
        doc.resizeCanvas(UnitValue(TARGET_W,'px'), UnitValue(TARGET_H,'px'), AnchorPosition.MIDDLECENTER);
    }

    // Use the currently active layer as source.
    var source = doc.activeLayer;
    source.name = 'Original Image — Guide Area';

    // Duplicate only the source for positioning; original stays untouched.
    var placed = source.duplicate();
    placed.name = 'Guide Area — Locked Source';

    // Determine source bounds and scale to fit the guide rectangle exactly.
    var b = placed.bounds;
    var bw = b[2].as('px') - b[0].as('px');
    var bh = b[3].as('px') - b[1].as('px');
    if (bw <= 0 || bh <= 0) {
        alert('原图尺寸无效。');
        return;
    }

    var gw = right-left;
    var gh = bottom-top;
    var scale = Math.max(gw/bw, gh/bh) * 100;
    placed.resize(scale, scale, AnchorPosition.MIDDLECENTER);

    // Re-read bounds after scaling and center on guide rectangle.
    b = placed.bounds;
    var cx = (b[0].as('px') + b[2].as('px')) / 2;
    var cy = (b[1].as('px') + b[3].as('px')) / 2;
    var targetCx = (left+right)/2;
    var targetCy = (top+bottom)/2;
    placed.translate(UnitValue(targetCx-cx,'px'), UnitValue(targetCy-cy,'px'));

    // Create a layer underneath and fill outside the guide rectangle by stretching ONLY edge strips.
    // This avoids content-aware fill entirely and therefore cannot copy the foreground subject.
    var bg = doc.artLayers.add();
    bg.name = 'Background — Edge Extension v7';
    bg.move(placed, ElementPlacement.PLACEAFTER);

    // Helper: duplicate the placed layer, make a rectangular selection and scale the selected strip
    // to the required destination area. The selection is copied from the image layer itself.
    function edgeStrip(name, sx, sy, sw, sh, dx, dy, dw, dh) {
        var strip = placed.duplicate();
        strip.name = name;
        strip.move(bg, ElementPlacement.PLACEBEFORE);

        doc.selection.deselect();
        doc.selection.select([
            [sx,sy], [sx+sw,sy], [sx+sw,sy+sh], [sx,sy+sh]
        ]);
        doc.activeLayer = strip;
        strip.copy();

        // Paste strip as a new layer.
        var pasted = doc.paste();
        pasted.name = name + ' — pasted';
        // Scale pasted strip to destination dimensions.
        var pb = pasted.bounds;
        var pw = pb[2].as('px')-pb[0].as('px');
        var ph = pb[3].as('px')-pb[1].as('px');
        if (pw>0 && ph>0) pasted.resize(dw/pw*100, dh/ph*100, AnchorPosition.MIDDLECENTER);
        pb=pasted.bounds;
        var pcx=(pb[0].as('px')+pb[2].as('px'))/2;
        var pcy=(pb[1].as('px')+pb[3].as('px'))/2;
        pasted.translate(UnitValue(dx+dw/2-pcx,'px'),UnitValue(dy+dh/2-pcy,'px'));
        strip.remove();
        doc.selection.deselect();
        return pasted;
    }

    // We do not use the full image as a background. Instead, use a very thin strip immediately
    // outside each edge of the guide rectangle. The strips are stretched outward.
    var edge = 8;
    var x0 = left, x1 = right, y0 = top, y1 = bottom;

    // Since the source layer itself has been scaled/positioned, its edge strips are safe background
    // only if the edge is background. For a template with a subject touching an edge, use a tiny
    // strip and allow the user to adjust edge thickness.
    try {
        edgeStrip('Top Background', x0, y0, x1-x0, edge, x0, 0, x1-x0, y0);
        edgeStrip('Bottom Background', x0, y1-edge, x1-x0, edge, x0, y1, x1-x0, TARGET_H-y1);
        edgeStrip('Left Background', x0, y0, edge, y1-y0, 0, y0, x0, y1-y0);
        edgeStrip('Right Background', x1-edge, y0, edge, y1-y0, x1, y0, TARGET_W-x1, y1-y0);
    } catch(e) {
        alert('背景边缘扩展失败：' + e.message + '\n主体定位已经完成，未使用内容识别。');
    }

    // Keep the guide-area source above the background extension.
    doc.activeLayer = placed;
    doc.selection.deselect();
    alert('v7 完成：主体已放入参考线矩形，画布为 3253 × 3405。背景使用边缘扩展，不再使用内容识别。');
})();
