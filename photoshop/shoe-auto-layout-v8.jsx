#target photoshop
app.bringToFront();
app.displayDialogs = DialogModes.NO;

(function () {
    var TARGET_W = 3253;
    var TARGET_H = 3405;

    if (app.documents.length < 2) {
        alert('请同时打开：\n\n1. 参考线 PSD\n2. 原图 JPG/PNG');
        return;
    }

    var guideDoc = null;
    var sourceDoc = null;

    // 找到包含参考线的文档，而不是根据画布尺寸猜测。
    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        var v = 0, h = 0;
        for (var g = 0; g < d.guides.length; g++) {
            if (d.guides[g].direction == Direction.VERTICAL) v++;
            if (d.guides[g].direction == Direction.HORIZONTAL) h++;
        }
        if (v >= 2 && h >= 2) {
            guideDoc = d;
            break;
        }
    }

    if (!guideDoc) {
        alert('没有找到参考线 PSD。\n请确认参考线 PSD 已打开，并且至少有 2 条竖线和 2 条横线。');
        return;
    }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] != guideDoc) {
            sourceDoc = app.documents[j];
            break;
        }
    }

    if (!sourceDoc) {
        alert('没有找到原图。');
        return;
    }

    // 在调整画布前读取参考线坐标。
    var xs = [], ys = [];
    for (var k = 0; k < guideDoc.guides.length; k++) {
        var gd = guideDoc.guides[k];
        var p = gd.coordinate.as('px');
        if (gd.direction == Direction.VERTICAL) xs.push(p);
        else ys.push(p);
    }

    xs.sort(function(a,b){return a-b;});
    ys.sort(function(a,b){return a-b;});

    function unique(a) {
        var r = [];
        for (var n=0; n<a.length; n++) {
            if (n === 0 || Math.abs(a[n]-a[n-1]) > 1) r.push(a[n]);
        }
        return r;
    }
    xs = unique(xs);
    ys = unique(ys);

    if (xs.length < 2 || ys.length < 2) {
        alert('参考线数量不足。');
        return;
    }

    var guideW = guideDoc.width.as('px');
    var guideH = guideDoc.height.as('px');
    var centerX = guideW / 2;
    var centerY = guideH / 2;

    var left = null, right = null, top = null, bottom = null;
    for (var a=0; a<xs.length; a++) if (xs[a] < centerX) left = xs[a];
    for (var b=0; b<xs.length; b++) if (xs[b] > centerX) { right = xs[b]; break; }
    for (var c=0; c<ys.length; c++) if (ys[c] < centerY) top = ys[c];
    for (var e=0; e<ys.length; e++) if (ys[e] > centerY) { bottom = ys[e]; break; }

    if (left === null || right === null || top === null || bottom === null) {
        alert('无法确定参考线中间矩形。');
        return;
    }

    var boxW = right - left;
    var boxH = bottom - top;
    if (boxW <= 0 || boxH <= 0) {
        alert('参考线矩形无效。');
        return;
    }

    // 创建结果副本，原始参考 PSD 不动。
    app.activeDocument = guideDoc;
    var outDoc = guideDoc.duplicate('Shoe_AutoLayout_Result_v8', false);
    app.activeDocument = outDoc;

    // 真正从原图文档复制整张可见合成图，避免只复制参考 PSD 当前图层。
    app.activeDocument = sourceDoc;
    sourceDoc.selection.selectAll();
    sourceDoc.selection.copy(true);
    sourceDoc.selection.deselect();

    app.activeDocument = outDoc;
    outDoc.paste();
    var placed = outDoc.activeLayer;
    placed.name = 'ORIGINAL IMAGE - PLACED';

    var rb = placed.bounds;
    var rw = rb[2].as('px') - rb[0].as('px');
    var rh = rb[3].as('px') - rb[1].as('px');
    if (rw <= 0 || rh <= 0) {
        alert('原图复制失败：粘贴后的图层没有有效尺寸。');
        return;
    }

    // 让原图覆盖参考矩形；不裁切原图，不抠背景。
    var scale = Math.max(boxW / rw, boxH / rh) * 100;
    placed.resize(scale, scale, AnchorPosition.MIDDLECENTER);

    rb = placed.bounds;
    var pcx = (rb[0].as('px') + rb[2].as('px')) / 2;
    var pcy = (rb[1].as('px') + rb[3].as('px')) / 2;
    var targetCX = (left + right) / 2;
    var targetCY = (top + bottom) / 2;
    placed.translate(UnitValue(targetCX - pcx, 'px'), UnitValue(targetCY - pcy, 'px'));

    // 扩大到最终尺寸。使用中心锚点，让参考区域和主体一起向外扩展。
    outDoc.resizeCanvas(UnitValue(TARGET_W, 'px'), UnitValue(TARGET_H, 'px'), AnchorPosition.MIDDLECENTER);

    alert(
        '第一阶段成功！\n\n' +
        '原图已经真正复制到结果文件。\n' +
        '图层：ORIGINAL IMAGE - PLACED\n\n' +
        '最终画布：' + Math.round(outDoc.width.as('px')) + ' × ' + Math.round(outDoc.height.as('px')) + '\n\n' +
        '先检查：你的原图有没有出现在参考线矩形中。\n' +
        '确认这一点后，再继续做背景扩展。'
    );
})();
