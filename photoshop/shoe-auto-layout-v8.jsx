#target photoshop
app.bringToFront();

(function () {

    // ==============================
    // Photoshop 2021 稳定版
    // 原图 -> 参考线 PSD
    // ==============================

    if (app.documents.length < 2) {
        alert("请先同时打开：\n\n1. 参考线 PSD\n2. 要处理的原图 JPG");
        return;
    }

    // 找到 3253 × 3405 的参考 PSD
    var target = null;
    var source = null;

    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];

        if (d.width.as("px") == 3253 &&
            d.height.as("px") == 3405) {
            target = d;
        }
    }

    if (!target) {
        alert("没有找到 3253 × 3405 的参考线 PSD。\n\n请先打开你的参考线 PSD。");
        return;
    }

    // 找到另一张图片作为原图
    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] != target) {
            source = app.documents[j];
            break;
        }
    }

    if (!source) {
        alert("没有找到原图。");
        return;
    }

    // ==============================
    // 读取参考线
    // ==============================

    var vertical = [];
    var horizontal = [];

    for (var g = 0; g < target.guides.length; g++) {

        var guide = target.guides[g];
        var pos = guide.coordinate.as("px");

        if (guide.direction == Direction.VERTICAL) {
            vertical.push(pos);
        } else {
            horizontal.push(pos);
        }
    }

    if (vertical.length < 2 || horizontal.length < 2) {
        alert("参考线数量不够。\n\n至少需要 2 条竖参考线 + 2 条横参考线。");
        return;
    }

    vertical.sort(function(a,b){ return a-b; });
    horizontal.sort(function(a,b){ return a-b; });

    // ==============================
    // 找“画布中心”附近的参考线
    // ==============================

    var canvasW = target.width.as("px");
    var canvasH = target.height.as("px");

    var centerX = canvasW / 2;
    var centerY = canvasH / 2;

    var leftGuide = null;
    var rightGuide = null;
    var topGuide = null;
    var bottomGuide = null;

    // 离中心最近的左边参考线
    for (var v = 0; v < vertical.length; v++) {
        if (vertical[v] < centerX) {
            leftGuide = vertical[v];
        }
    }

    // 离中心最近的右边参考线
    for (var v2 = 0; v2 < vertical.length; v2++) {
        if (vertical[v2] > centerX) {
            rightGuide = vertical[v2];
            break;
        }
    }

    // 离中心最近的上方参考线
    for (var h = 0; h < horizontal.length; h++) {
        if (horizontal[h] < centerY) {
            topGuide = horizontal[h];
        }
    }

    // 离中心最近的下方参考线
    for (var h2 = 0; h2 < horizontal.length; h2++) {
        if (horizontal[h2] > centerY) {
            bottomGuide = horizontal[h2];
            break;
        }
    }

    if (
        leftGuide === null ||
        rightGuide === null ||
        topGuide === null ||
        bottomGuide === null
    ) {
        alert("没有找到位于画布中心两侧的参考线。\n\n请检查参考线 PSD。");
        return;
    }

    var boxLeft = leftGuide;
    var boxRight = rightGuide;
    var boxTop = topGuide;
    var boxBottom = bottomGuide;

    var boxW = boxRight - boxLeft;
    var boxH = boxBottom - boxTop;

    var boxCenterX = (boxLeft + boxRight) / 2;
    var boxCenterY = (boxTop + boxBottom) / 2;

    // ==============================
    // 把原图复制到参考 PSD
    // ==============================

    app.activeDocument = source;

    // 复制整个原图
    source.selection.selectAll();
    source.activeLayer.copy();
    source.selection.deselect();

    // 回到参考 PSD
    app.activeDocument = target;

    // 粘贴
    target.paste();

    var newLayer = target.activeLayer;
    newLayer.name = "Original Image - Placed";

    // ==============================
    // 获取原图尺寸
    // ==============================

    var b = newLayer.bounds;

    var layerW = b[2].as("px") - b[0].as("px");
    var layerH = b[3].as("px") - b[1].as("px");

    // ==============================
    // 按比例缩放
    // 完整放进参考线矩形
    // ==============================

    var scaleX = boxW / layerW;
    var scaleY = boxH / layerH;

    // 留一点安全边距
    var scale = Math.min(scaleX, scaleY) * 0.96;

    newLayer.resize(
        scale * 100,
        scale * 100,
        AnchorPosition.MIDDLECENTER
    );

    // ==============================
    // 重新计算位置
    // ==============================

    b = newLayer.bounds;

    var newCenterX =
        (b[0].as("px") + b[2].as("px")) / 2;

    var newCenterY =
        (b[1].as("px") + b[3].as("px")) / 2;

    var moveX = boxCenterX - newCenterX;
    var moveY = boxCenterY - newCenterY;

    newLayer.translate(
        UnitValue(moveX, "px"),
        UnitValue(moveY, "px")
    );

    // ==============================
    // 完成
    // ==============================

    alert(
        "完成！\n\n" +
        "原图已经放入参考线中间矩形。\n\n" +
        "矩形： " +
        Math.round(boxW) + " × " +
        Math.round(boxH) + " px\n\n" +
        "画布：3253 × 3405 px"
    );

})();
