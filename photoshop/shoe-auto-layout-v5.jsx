#target photoshop
/* Shoe Auto Layout v5 — Photoshop 2021
   Uses normal Copy/Paste (not Copy Merged) to move the prepared source layer.
   Goal: 3253x3405 canvas, source centered inside the internal guide rectangle,
   then attempt classic Content-Aware Fill on the empty area.
*/
(function () {
    var W=3253, H=3405;
    function px(v){ return v.as('px'); }
    function s2t(s){ return app.stringIDToTypeID(s); }
    if(app.documents.length<2){ alert('请同时打开：\n1. 参考线 PSD\n2. 要处理的原图'); return; }

    var template=null, source=null;
    for(var i=0;i<app.documents.length;i++){
        var d=app.documents[i];
        if(Math.round(px(d.width))===W && Math.round(px(d.height))===H){ template=d; break; }
    }
    if(!template){ alert('没有找到 3253 × 3405 的参考线 PSD。'); return; }
    for(var j=0;j<app.documents.length;j++) if(app.documents[j]!==template){ source=app.documents[j]; break; }
    if(!source){ alert('没有找到原图。'); return; }

    app.activeDocument=template;
    var xs=[],ys=[];
    for(var g=0;g<template.guides.length;g++){
        var guide=template.guides[g], c=px(guide.coordinate);
        if(guide.direction===Direction.VERTICAL) xs.push(c); else ys.push(c);
    }
    xs.sort(function(a,b){return a-b;}); ys.sort(function(a,b){return a-b;});
    var ix=[],iy=[];
    for(var a=0;a<xs.length;a++) if(xs[a]>2 && xs[a]<W-2) ix.push(xs[a]);
    for(var b=0;b<ys.length;b++) if(ys[b]>2 && ys[b]<H-2) iy.push(ys[b]);
    if(ix.length<2 || iy.length<2){ alert('没有找到足够的内部参考线。'); return; }
    var left=ix[0],right=ix[ix.length-1],top=iy[0],bottom=iy[iy.length-1];
    var targetW=right-left,targetH=bottom-top;

    app.activeDocument=source;
    var work=source.duplicate('Shoe_AutoLayout_Source');
    app.activeDocument=work;
    try{ work.flatten(); }catch(e0){}
    var sw=px(work.width),sh=px(work.height);
    var scale=Math.min(targetW/sw,targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'),UnitValue(sh*scale,'px'),null,ResampleMethod.PRESERVEDETAILS);

    // Copy the prepared image with ordinary Copy, avoiding the PS 2021 'Copy Merged' issue.
    work.selection.selectAll();
    work.activeLayer.copy();
    work.selection.deselect();

    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    app.activeDocument=out;
    out.paste();
    var layer=out.activeLayer;
    layer.name='Original Image — Guide Area';

    var bounds=layer.bounds;
    var lw=px(bounds[2])-px(bounds[0]), lh=px(bounds[3])-px(bounds[1]);
    var destLeft=left+(targetW-lw)/2, destTop=top+(targetH-lh)/2;
    layer.translate(UnitValue(destLeft-px(bounds[0]),'px'),UnitValue(destTop-px(bounds[1]),'px'));

    // Add the same guides to the result.
    for(var xi=0;xi<xs.length;xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for(var yi=0;yi<ys.length;yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));

    try{ work.close(SaveOptions.DONOTSAVECHANGES); }catch(e1){}

    // Select the transparent area by loading layer transparency, then invert.
    try{
        var ref=new ActionReference();
        ref.putProperty(s2t('channel'),s2t('selection'));
        var ref2=new ActionReference();
        ref2.putEnumerated(s2t('channel'),s2t('channel'),s2t('transparencyEnum'));
        var desc=new ActionDescriptor();
        desc.putReference(s2t('null'),ref);
        desc.putReference(s2t('to'),ref2);
        executeAction(s2t('set'),desc,DialogModes.NO);
        out.selection.invert();
    }catch(e2){
        alert('主体位置已完成，但无法自动建立背景选择区域。\n请检查 Shoe_AutoLayout_Result 后继续。');
        return;
    }

    // Classic Content-Aware Fill available in Photoshop 2021.
    try{
        var fillDesc=new ActionDescriptor();
        fillDesc.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),s2t('contentAware'));
        fillDesc.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);
        fillDesc.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));
        executeAction(charIDToTypeID('Fl  '),fillDesc,DialogModes.NO);
    }catch(e3){
        alert('主体和 3253×3405 画布已经完成。\n\nPS 2021 的内容识别填充没有被脚本自动执行。\n请在当前文件中：编辑 → 填充 → 内容识别。');
    }
    try{ out.selection.deselect(); }catch(e4){}
    try{
        var f=new File(source.path+'/shoe_auto_layout_result.psd');
        var opt=new PhotoshopSaveOptions(); opt.layers=true;
        out.saveAs(f,opt,true,Extension.LOWERCASE);
    }catch(e5){}
    alert('完成！\n画布：3253 × 3405 px\n主体：已放入参考线矩形\n背景：已尝试用 PS 2021 内容识别填充。');
})();
