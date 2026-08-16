#target photoshop
/*
 Shoe Auto Layout — v4 — Photoshop 2021

 What it does:
 1. Finds the 3253 x 3405 template PSD and reads its guides.
 2. Uses the other open document as the source image.
 3. Fits the whole source image inside the rectangle formed by the
    outermost internal guides, without removing its original background.
 4. Creates a 3253 x 3405 transparent result and places the source there.
 5. Selects the transparent area and tries Photoshop's Content-Aware Fill
    so the original image/background naturally extends to the full canvas.

 This is designed for Photoshop 2021 / ExtendScript (JSX).
*/
(function () {
    var W = 3253, H = 3405;

    function px(v) { return v.as('px'); }
    function s2t(s) { return app.stringIDToTypeID(s); }

    if (app.documents.length < 2) {
        alert('请同时打开：\n1. 3253 × 3405 的参考线 PSD\n2. 要处理的原图');
        return;
    }

    var template = null, source = null;
    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        if (Math.round(px(d.width)) === W && Math.round(px(d.height)) === H) {
            template = d;
            break;
        }
    }
    if (!template) {
        alert('没有找到 3253 × 3405 的参考线 PSD。');
        return;
    }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== template) { source = app.documents[j]; break; }
    }
    if (!source) { alert('没有找到原图。'); return; }

    // Read guides while template is active.
    app.activeDocument = template;
    var xs = [], ys = [];
    for (var g = 0; g < template.guides.length; g++) {
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
        alert('没有找到足够的内部参考线。');
        return;
    }

    var left=innerX[0], right=innerX[innerX.length-1];
    var top=innerY[0], bottom=innerY[innerY.length-1];
    var targetW=right-left, targetH=bottom-top;

    // Make a flattened temporary copy of the source.
    app.activeDocument = source;
    var work = source.duplicate('Shoe_AutoLayout_Source');
    app.activeDocument = work;
    try { work.flatten(); } catch(e0) {}

    var sw=px(work.width), sh=px(work.height);
    var scale=Math.min(targetW/sw, targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'), UnitValue(sh*scale,'px'), null, ResampleMethod.PRESERVEDETAILS);

    // Full canvas result.
    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    var sourceLayer=work.activeLayer;
    var layer=sourceLayer.duplicate(out,ElementPlacement.PLACEATBEGINNING);
    work.close(SaveOptions.DONOTSAVECHANGES);

    app.activeDocument=out;
    layer.name='Original Image — Guide Area';

    // Center inside guide rectangle.
    var bounds=layer.bounds;
    var lw=px(bounds[2])-px(bounds[0]);
    var lh=px(bounds[3])-px(bounds[1]);
    var destLeft=left+(targetW-lw)/2;
    var destTop=top+(targetH-lh)/2;
    layer.translate(UnitValue(destLeft-px(bounds[0]),'px'),UnitValue(destTop-px(bounds[1]),'px'));

    // Copy guides to result.
    for (var xi=0; xi<xs.length; xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for (var yi=0; yi<ys.length; yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));

    // Select transparent pixels, then invert: we want the empty canvas area.
    app.activeDocument=out;
    try {
        var ref=new ActionReference();
        ref.putProperty(s2t('channel'),s2t('selection'));
        var ref2=new ActionReference();
        ref2.putEnumerated(s2t('channel'),s2t('channel'),s2t('transparencyEnum'));
        var desc=new ActionDescriptor();
        desc.putReference(s2t('null'),ref);
        desc.putReference(s2t('to'),ref2);
        executeAction(s2t('set'),desc,DialogModes.NO);
        out.selection.invert();
    } catch(e1) {}

    // The transparency selection above may not work consistently across PS 2021 builds.
    // If it fails, leave the prepared document open for manual Content-Aware Fill.
    try {
        // Use Photoshop's classic Fill > Content-Aware command, available in PS 2021.
        var idFl=charIDToTypeID('Fl  ');
        var fillDesc=new ActionDescriptor();
        fillDesc.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),s2t('contentAware'));
        fillDesc.putBoolean(s2t('contentAwareColorAdaptationFill'),true);
        fillDesc.putBoolean(s2t('contentAwareRotateFill'),true);
        fillDesc.putBoolean(s2t('contentAwareScaleFill'),true);
        fillDesc.putBoolean(s2t('contentAwareMirrorFill'),false);
        fillDesc.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);
        fillDesc.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));
        executeAction(idFl,fillDesc,DialogModes.NO);
    } catch(e2) {
        alert('主体位置已经完成，但 Photoshop 2021 没有自动执行内容识别填充。\n\n请保留这个文件打开，然后：\n1. 选择空白区域\n2. 编辑 → 填充\n3. 内容选择“内容识别”\n4. 确定\n\n主体和 3253×3405 画布已经准备好了。');
    }

    try { out.selection.deselect(); } catch(e3) {}

    // Save a PSD working copy beside the source.
    try {
        var f=new File(source.path+'/shoe_auto_layout_result.psd');
        var opt=new PhotoshopSaveOptions(); opt.layers=true;
        out.saveAs(f,opt,true,Extension.LOWERCASE);
    } catch(e4) {}

    alert('完成！\n\n画布：3253 × 3405 px\n主体：已放入参考线矩形\n背景：已尝试用 Photoshop 2021 内容识别填充扩展\n\n先检查效果。');
})();
