#target photoshop
/*
  Shoe Image Layout Helper for Photoshop
  Goal: place the source image inside the central guide rectangle,
  then use Photoshop Generative Expand to fill the full 3253x3405 canvas.

  Assumptions:
  - Open the PSD template first. Its guides define the target rectangle.
  - Open the source image too.
  - The script uses the outermost non-edge guides: left/right vertical,
    top/bottom horizontal. Canvas-edge guides are ignored.
*/

(function () {
    if (app.documents.length < 2) {
        alert('请先同时打开：\n1. 你的参考线 PSD\n2. 要处理的原图');
        return;
    }

    function px(v) { return v.as('px'); }
    function s2t(s) { return app.stringIDToTypeID(s); }

    var template = null;
    var source = null;

    // Find the 3253x3405 document as the template.
    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        if (Math.round(px(d.width)) === 3253 && Math.round(px(d.height)) === 3405) {
            template = d;
            break;
        }
    }

    if (!template) {
        alert('没有找到 3253 × 3405 的参考线 PSD。\n请先打开你的模板 PSD。');
        return;
    }

    // Choose the first other document as source.
    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== template) {
            source = app.documents[j];
            break;
        }
    }

    if (!source) {
        alert('没有找到原图。');
        return;
    }

    // Read guides.
    var xs = [], ys = [];
    for (var g = 0; g < template.guides.length; g++) {
        var guide = template.guides[g];
        var c = px(guide.coordinate);
        if (guide.direction === Direction.VERTICAL) xs.push(c);
        else ys.push(c);
    }

    function uniqueSorted(a) {
        a.sort(function(a,b){ return a-b; });
        var out=[];
        for (var k=0;k<a.length;k++) {
            if (!out.length || Math.abs(out[out.length-1]-a[k]) > 0.5) out.push(a[k]);
        }
        return out;
    }

    xs = uniqueSorted(xs);
    ys = uniqueSorted(ys);

    // Ignore guides sitting on the canvas edges.
    var W = 3253, H = 3405;
    var innerX = [], innerY = [];
    for (var a=0;a<xs.length;a++) if (xs[a] > 2 && xs[a] < W-2) innerX.push(xs[a]);
    for (var b=0;b<ys.length;b++) if (ys[b] > 2 && ys[b] < H-2) innerY.push(ys[b]);

    if (innerX.length < 2 || innerY.length < 2) {
        alert('参考线不足：至少需要两条内部竖线和两条内部横线。');
        return;
    }

    // Use the outermost internal guides as the target rectangle.
    var left = innerX[0], right = innerX[innerX.length-1];
    var top = innerY[0], bottom = innerY[innerY.length-1];
    var targetW = right-left, targetH = bottom-top;

    if (targetW <= 0 || targetH <= 0) {
        alert('参考线区域无效。');
        return;
    }

    // Work on a duplicate of the source so the original is untouched.
    app.activeDocument = source;
    var work = source.duplicate('Shoe_AutoLayout_Work');
    app.activeDocument = work;

    // Flatten a copy so scaling keeps the exact visual result of the source.
    try { work.flatten(); } catch(e) {}

    // Resize the whole source image so it fits the guide rectangle.
    var sw = px(work.width), sh = px(work.height);
    var scale = Math.min(targetW/sw, targetH/sh) * 100;
    work.resizeImage(UnitValue(sw * scale/100, 'px'), UnitValue(sh * scale/100, 'px'), null, ResampleMethod.PRESERVEDETAILS);

    // Copy the resized image.
    work.selection.selectAll();
    work.selection.copy(true);
    work.selection.deselect();
    work.close(SaveOptions.DONOTSAVECHANGES);

    // Create a fresh 3253x3405 document.
    var out = app.documents.add(W, H, 72, 'Shoe_AutoLayout_Result', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument = out;
    out.paste();

    var layer = out.activeLayer;
    layer.name = 'Source — fitted to guide area';

    // Center pasted layer inside guide rectangle.
    var b = layer.bounds;
    var lw = px(b[2])-px(b[0]);
    var lh = px(b[3])-px(b[1]);
    var desiredLeft = left + (targetW-lw)/2;
    var desiredTop = top + (targetH-lh)/2;
    layer.translate(UnitValue(desiredLeft-px(b[0]),'px'), UnitValue(desiredTop-px(b[1]),'px'));

    // Put the template guides into the output document.
    for (var xi=0; xi<xs.length; xi++) out.guides.add(Direction.VERTICAL, UnitValue(xs[xi],'px'));
    for (var yi=0; yi<ys.length; yi++) out.guides.add(Direction.HORIZONTAL, UnitValue(ys[yi],'px'));

    // Save a PSD working file next to the source if possible.
    var saveFolder = source.path;
    var psdFile = new File(saveFolder + '/shoe_auto_layout_work.psd');
    try {
        var psdOpts = new PhotoshopSaveOptions();
        psdOpts.layers = true;
        out.saveAs(psdFile, psdOpts, true, Extension.LOWERCASE);
    } catch(e2) {}

    // Prepare Generative Expand to the full canvas.
    // This uses Photoshop's action pathway used by Generative Expand.
    try {
        var dsc = new ActionDescriptor();
        var rect = new ActionDescriptor();
        rect.putUnitDouble(s2t('top'), s2t('pixelsUnit'), 0);
        rect.putUnitDouble(s2t('left'), s2t('pixelsUnit'), 0);
        rect.putUnitDouble(s2t('bottom'), s2t('pixelsUnit'), H);
        rect.putUnitDouble(s2t('right'), s2t('pixelsUnit'), W);
        dsc.putObject(s2t('to'), s2t('rectangle'), rect);
        dsc.putUnitDouble(s2t('angle'), s2t('angleUnit'), 0);
        dsc.putBoolean(s2t('delete'), false);
        dsc.putInteger(s2t('AutoFillMethod'), 0);
        dsc.putEnumerated(s2t('cropFillMode'), s2t('cropFillMode'), s2t('generative'));
        dsc.putEnumerated(s2t('cropAspectRatioModeKey'), s2t('cropAspectRatioModeClass'), s2t('pureAspectRatio'));
        dsc.putBoolean(s2t('constrainProportions'), false);
        executeAction(s2t('crop'), dsc, DialogModes.ALL);
    } catch(e3) {
        alert('画布和主体已经准备好了，但自动启动 Generative Expand 失败。\n请使用裁剪工具，将画布保持为 3253×3405，并选择“生成式扩展”生成背景。');
    }

    alert('准备完成！\n\n画布：3253 × 3405 px\n主体：已按参考线区域缩放并居中\n参考线：已复制\n\n如果 Photoshop 已进入生成式扩展，请直接点击“生成”。');
})();
