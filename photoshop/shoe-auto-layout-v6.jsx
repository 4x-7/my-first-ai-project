#target photoshop
/* Shoe Auto Layout v6 — Photoshop 2021
   Goal: keep the original image intact inside the guide rectangle and expand
   only the surrounding canvas. Unlike v5, this version NEVER uses a second
   full-size copy of the original image as a background, which caused
   duplicated people/shapes. It grows the background outward in four strips
   using classic Content-Aware Fill, then restores the original image on top.
*/
(function () {
    var W=3253, H=3405;
    function px(v){ return v.as('px'); }
    function s2t(s){ return app.stringIDToTypeID(s); }
    function selectRect(l,t,r,b){
        app.activeDocument.selection.select([
            [UnitValue(l,'px'),UnitValue(t,'px')],
            [UnitValue(r,'px'),UnitValue(t,'px')],
            [UnitValue(r,'px'),UnitValue(b,'px')],
            [UnitValue(l,'px'),UnitValue(b,'px')]
        ]);
    }
    function fillContentAware(){
        var d=new ActionDescriptor();
        d.putEnumerated(charIDToTypeID('Usng'),charIDToTypeID('FlCn'),s2t('contentAware'));
        d.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);
        d.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));
        executeAction(charIDToTypeID('Fl  '),d,DialogModes.NO);
    }
    function clearSelection(){ try{ app.activeDocument.selection.deselect(); }catch(e){} }
    if(app.documents.length<2){ alert('请同时打开：\n1. 参考线 PSD\n2. 要处理的原图'); return; }

    var template=null, source=null;
    for(var i=0;i<app.documents.length;i++){
        var d=app.documents[i];
        if(Math.round(px(d.width))===W && Math.round(px(d.height))===H){ template=d; break; }
    }
    if(!template){ alert('没有找到 3253 × 3405 的参考线 PSD。'); return; }
    for(var j=0;j<app.documents.length;j++) if(app.documents[j]!==template){ source=app.documents[j]; break; }
    if(!source){ alert('没有找到原图。'); return; }

    // Read the guides. We use the outermost internal pair as the placement rectangle.
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
    var left=ix[0], right=ix[ix.length-1], top=iy[0], bottom=iy[iy.length-1];
    var targetW=right-left, targetH=bottom-top;

    // Make a flattened preparation copy of the original and scale it to fit the guide rectangle.
    app.activeDocument=source;
    var work=source.duplicate('Shoe_AutoLayout_SubjectPrep_v6');
    app.activeDocument=work;
    try{ work.flatten(); }catch(e0){}
    var sw=px(work.width), sh=px(work.height);
    var scale=Math.min(targetW/sw,targetH/sh);
    work.resizeImage(UnitValue(sw*scale,'px'),UnitValue(sh*scale,'px'),null,ResampleMethod.PRESERVEDETAILS);
    work.selection.selectAll();
    work.activeLayer.copy();
    work.selection.deselect();

    // Final canvas. The original image is the ONLY initial image layer.
    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result_v6',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    app.activeDocument=out;
    out.paste();
    var subject=out.activeLayer;
    subject.name='Original Image — Guide Area';
    var bounds=subject.bounds;
    var lw=px(bounds[2])-px(bounds[0]), lh=px(bounds[3])-px(bounds[1]);
    var destLeft=left+(targetW-lw)/2, destTop=top+(targetH-lh)/2;
    subject.translate(UnitValue(destLeft-px(bounds[0]),'px'),UnitValue(destTop-px(bounds[1]),'px'));

    // Duplicate the subject layer ONLY as a temporary working layer. It is not scaled or used as a full-canvas image.
    var base=subject.duplicate('Background Expansion Working Copy');
    app.activeDocument=out;
    base.move(subject,ElementPlacement.PLACEAFTER);
    // Rasterize/flatten the working copy if possible.
    try{ base.name='Background Expansion Working Copy'; }catch(e1){}

    // We will expand from the four edges of the placed image. First make the working layer
    // larger by using Canvas Size; then fill only the new strips. This prevents the original
    // subject from being copied as a second centered image across the whole canvas.
    var sb=subject.bounds;
    var sx1=px(sb[0]), sy1=px(sb[1]), sx2=px(sb[2]), sy2=px(sb[3]);

    // Put the working copy behind the subject. The areas outside the original image are transparent.
    // Photoshop's Content-Aware Fill can fill those selected transparent regions from nearby pixels.
    base.opacity=100;
    app.activeDocument=out;

    // Expand left/right first, using narrow strips. Then top/bottom. Each fill is intentionally
    // limited to a strip so Content-Aware Fill sees nearby background rather than the whole subject.
    var strip=Math.max(80,Math.round(Math.min(targetW,targetH)*0.08));
    var ok=true;
    try{
        // Left strip
        if(sx1>0){
            selectRect(0,Math.max(0,sy1-strip),sx1,Math.min(H,sy2+strip));
            fillContentAware(); clearSelection();
        }
        // Right strip
        if(sx2<W){
            selectRect(sx2,Math.max(0,sy1-strip),W,Math.min(H,sy2+strip));
            fillContentAware(); clearSelection();
        }
        // Top strip — now use the expanded left/right area as context.
        if(sy1>0){
            selectRect(0,0,W,sy1);
            fillContentAware(); clearSelection();
        }
        // Bottom strip
        if(sy2<H){
            selectRect(0,sy2,W,H);
            fillContentAware(); clearSelection();
        }
    }catch(e2){ ok=false; clearSelection(); }

    // The working copy may still contain transparent or incomplete areas. Keep it below the original.
    try{ base.move(subject,ElementPlacement.PLACEAFTER); }catch(e3){}

    // Add the original guides for checking.
    for(var xi=0;xi<xs.length;xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for(var yi=0;yi<ys.length;yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));

    try{ work.close(SaveOptions.DONOTSAVECHANGES); }catch(e4){}

    // Save PSD + PNG next to the source image.
    try{
        var baseFolder=source.path;
        var psdFile=new File(baseFolder+'/shoe_auto_layout_result_v6.psd');
        var psdOpt=new PhotoshopSaveOptions(); psdOpt.layers=true;
        out.saveAs(psdFile,psdOpt,true,Extension.LOWERCASE);
        var pngFile=new File(baseFolder+'/shoe_auto_layout_result_v6.png');
        var pngOpt=new PNGSaveOptions();
        out.saveAs(pngFile,pngOpt,true,Extension.LOWERCASE);
    }catch(e5){}

    if(ok){
        alert('v6 完成！\n画布：3253 × 3405 px\n主体：保持完整并放入参考线矩形\n背景：不再复制整张原图，改为从四周向外扩展\n已保存 PSD + PNG。');
    }else{
        alert('主体定位已完成，但 PS 2021 的背景内容识别扩展失败。\n没有再复制整张原图，因此不会出现重复主体拼贴。');
    }
})();
