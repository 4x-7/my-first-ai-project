#target photoshop
/* Shoe Auto Layout — v3
   First working test version.
   Open:
   1) the 3253x3405 template PSD with guides
   2) the source image

   This version deliberately avoids Photoshop's clipboard commands,
   because some Photoshop/Mac setups disable copy/paste from scripts.
*/
(function () {
    if (app.documents.length < 2) {
        alert('请同时打开：\n1. 3253 × 3405 的参考线 PSD\n2. 要处理的原图');
        return;
    }

    function px(v) { return v.as('px'); }
    var W = 3253, H = 3405;
    var template = null, source = null;

    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        if (Math.round(px(d.width)) === W && Math.round(px(d.height)) === H) {
            template = d;
            break;
        }
    }

    if (!template) {
        alert('没有找到 3253 × 3405 的参考线 PSD。\n请确认模板已经打开，并且画布尺寸是 3253 × 3405 px。');
        return;
    }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== template) {
            source = app.documents[j];
            break;
        }
    }
    if (!source) { alert('没有找到原图。'); return; }

    // The template must be frontmost while reading its guides.
    app.activeDocument = template;

    var xs = [], ys = [];
    var guideCount = template.guides.length;
    for (var g = 0; g < guideCount; g++) {
        var guide = template.guides[g];
        var c = px(guide.coordinate);
        if (guide.direction === Direction.VERTICAL) xs.push(c);
        else ys.push(c);
    }

    xs.sort(function(a,b){return a-b;});
    ys.sort(function(a,b){return a-b;});

    var innerX = [], innerY = [];
    for (var a=0; a<xs.length; a++) if (xs[a] > 2 && xs[a] < W-2) innerX.push(xs[a]);
    for (var b=0; b<ys.length; b++) if (ys[b] > 2 && ys[b] < H-2) innerY.push(ys[b]);

    if (innerX.length < 2 || innerY.length < 2) {
        alert('没有找到足够的内部参考线。\n需要至少两条竖向参考线和两条横向参考线。');
        return;
    }

    var left = innerX[0], right = innerX[innerX.length-1];
    var top = innerY[0], bottom = innerY[innerY.length-1];
    var targetW = right-left, targetH = bottom-top;

    // Make a temporary flattened copy of the source.
    app.activeDocument = source;
    var work = source.duplicate('Shoe_AutoLayout_Source');
    app.activeDocument = work;
    try { work.flatten(); } catch(e0) {}

    var sw = px(work.width), sh = px(work.height);
    var scale = Math.min(targetW/sw, targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'), UnitValue(sh*scale,'px'), null, ResampleMethod.PRESERVEDETAILS);

    // Create the full-size output first, then duplicate the layer directly
    // into it. This avoids the clipboard completely.
    var out = app.documents.add(W, H, 72, 'Shoe_AutoLayout_Result', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument = work;
    var sourceLayer = work.activeLayer;
    var layer = sourceLayer.duplicate(out, ElementPlacement.PLACEATBEGINNING);
    work.close(SaveOptions.DONOTSAVECHANGES);

    app.activeDocument = out;
    layer.name = 'Source — guide area';

    var bounds = layer.bounds;
    var lw = px(bounds[2])-px(bounds[0]);
    var lh = px(bounds[3])-px(bounds[1]);
    var destLeft = left + (targetW-lw)/2;
    var destTop = top + (targetH-lh)/2;
    layer.translate(UnitValue(destLeft-px(bounds[0]),'px'), UnitValue(destTop-px(bounds[1]),'px'));

    // Copy guides into the output.
    for (var xi=0; xi<xs.length; xi++) out.guides.add(Direction.VERTICAL, UnitValue(xs[xi],'px'));
    for (var yi=0; yi<ys.length; yi++) out.guides.add(Direction.HORIZONTAL, UnitValue(ys[yi],'px'));

    alert('成功！\n\n画布：3253 × 3405 px\n主体：已缩放并放入参考线区域\n参考线：已复制\n\n这一步先确认尺寸和位置。\n确认没问题后，我再把“自然扩展背景 + 自动导出 PNG”接上。');
})();
