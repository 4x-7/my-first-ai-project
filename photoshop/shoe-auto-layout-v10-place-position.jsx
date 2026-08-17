#target photoshop
app.bringToFront();
app.displayDialogs = DialogModes.NO;

(function () {
    if (app.documents.length < 2) {
        alert("请同时打开：参考线 PSD + 原图 JPG/PNG。");
        return;
    }

    var ref = null;
    var source = null;

    // Reference document = document containing guides.
    for (var i = 0; i < app.documents.length; i++) {
        if (app.documents[i].guides.length >= 4) {
            ref = app.documents[i];
            break;
        }
    }
    if (!ref) {
        alert("没有找到包含参考线的 PSD。请先打开参考线 PSD。");
        return;
    }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== ref) {
            source = app.documents[j];
            break;
        }
    }
    if (!source) {
        alert("没有找到原图。");
        return;
    }

    function getGuides(direction) {
        var a = [];
        for (var k = 0; k < ref.guides.length; k++) {
            var g = ref.guides[k];
            if (g.direction == direction) a.push(g.coordinate.as('px'));
        }
        a.sort(function(a,b){return a-b;});
        return a;
    }

    var xs = getGuides(Direction.VERTICAL);
    var ys = getGuides(Direction.HORIZONTAL);

    if (xs.length < 2 || ys.length < 2) {
        alert("参考线不足：至少需要 2 条竖线和 2 条横线。");
        return;
    }

    // Pick the two guides surrounding the canvas center.
    var cw = ref.width.as('px');
    var ch = ref.height.as('px');
    var cx = cw / 2;
    var cy = ch / 2;
    var left = null, right = null, top = null, bottom = null;

    for (var x = 0; x < xs.length; x++) {
        if (xs[x] < cx) left = xs[x];
        if (xs[x] > cx) { right = xs[x]; break; }
    }
    for (var y = 0; y < ys.length; y++) {
        if (ys[y] < cy) top = ys[y];
        if (ys[y] > cy) { bottom = ys[y]; break; }
    }

    if (left === null || right === null || top === null || bottom === null) {
        alert("无法找到画布中心的矩形参考区域。");
        return;
    }

    var boxW = right-left;
    var boxH = bottom-top;
    var boxCX = (left+right)/2;
    var boxCY = (top+bottom)/2;

    // Work on a duplicate of the reference document.
    app.activeDocument = ref;
    var result = ref.duplicate('Shoe_AutoLayout_v10_Result', true);
    app.activeDocument = result;

    // Place the source through Photoshop's native Place Embedded command.
    // This is intentionally used instead of cross-document copy/paste.
    var tmp = new File(source.fullName);
    var idPlc = charIDToTypeID('Plc ');
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID('null'), tmp);
    desc.putEnumerated(charIDToTypeID('FTcs'), charIDToTypeID('QCSt'), charIDToTypeID('Qcsa'));
    executeAction(idPlc, desc, DialogModes.NO);

    var layer = result.activeLayer;
    layer.name = 'ORIGINAL IMAGE - PLACED';

    // Scale the placed image so it covers the guide rectangle.
    var b = layer.bounds;
    var w = b[2].as('px') - b[0].as('px');
    var h = b[3].as('px') - b[1].as('px');
    if (w <= 0 || h <= 0) {
        alert('置入后的原图尺寸无效。');
        return;
    }

    // Fit entirely inside the guide rectangle, preserving aspect ratio.
    var scale = Math.min(boxW / w, boxH / h) * 100;
    layer.resize(scale, scale, AnchorPosition.MIDDLECENTER);

    b = layer.bounds;
    var lcX = (b[0].as('px') + b[2].as('px')) / 2;
    var lcY = (b[1].as('px') + b[3].as('px')) / 2;
    layer.translate(UnitValue(boxCX-lcX,'px'), UnitValue(boxCY-lcY,'px'));

    // Exact output canvas size.
    result.resizeCanvas(UnitValue(3253,'px'), UnitValue(3405,'px'), AnchorPosition.MIDDLECENTER);

    alert('v10 完成！\n\n原图已通过“置入嵌入的对象”放入结果 PSD，并自动缩放、居中到参考线矩形。\n\n下一步我们再处理背景扩展。');
})();