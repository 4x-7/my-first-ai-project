/*
 Shoe Auto Layout v8 - Photoshop 2021
 Goal:
 1) NEVER modify the original reference PSD.
 2) Automatically create a NEW result document/tab from the active reference PSD.
 3) Canvas exactly 3253 x 3405 px.
 4) Place the active source layer inside the guide-defined center rectangle.
 5) Extend the background from thin edge strips only; never use Content-Aware Fill.

 Usage:
 - Open the reference PSD.
 - Make the image layer you want to place the ACTIVE layer.
 - Run this script.
 - A new document named Shoe_AutoLayout_Result_v8 will be created.
*/

#target photoshop
app.displayDialogs = DialogModes.NO;

(function () {
    var TARGET_W = 3253;
    var TARGET_H = 3405;
    var sourceDoc = app.activeDocument;

    function px(v) { return Number(v); }

    function guidePositions(doc, axis) {
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

    // Read guides from the original reference PSD before duplicating it.
    var xs = uniqueSorted(guidePositions(sourceDoc, Direction.VERTICAL));
    var ys = uniqueSorted(guidePositions(sourceDoc, Direction.HORIZONTAL));

    if (xs.length < 2 || ys.length < 2) {
        alert('需要至少 2 条竖参考线和 2 条横参考线。请先打开参考 PSD。');
        return;
    }

    // Current template: use the middle pair when extra guides exist.
    var left = xs[Math.floor((xs.length - 2) / 2)];
    var right = xs[Math.floor((xs.length - 2) / 2) + 1];
    var top = ys[Math.floor((ys.length - 2) / 2)];
    var bottom = ys[Math.floor((ys.length - 2) / 2) + 1];
    if (xs.length === 2) { left=xs[0]; right=xs[1]; }
    if (ys.length === 2) { top=ys[0]; bottom=ys[1]; }

    if (right <= left || bottom <= top) {
        alert('无法从参考线确定有效的中心矩形。');
        return;
    }

    // IMPORTANT: duplicate the whole PSD so the original remains untouched.
    var doc = sourceDoc.duplicate('Shoe_AutoLayout_Result_v8', false);
    app.activeDocument = doc;

    // The duplicated document keeps the same active layer.
    var source = doc.activeLayer;
    source.name = 'Original Image — Guide Area';

    // Ensure target canvas size.
    if (doc.width.as('px') != TARGET_W || doc.height.as('px') != TARGET_H) {
        doc.resizeCanvas(UnitValue(TARGET_W,'px'), UnitValue(TARGET_H,'px'), AnchorPosition.MIDDLECENTER);
    }

    // Duplicate source for positioning.
    var placed = source.duplicate();
    placed.name = 'Guide Area — Locked Source';

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

    b = placed.bounds;
    var cx = (b[0].as('px') + b[2].as('px')) / 2;
    var cy = (b[1].as('px') + b[3].as('px')) / 2;
    var targetCx = (left+right)/2;
    var targetCy = (top+bottom)/2;
    placed.translate(UnitValue(targetCx-cx,'px'), UnitValue(targetCy-cy,'px'));

    // Create background layer underneath.
    var bg = doc.artLayers.add();
    bg.name = 'Background — Edge Extension v8';
    bg.move(placed, ElementPlacement.PLACEAFTER);

    function edgeStrip(name, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

        var strip = placed.duplicate();
        strip.name = name;
        strip.move(bg, ElementPlacement.PLACEBEFORE);

        doc.activeLayer = strip;
        doc.selection.deselect();
        doc.selection.select([
            [sx,sy], [sx+sw,sy], [sx+sw,sy+sh], [sx,sy+sh]
        ]);
        strip.copy();

        var pasted = doc.paste();
        pasted.name = name + ' — pasted';

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

    // Thin strips immediately inside the guide rectangle are stretched outward.
    // No Content-Aware Fill is used.
    var edge = 8;
    var x0=left, x1=right, y0=top, y1=bottom;

    try {
        edgeStrip('Top Background', x0, y0, x1-x0, edge, x0, 0, x1-x0, y0);
        edgeStrip('Bottom Background', x0, y1-edge, x1-x0, edge, x0, y1, x1-x0, TARGET_H-y1);
        edgeStrip('Left Background', x0, y0, edge, y1-y0, 0, y0, x0, y1-y0);
        edgeStrip('Right Background', x1-edge, y0, edge, y1-y0, x1, y0, TARGET_W-x1, y1-y0);
    } catch(e) {
        alert('背景边缘扩展失败：' + e.message + '\n主体定位已经完成，未使用内容识别。');
    }

    doc.activeLayer = placed;
    doc.selection.deselect();
    alert('v8 完成！\n\n已经新建一个结果文档：Shoe_AutoLayout_Result_v8\n画布：3253 × 3405\n原参考 PSD 没有被修改。');
})();
