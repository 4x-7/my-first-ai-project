#target photoshop
/* Shoe Auto Layout — v3.1
   TEST VERSION: no clipboard commands.
   Open the 3253x3405 template PSD and the source image.
*/
(function () {
    if (app.documents.length < 2) {
        alert('请同时打开：\n1. 3253 × 3405 的参考线 PSD\n2. 要处理的原图');
        return;
    }
    function px(v) { return v.as('px'); }
    var W=3253, H=3405, template=null, source=null;
    for (var i=0;i<app.documents.length;i++) {
        var d=app.documents[i];
        if (Math.round(px(d.width))===W && Math.round(px(d.height))===H) { template=d; break; }
    }
    if (!template) { alert('没有找到 3253 × 3405 的参考线 PSD。'); return; }
    for (var j=0;j<app.documents.length;j++) if (app.documents[j]!==template) { source=app.documents[j]; break; }
    if (!source) { alert('没有找到原图。'); return; }

    app.activeDocument=template;
    var xs=[], ys=[];
    for (var g=0; g<template.guides.length; g++) {
        var guide=template.guides[g], c=px(guide.coordinate);
        if (guide.direction===Direction.VERTICAL) xs.push(c); else ys.push(c);
    }
    xs.sort(function(a,b){return a-b;}); ys.sort(function(a,b){return a-b;});
    var innerX=[], innerY=[];
    for (var a=0;a<xs.length;a++) if(xs[a]>2 && xs[a]<W-2) innerX.push(xs[a]);
    for (var b=0;b<ys.length;b++) if(ys[b]>2 && ys[b]<H-2) innerY.push(ys[b]);
    if(innerX.length<2 || innerY.length<2){ alert('参考线不足：至少需要两条内部竖线和两条内部横线。'); return; }

    var left=innerX[0], right=innerX[innerX.length-1], top=innerY[0], bottom=innerY[innerY.length-1];
    var targetW=right-left, targetH=bottom-top;

    app.activeDocument=source;
    var work=source.duplicate('Shoe_AutoLayout_TEMP');
    app.activeDocument=work;
    try{work.flatten();}catch(e0){}
    var sw=px(work.width), sh=px(work.height);
    var scale=Math.min(targetW/sw,targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'),UnitValue(sh*scale,'px'),null,ResampleMethod.PRESERVEDETAILS);

    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    app.activeDocument=work;
    var layer=work.activeLayer.duplicate(out,ElementPlacement.PLACEATBEGINNING);
    work.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument=out;
    layer.name='Source - guide area';
    var bb=layer.bounds, lw=px(bb[2])-px(bb[0]), lh=px(bb[3])-px(bb[1]);
    layer.translate(UnitValue(left+(targetW-lw)/2-px(bb[0]),'px'),UnitValue(top+(targetH-lh)/2-px(bb[1]),'px'));
    for(var xi=0;xi<xs.length;xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for(var yi=0;yi<ys.length;yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));
    alert('成功！\n\n画布：3253 × 3405 px\n主体：已放入参考线区域\n\n这只是第一阶段测试。\n如果位置正确，我们下一步再加入自然扩展背景和 PNG 自动导出。');
})();
