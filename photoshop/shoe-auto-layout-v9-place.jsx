#target photoshop
app.bringToFront();
app.displayDialogs = DialogModes.NO;

(function () {
    var TARGET_W = 3253;
    var TARGET_H = 3405;

    function px(v) { return Number(v); }
    function getGuides(doc, dir) {
        var a = [];
        for (var i = 0; i < doc.guides.length; i++) {
            if (doc.guides[i].direction == dir) a.push(px(doc.guides[i].coordinate.as('px')));
        }
        a.sort(function(a,b){ return a-b; });
        return a;
    }
    function unique(a) {
        var out=[];
        for (var i=0;i<a.length;i++) if (i===0 || Math.abs(a[i]-a[i-1])>1) out.push(a[i]);
        return out;
    }
    function centerPair(a, center) {
        var left=null, right=null;
        for (var i=0;i<a.length;i++) {
            if (a[i] < center) left=a[i];
            if (a[i] > center) { right=a[i]; break; }
        }
        return [left,right];
    }
    function placeEmbedded(file) {
        var desc = new ActionDescriptor();
        desc.putPath(charIDToTypeID('null'), file);
        desc.putEnumerated(charIDToTypeID('FTcs'), charIDToTypeID('QCSt'), charIDToTypeID('Qcsa'));
        executeAction(charIDToTypeID('Plc '), desc, DialogModes.NO);
        return app.activeDocument.activeLayer;
    }

    if (app.documents.length < 2) {
        alert('请同时打开：\n\n① 参考线 PSD\n② 原图 JPG/PNG');
        return;
    }

    var target = app.activeDocument;
    var source = null;

    // The active document must be the reference PSD.
    var xs = unique(getGuides(target, Direction.VERTICAL));
    var ys = unique(getGuides(target, Direction.HORIZONTAL));
    if (xs.length < 2 || ys.length < 2) {
        alert('请先点击你的参考线 PSD，使它成为当前文档。');
        return;
    }

    // Find the other open document as the source image.
    for (var i=0;i<app.documents.length;i++) {
        if (app.documents[i] != target) { source = app.documents[i]; break; }
    }
    if (!source || !source.fullName) {
        alert('找不到可置入的原图。请确认 JPG/PNG 已保存到电脑。');
        return;
    }

    var vp = centerPair(xs, target.width.as('px')/2);
    var hp = centerPair(ys, target.height.as('px')/2);
    if (vp[0]===null || vp[1]===null || hp[0]===null || hp[1]===null) {
        alert('没有找到画布中心两侧的参考线。');
        return;
    }

    var left=vp[0], right=vp[1], top=hp[0], bottom=hp[1];
    var gw=right-left, gh=bottom-top;

    // Save original guide-document size/position; keep guides as-is while placing.
    var oldW=target.width.as('px'), oldH=target.height.as('px');

    // Place the source file using Photoshop's own Place Embedded command.
    app.activeDocument = target;
    var placed = placeEmbedded(source.fullName);
    placed.name = 'ORIGINAL IMAGE - PLACED';

    // Fit the entire placed image inside the guide rectangle, preserving aspect ratio.
    var b=placed.bounds;
    var bw=b[2].as('px')-b[0].as('px');
    var bh=b[3].as('px')-b[1].as('px');
    if (bw<=0 || bh<=0) { alert('置入成功，但无法读取原图尺寸。'); return; }

    var scale=Math.min(gw/bw, gh/bh)*100;
    placed.resize(scale, scale, AnchorPosition.MIDDLECENTER);
    b=placed.bounds;
    var cx=(b[0].as('px')+b[2].as('px'))/2;
    var cy=(b[1].as('px')+b[3].as('px'))/2;
    placed.translate(UnitValue((left+right)/2-cx,'px'), UnitValue((top+bottom)/2-cy,'px'));

    // Create a new 3253 x 3405 result document and move the placed smart object into it.
    // The first test intentionally stops here: no background expansion, no content-aware fill.
    var result=app.documents.add(TARGET_W, TARGET_H, target.resolution, 'Shoe_AutoLayout_v9_Result', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument=target;
    placed.duplicate(result, ElementPlacement.PLACEATBEGINNING);
    app.activeDocument=result;
    var resultLayer=result.activeLayer;
    resultLayer.name='ORIGINAL IMAGE - PLACED';

    // The source was positioned using the original guide PSD coordinates. If the guide PSD is not
    // already 3253x3405, offset it to the same top-left coordinate system when moving to result.
    if (oldW != TARGET_W || oldH != TARGET_H) {
        var dx=(TARGET_W-oldW)/2;
        var dy=(TARGET_H-oldH)/2;
        resultLayer.translate(UnitValue(dx,'px'), UnitValue(dy,'px'));
    }

    alert('第一阶段成功！\n\n已经使用 Photoshop 的“置入嵌入的对象”把原图真正放进来了。\n\n结果文件：Shoe_AutoLayout_v9_Result\n画布：3253 × 3405\n\n现在先不做背景扩展。请检查你的原图是否真的出现。');
})();
