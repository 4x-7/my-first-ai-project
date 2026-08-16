#target photoshop
/*
  Shoe Auto Layout — Photoshop JSX
  Select the template PSD and source image explicitly.
  The template guides define the target rectangle.
*/
(function () {
    if (app.documents.length < 2) {
        alert('请同时打开：\n1. 参考线 PSD\n2. 要处理的原图\n\n如果你已经打开了两个文件，请确认它们都在 Photoshop 的标签页里。');
        return;
    }

    function px(v) { return v.as('px'); }

    var names = [];
    for (var i = 0; i < app.documents.length; i++) {
        names.push(app.documents[i].name);
    }

    var dlg = new Window('dialog', '鞋图自动排版');
    dlg.orientation = 'column';
    dlg.alignChildren = 'fill';

    var p1 = dlg.add('panel', undefined, '① 选择参考线 PSD');
    p1.orientation = 'column';
    p1.alignChildren = 'fill';
    var templateList = p1.add('dropdownlist', undefined, names);
    templateList.selection = 0;

    var p2 = dlg.add('panel', undefined, '② 选择要处理的原图');
    p2.orientation = 'column';
    p2.alignChildren = 'fill';
    var sourceList = p2.add('dropdownlist', undefined, names);
    sourceList.selection = names.length > 1 ? 1 : 0;

    var hint = dlg.add('statictext', undefined, '参考线 PSD 应该是你的 3253 × 3405 模板。');
    hint.alignment = 'left';

    var buttons = dlg.add('group');
    buttons.alignment = 'right';
    buttons.add('button', undefined, '取消', {name:'cancel'});
    buttons.add('button', undefined, '开始', {name:'ok'});

    if (dlg.show() !== 1) return;

    var template = app.documents[templateList.selection.index];
    var source = app.documents[sourceList.selection.index];

    if (template === source) {
        alert('参考线 PSD 和原图不能是同一个文件。');
        return;
    }

    // Read guides from the selected template.
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

    var W = 3253, H = 3405;
    var innerX = [], innerY = [];
    for (var a=0;a<xs.length;a++) if (xs[a] > 2 && xs[a] < W-2) innerX.push(xs[a]);
    for (var b=0;b<ys.length;b++) if (ys[b] > 2 && ys[b] < H-2) innerY.push(ys[b]);

    if (innerX.length < 2 || innerY.length < 2) {
        alert('没有找到足够的参考线。\n\n需要至少：2 条内部竖向参考线 + 2 条内部横向参考线。');
        return;
    }

    var left = innerX[0], right = innerX[innerX.length-1];
    var top = innerY[0], bottom = innerY[innerY.length-1];
    var targetW = right-left, targetH = bottom-top;

    if (targetW <= 0 || targetH <= 0) {
        alert('参考线区域无效。');
        return;
    }

    // Duplicate source so original is untouched.
    app.activeDocument = source;
    var work = source.duplicate('Shoe_AutoLayout_Work');
    app.activeDocument = work;
    try { work.flatten(); } catch(e) {}

    // Fit source image to the guide rectangle while preserving aspect ratio.
    var sw = px(work.width), sh = px(work.height);
    var scale = Math.min(targetW/sw, targetH/sh) * 100;
    work.resizeImage(UnitValue(sw * scale/100, 'px'), UnitValue(sh * scale/100, 'px'), null, ResampleMethod.PRESERVEDETAILS);

    work.selection.selectAll();
    work.selection.copy(true);
    work.selection.deselect();
    work.close(SaveOptions.DONOTSAVECHANGES);

    // Create the exact final canvas.
    var out = app.documents.add(W, H, 72, 'Shoe_AutoLayout_Result', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument = out;
    out.paste();
    var layer = out.activeLayer;
    layer.name = 'Source — fitted to guide area';

    // Center inside guide rectangle.
    var bnd = layer.bounds;
    var lw = px(bnd[2])-px(bnd[0]);
    var lh = px(bnd[3])-px(bnd[1]);
    var desiredLeft = left + (targetW-lw)/2;
    var desiredTop = top + (targetH-lh)/2;
    layer.translate(UnitValue(desiredLeft-px(bnd[0]),'px'), UnitValue(desiredTop-px(bnd[1]),'px'));

    // Copy guides to output.
    for (var xi=0; xi<xs.length; xi++) out.guides.add(Direction.VERTICAL, UnitValue(xs[xi],'px'));
    for (var yi=0; yi<ys.length; yi++) out.guides.add(Direction.HORIZONTAL, UnitValue(ys[yi],'px'));

    // Try to prepare Generative Expand. If Photoshop version does not expose
    // this action to JSX, the document is still ready for manual Generative Expand.
    var expanded = false;
    try {
        var dsc = new ActionDescriptor();
        var rect = new ActionDescriptor();
        rect.putUnitDouble(stringIDToTypeID('top'), stringIDToTypeID('pixelsUnit'), 0);
        rect.putUnitDouble(stringIDToTypeID('left'), stringIDToTypeID('pixelsUnit'), 0);
        rect.putUnitDouble(stringIDToTypeID('bottom'), stringIDToTypeID('pixelsUnit'), H);
        rect.putUnitDouble(stringIDToTypeID('right'), stringIDToTypeID('pixelsUnit'), W);
        dsc.putObject(stringIDToTypeID('to'), stringIDToTypeID('rectangle'), rect);
        dsc.putUnitDouble(stringIDToTypeID('angle'), stringIDToTypeID('angleUnit'), 0);
        dsc.putBoolean(stringIDToTypeID('delete'), false);
        executeAction(stringIDToTypeID('crop'), dsc, DialogModes.NO);
        expanded = true;
    } catch(e2) {}

    var msg = '主体已经按照参考线区域放置。\n\n画布：3253 × 3405 px';
    if (expanded) msg += '\n\nPhotoshop 已准备好下一步扩展。';
    else msg += '\n\n现在请用 Photoshop 的“生成式扩展”补满画布。';
    alert(msg);
})();