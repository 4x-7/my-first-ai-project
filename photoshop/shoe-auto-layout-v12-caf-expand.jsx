#target photoshop
app.bringToFront();
app.displayDialogs = DialogModes.NO;

(function () {
    var W = 3253, H = 3405;
    var TX = 936, TY = 1541, TW = 1422, TH = 1422;

    function px(v) { return v.as("px"); }
    function s2t(s) { return app.stringIDToTypeID(s); }

    // Photoshop's Content-Aware Fill workspace.
    // This is different from the old "Fill > Content-Aware" command
    // that was throwing Error 8800 in the user's Photoshop 2026.
    function contentAwareFill(sampleAllLayers) {
        var d = new ActionDescriptor();
        d.putEnumerated(s2t("cafSamplingRegion"), s2t("cafSamplingRegion"), s2t("cafSamplingRegionAuto"));
        d.putBoolean(s2t("cafSampleAllLayers"), sampleAllLayers);
        d.putEnumerated(s2t("cafColorAdaptationLevel"), s2t("cafColorAdaptationLevel"), s2t("cafColorAdaptationDefault"));
        d.putEnumerated(s2t("cafRotationAmount"), s2t("cafRotationAmount"), s2t("cafRotationAmountNone"));
        d.putBoolean(s2t("cafScale"), false);
        d.putBoolean(s2t("cafMirror"), false);
        d.putEnumerated(s2t("cafOutput"), s2t("cafOutput"), s2t("cafOutputToNewLayer"));
        executeAction(s2t("cafWorkspace"), d, DialogModes.NO);
    }

    function selectRect(l, t, r, b) {
        app.activeDocument.selection.select([
            [UnitValue(l, "px"), UnitValue(t, "px")],
            [UnitValue(r, "px"), UnitValue(t, "px")],
            [UnitValue(r, "px"), UnitValue(b, "px")],
            [UnitValue(l, "px"), UnitValue(b, "px")]
        ]);
    }

    if (app.documents.length < 2) {
        alert("请同时打开：\n\n1. 3253 × 3405 的参考线 PSD\n2. 要处理的原图");
        return;
    }

    var ref = null, source = null;
    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        if (Math.round(px(d.width)) === W && Math.round(px(d.height)) === H) {
            ref = d;
            break;
        }
    }
    if (!ref) { alert("没有找到 3253 × 3405 的参考线 PSD。"); return; }

    for (var j = 0; j < app.documents.length; j++) {
        if (app.documents[j] !== ref) { source = app.documents[j]; break; }
    }
    if (!source) { alert("没有找到原图。"); return; }

    // 核心逻辑：原图本身就是 1422×1422 的主体区域。
    // 不抠主体、不复制整张原图当背景。
    // 先准确放入 (936,1541)-(2358,2963)，再只扩展外面的透明区域。
    app.activeDocument = ref;
    var out = app.documents.add(UnitValue(W, "px"), UnitValue(H, "px"), 72,
        "Shoe_AutoLayout_V12_Result", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument = out;

    // Place Embedded，避免旧版跨文档 copy/paste 的问题。
    var file = new File(source.fullName);
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), file);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);

    var subject = out.activeLayer;
    subject.name = "主体原图（1422×1422）";

    // 精确缩放到 1422×1422 参考区域。
    var b = subject.bounds;
    var sw = px(b[2]) - px(b[0]);
    var sh = px(b[3]) - px(b[1]);
    if (sw <= 0 || sh <= 0) { alert("原图尺寸读取失败。"); return; }

    var fit = Math.min(TW / sw, TH / sh) * 100;
    subject.resize(fit, fit, AnchorPosition.MIDDLECENTER);
    b = subject.bounds;
    var cx = (px(b[0]) + px(b[2])) / 2;
    var cy = (px(b[1]) + px(b[3])) / 2;
    subject.translate(UnitValue(TX + TW / 2 - cx, "px"), UnitValue(TY + TH / 2 - cy, "px"));

    // 空采样层放在主体下面；CAF 使用可见主体作为采样来源。
    var helper = out.artLayers.add();
    helper.name = "背景扩展采样层";
    helper.move(subject, ElementPlacement.PLACEAFTER);

    var ok = true;
    try {
        // 四个区域分开做，避免把主体复制到外围。
        app.activeDocument = out;
        selectRect(0, 0, W, TY);
        contentAwareFill(true);
        out.selection.deselect();

        selectRect(0, TY + TH, W, H);
        contentAwareFill(true);
        out.selection.deselect();

        selectRect(0, TY, TX, TY + TH);
        contentAwareFill(true);
        out.selection.deselect();

        selectRect(TX + TW, TY, W, TY + TH);
        contentAwareFill(true);
        out.selection.deselect();
    } catch (e) {
        ok = false;
        try { out.selection.deselect(); } catch (ignore) {}
    }

    try { helper.visible = false; } catch (e1) {}

    // 复制参考线。
    try {
        for (var gx = 0; gx < ref.guides.length; gx++) {
            var g = ref.guides[gx];
            out.guides.add(g.direction, UnitValue(px(g.coordinate), "px"));
        }
    } catch (e2) {}

    // 自动保存。
    try {
        var folder = source.path;
        var psdFile = new File(folder + "/shoe_auto_layout_v12_result.psd");
        var psdOpt = new PhotoshopSaveOptions();
        psdOpt.layers = true;
        out.saveAs(psdFile, psdOpt, true, Extension.LOWERCASE);

        var pngFile = new File(folder + "/shoe_auto_layout_v12_result.png");
        var pngOpt = new PNGSaveOptions();
        out.saveAs(pngFile, pngOpt, true, Extension.LOWERCASE);
    } catch (e3) {}

    if (ok) {
        alert("V12 完成。\n\n画布：3253 × 3405 px\n原图：严格放入 X936 / Y1541 / 1422×1422\n\n这次没有把整张原图放大后当背景。\n外围四个区域分别使用 Photoshop 内容识别扩展。\n\n请只检查：中间是否已经没有“1422×1422 方块贴图感”。");
    } else {
        alert("V12 的主体定位已经完成，但 Photoshop 2026 的内容识别扩展没有成功执行。\n\n不要继续测试旧版本。把这个弹窗截图给我，我们只针对这一条命令处理。");
    }
})();
