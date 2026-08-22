#target photoshop
/*
  Shoe Auto Layout — V9 Blended Background
  For Photoshop 2026 / Mac

  Workflow:
  1. Find the 3253 x 3405 reference PSD.
  2. Read the internal guide rectangle.
  3. Open the source image and prepare a copy for the subject.
  4. Put the subject into the guide rectangle.
  5. Build a full-canvas background from another copy of the source.
  6. Use Gaussian Blur instead of Content-Aware Fill.
     This deliberately avoids the Photoshop commands that caused:
     "常规 Photoshop 错误 / 命令不可用".
  7. Save PSD + PNG beside the source image.

  IMPORTANT:
  The original source image is never modified.
*/

(function () {
    var CANVAS_W = 3253;
    var CANVAS_H = 3405;
    var DPI = 72;

    function px(v) {
        try { return v.as("px"); }
        catch (e) { return Number(v); }
    }

    function roundPx(v) {
        return Math.round(px(v));
    }

    function closeQuietly(doc) {
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
    }

    function getGuideData(doc) {
        var xs = [], ys = [];

        for (var i = 0; i < doc.guides.length; i++) {
            var g = doc.guides[i];
            var c = px(g.coordinate);

            if (g.direction === Direction.VERTICAL) {
                xs.push(c);
            } else {
                ys.push(c);
            }
        }

        xs.sort(function(a,b){ return a-b; });
        ys.sort(function(a,b){ return a-b; });

        var ix = [], iy = [];

        for (var x = 0; x < xs.length; x++) {
            if (xs[x] > 2 && xs[x] < CANVAS_W - 2) ix.push(xs[x]);
        }

        for (var y = 0; y < ys.length; y++) {
            if (ys[y] > 2 && ys[y] < CANVAS_H - 2) iy.push(ys[y]);
        }

        if (ix.length < 2 || iy.length < 2) return null;

        return {
            left: ix[0],
            right: ix[ix.length - 1],
            top: iy[0],
            bottom: iy[iy.length - 1],
            xs: xs,
            ys: ys
        };
    }

    function centerLayerInRect(layer, left, top, right, bottom) {
        var b = layer.bounds;
        var w = px(b[2]) - px(b[0]);
        var h = px(b[3]) - px(b[1]);

        var targetW = right - left;
        var targetH = bottom - top;

        var dx = left + (targetW - w) / 2 - px(b[0]);
        var dy = top + (targetH - h) / 2 - px(b[1]);

        layer.translate(UnitValue(dx, "px"), UnitValue(dy, "px"));
    }

    function fitLayerToCanvas(layer, canvasW, canvasH) {
        var b = layer.bounds;
        var w = px(b[2]) - px(b[0]);
        var h = px(b[3]) - px(b[1]);

        var scale = Math.max(canvasW / w, canvasH / h);

        layer.resize(
            scale * 100,
            scale * 100,
            AnchorPosition.MIDDLECENTER
        );

        b = layer.bounds;

        var newW = px(b[2]) - px(b[0]);
        var newH = px(b[3]) - px(b[1]);

        var dx = (canvasW - newW) / 2 - px(b[0]);
        var dy = (canvasH - newH) / 2 - px(b[1]);

        layer.translate(UnitValue(dx, "px"), UnitValue(dy, "px"));
    }

    function addGuidesToOutput(out, guideData) {
        for (var i = 0; i < guideData.xs.length; i++) {
            out.guides.add(
                Direction.VERTICAL,
                UnitValue(guideData.xs[i], "px")
            );
        }

        for (var j = 0; j < guideData.ys.length; j++) {
            out.guides.add(
                Direction.HORIZONTAL,
                UnitValue(guideData.ys[j], "px")
            );
        }
    }

    function makeBackgroundSoft(layer) {
        try {
            layer.applyGaussianBlur(80);
        } catch (e1) {
            try {
                layer.applyGaussianBlur(60);
            } catch (e2) {
                // If blur is unavailable, leave the background intact.
            }
        }
    }

    function saveResults(out, source) {
        var folder = source.path;

        var psdFile = new File(folder + "/shoe_auto_layout_result_V9.psd");
        var psdOpt = new PhotoshopSaveOptions();
        psdOpt.layers = true;

        out.saveAs(
            psdFile,
            psdOpt,
            true,
            Extension.LOWERCASE
        );

        var pngFile = new File(folder + "/shoe_auto_layout_result_V9.png");
        var pngOpt = new PNGSaveOptions();

        out.saveAs(
            pngFile,
            pngOpt,
            true,
            Extension.LOWERCASE
        );
    }

    function fail(message, temp1, temp2, temp3) {
        closeQuietly(temp1);
        closeQuietly(temp2);
        closeQuietly(temp3);
        alert(
            "V9 停止：\n\n" +
            message +
            "\n\n没有继续执行可能出错的步骤。"
        );
    }

    if (app.documents.length < 2) {
        alert(
            "请先同时打开两个文件：\n\n" +
            "① 3253 × 3405 的参考线 PSD\n" +
            "② 要处理的原图\n\n" +
            "然后重新运行 V9。"
        );
        return;
    }

    var template = null;
    var source = null;

    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];

        if (
            roundPx(d.width) === CANVAS_W &&
            roundPx(d.height) === CANVAS_H
        ) {
            template = d;
            break;
        }
    }

    if (!template) {
        alert(
            "没有找到 3253 × 3405 的参考线 PSD。\n\n" +
            "请把参考线 PSD 打开后再运行。"
        );
        return;
    }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== template) {
            source = app.documents[j];
            break;
        }
    }

    if (!source) {
        alert("没有找到原图。");
        return;
    }

    app.activeDocument = template;

    var guideData = getGuideData(template);

    if (!guideData) {
        alert(
            "没有找到足够的内部参考线。\n\n" +
            "需要至少 2 条内部竖线 + 2 条内部横线。"
        );
        return;
    }

    var left = guideData.left;
    var right = guideData.right;
    var top = guideData.top;
    var bottom = guideData.bottom;

    var targetW = right - left;
    var targetH = bottom - top;

    if (targetW <= 0 || targetH <= 0) {
        alert("参考线矩形尺寸异常，脚本停止。");
        return;
    }

    var subjectPrep = null;

    try {
        subjectPrep = source.duplicate("V9_Subject_Prep");
        app.activeDocument = subjectPrep;

        try { subjectPrep.flatten(); } catch (flattenErr) {}

        var sw = px(subjectPrep.width);
        var sh = px(subjectPrep.height);

        if (sw <= 0 || sh <= 0) {
            fail("原图尺寸读取失败。", subjectPrep, null, null);
            return;
        }

        var subjectScale = Math.min(
            targetW / sw,
            targetH / sh
        );

        subjectPrep.resizeImage(
            UnitValue(sw * subjectScale, "px"),
            UnitValue(sh * subjectScale, "px"),
            null,
            ResampleMethod.PRESERVEDETAILS
        );

        subjectPrep.selection.selectAll();
        subjectPrep.activeLayer.copy();
        subjectPrep.selection.deselect();

    } catch (eSubject) {
        fail(
            "【制作主体】失败：\n" +
            eSubject.message,
            subjectPrep,
            null,
            null
        );
        return;
    }

    var out = null;

    try {
        out = app.documents.add(
            CANVAS_W,
            CANVAS_H,
            DPI,
            "Shoe_AutoLayout_Result",
            NewDocumentMode.RGB,
            DocumentFill.TRANSPARENT
        );

        app.activeDocument = out;

        out.paste();

        var subject = out.activeLayer;
        subject.name = "主体 — 原图";

        centerLayerInRect(
            subject,
            left,
            top,
            right,
            bottom
        );

    } catch (eOutput) {
        fail(
            "【放置主体】失败：\n" +
            eOutput.message,
            subjectPrep,
            null,
            out
        );
        return;
    }

    var backgroundPrep = null;

    try {
        backgroundPrep = source.duplicate("V9_Background_Prep");
        app.activeDocument = backgroundPrep;

        try { backgroundPrep.flatten(); } catch (flattenErr2) {}

        backgroundPrep.selection.selectAll();
        backgroundPrep.activeLayer.copy();
        backgroundPrep.selection.deselect();

    } catch (eBgPrep) {
        fail(
            "【准备背景】失败：\n" +
            eBgPrep.message,
            subjectPrep,
            backgroundPrep,
            out
        );
        return;
    }

    try {
        app.activeDocument = out;

        out.paste();

        var background = out.activeLayer;
        background.name = "背景 — 原图扩展";

        fitLayerToCanvas(
            background,
            CANVAS_W,
            CANVAS_H
        );

        makeBackgroundSoft(background);

        try {
            background.resize(108, 108, AnchorPosition.MIDDLECENTER);
            var bb = background.bounds;
            var bw = px(bb[2]) - px(bb[0]);
            var bh = px(bb[3]) - px(bb[1]);
            background.translate(
                UnitValue((CANVAS_W - bw) / 2 - px(bb[0]), "px"),
                UnitValue((CANVAS_H - bh) / 2 - px(bb[1]), "px")
            );
        } catch (zoomErr) {}

        background.move(
            subject,
            ElementPlacement.PLACEAFTER
        );

    } catch (eBg) {
        fail(
            "【制作背景】失败：\n" +
            eBg.message,
            subjectPrep,
            backgroundPrep,
            out
        );
        return;
    }

    try {
        addGuidesToOutput(out, guideData);
    } catch (guideErr) {}

    closeQuietly(subjectPrep);
    closeQuietly(backgroundPrep);

    app.activeDocument = out;

    var finalW = roundPx(out.width);
    var finalH = roundPx(out.height);

    if (finalW !== CANVAS_W || finalH !== CANVAS_H) {
        alert(
            "V9 已停止：最终画布尺寸不正确。\n\n" +
            "当前：" + finalW + " × " + finalH + "\n" +
            "要求：" + CANVAS_W + " × " + CANVAS_H
        );
        return;
    }

    try {
        saveResults(out, source);
    } catch (eSave) {
        alert(
            "图片已经制作完成，但自动保存失败。\n\n" +
            "请手动保存当前 PSD。\n\n" +
            "错误：\n" +
            eSave.message
        );
        return;
    }

    alert(
        "V9 完成！\n\n" +
        "画布：" + finalW + " × " + finalH + " px\n" +
        "参考区域：" + Math.round(targetW) + " × " +
        Math.round(targetH) + " px\n\n" +
        "主体：已放入参考线矩形\n" +
        "背景：已铺满并柔化\n" +
        "PSD：已保存\n" +
        "PNG：已保存\n\n" +
        "本版本不使用 Content-Aware Fill；背景采用放大 + 强柔化，避免之前的重复主体硬叠。"
    );

})();
