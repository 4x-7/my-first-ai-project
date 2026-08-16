#target photoshop
/* Shoe Auto Layout v5 — Photoshop 2021
   Optimized background workflow:
   1) Prepare the subject inside the guide rectangle.
   2) Build a full-canvas background from the original image, scaled to cover.
   3) Remove the duplicate subject area from that background with classic Content-Aware Fill.
   4) Place the prepared subject back on top.
*/
(function () {
    var W=3253, H=3405;
    function px(v){ return v.as('px'); }
    function s2t(s){ return app.stringIDToTypeID(s); }
    function fillContentAware(){
        var d=new ActionDescriptor();
        d.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),s2t('contentAware'));
        d.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);
        d.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));
        executeAction(charIDToTypeID('Fl  '),d,DialogModes.NO);
    }
    function selectRect(l,t,r,b){
        app.activeDocument.selection.select([
            [UnitValue(l,'px'),UnitValue(t,'px')],
            [UnitValue(r,'px'),UnitValue(t,'px')],
            [UnitValue(r,'px'),UnitValue(b,'px')],
            [UnitValue(l,'px'),UnitValue(b,'px')]
        ]);
    }
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

    // Prepare subject at guide size.
    app.activeDocument=source;
    var work=source.duplicate('Shoe_AutoLayout_SubjectPrep');
    app.activeDocument=work;
    try{ work.flatten(); }catch(e0){}
    var sw=px(work.width),sh=px(work.height);
    var scale=Math.min(targetW/sw,targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'),UnitValue(sh*scale,'px'),null,ResampleMethod.PRESERVEDETAILS);
    work.selection.selectAll();
    work.activeLayer.copy();
    work.selection.deselect();

    // Final canvas.
    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    app.activeDocument=out;
    out.paste();
    var subject=out.activeLayer;
    subject.name='Original Image — Guide Area';
    var bounds=subject.bounds;
    var lw=px(bounds[2])-px(bounds[0]), lh=px(bounds[3])-px(bounds[1]);
    var destLeft=left+(targetW-lw)/2, destTop=top+(targetH-lh)/2;
    subject.translate(UnitValue(destLeft-px(bounds[0]),'px'),UnitValue(destTop-px(bounds[1]),'px'));

    // Subject bounds: used only to remove the duplicate subject from the background copy.
    var sb=subject.bounds;
    var sx1=px(sb[0]), sy1=px(sb[1]), sx2=px(sb[2]), sy2=px(sb[3]);
    var pad=Math.max(35,Math.round(Math.max(sx2-sx1,sy2-sy1)*0.025));
    sx1=Math.max(0,sx1-pad); sy1=Math.max(0,sy1-pad);
    sx2=Math.min(W,sx2+pad); sy2=Math.min(H,sy2+pad);

    // Build a full-canvas background from the original image.
    app.activeDocument=source;
    var bg=source.duplicate('Shoe_AutoLayout_BackgroundPrep');
    app.activeDocument=bg;
    try{ bg.flatten(); }catch(e1){}
    var bw=px(bg.width), bh=px(bg.height);
    var bgScale=Math.max(W/bw,H/bh);
    bg.resizeImage(UnitValue(bw*bgScale,'px'),UnitValue(bh*bgScale,'px'),null,ResampleMethod.PRESERVEDETAILS);
    bg.selection.selectAll();
    bg.activeLayer.copy();
    bg.selection.deselect();
    app.activeDocument=out;
    out.paste();
    var background=out.activeLayer;
    background.name='Background — Expanded';
    var bb=background.bounds;
    var bw2=px(bb[2])-px(bb[0]), bh2=px(bb[3])-px(bb[1]);
    background.translate(UnitValue((W-bw2)/2-px(bb[0]),'px'),UnitValue((H-bh2)/2-px(bb[1]),'px'));
    background.move(subject,ElementPlacement.PLACEAFTER);

    // Remove the duplicate subject from the background only.
    app.activeDocument=out;
    try{
        selectRect(sx1,sy1,sx2,sy2);
        fillContentAware();
        out.selection.deselect();
    }catch(e2){
        try{ out.selection.deselect(); }catch(e3){}
        alert('主体定位已完成，但背景内容识别填充失败。\n主体和背景仍会保留，请检查结果。');
    }

    for(var xi=0;xi<xs.length;xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for(var yi=0;yi<ys.length;yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));

    try{ work.close(SaveOptions.DONOTSAVECHANGES); }catch(e4){}
    try{ bg.close(SaveOptions.DONOTSAVECHANGES); }catch(e5){}
    try{ subject.move(background,ElementPlacement.PLACEBEFORE); }catch(e6){}

    // Save PSD and PNG automatically.
    try{
        var baseFolder=source.path;
        var psdFile=new File(baseFolder+'/shoe_auto_layout_result.psd');
        var psdOpt=new PhotoshopSaveOptions(); psdOpt.layers=true;
        out.saveAs(psdFile,psdOpt,true,Extension.LOWERCASE);
        var pngFile=new File(baseFolder+'/shoe_auto_layout_result.png');
        var pngOpt=new PNGSaveOptions();
        out.saveAs(pngFile,pngOpt,true,Extension.LOWERCASE);
    }catch(e7){}

    alert('完成！\n画布：3253 × 3405 px\n主体：已放入参考线矩形\n背景：已优化，减少重复主体\n同时保存 PSD + PNG。');
})();
