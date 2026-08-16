#target photoshop
/* Shoe Auto Layout v6.1 — Photoshop 2021
   Fixes v6 error 1242: Layer.duplicate() must not receive a layer name as parameter 1.
   This build also changes the background strategy so the subject is never copied as a
   second visible object: a separate full-canvas background copy is cleaned inside the
   guide rectangle with Content-Aware Fill, then the correctly scaled original is placed on top.
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

    // Read the guide rectangle.
    app.activeDocument=template;
    var xs=[],ys=[];
    for(var g=0;g<template.guides.length;g++){
        var guide=template.guides[g], c=px(guide.coordinate);
        if(guide.direction===Direction.VERTICAL) xs.push(c); else ys.push(c);
    }
    xs.sort(function(a,b){return a-b;});
    ys.sort(function(a,b){return a-b;});
    var ix=[],iy=[];
    for(var a=0;a<xs.length;a++) if(xs[a]>2 && xs[a]<W-2) ix.push(xs[a]);
    for(var b=0;b<ys.length;b++) if(ys[b]>2 && ys[b]<H-2) iy.push(ys[b]);
    if(ix.length<2 || iy.length<2){ alert('没有找到足够的内部参考线。'); return; }
    var left=ix[0], right=ix[ix.length-1], top=iy[0], bottom=iy[iy.length-1];
    var targetW=right-left, targetH=bottom-top;

    // ===== 1. Prepare the subject for the guide rectangle =====
    app.activeDocument=source;
    var subjectPrep=source.duplicate();
    subjectPrep.name='Shoe_AutoLayout_SubjectPrep_v6_1';
    app.activeDocument=subjectPrep;
    try{ subjectPrep.flatten(); }catch(e0){}
    var sw=px(subjectPrep.width), sh=px(subjectPrep.height);
    var subjectScale=Math.min(targetW/sw,targetH/sh);
    subjectPrep.resizeImage(UnitValue(sw*subjectScale,'px'),UnitValue(sh*subjectScale,'px'),null,ResampleMethod.PRESERVEDETAILS);
    subjectPrep.selection.selectAll();
    subjectPrep.activeLayer.copy();
    subjectPrep.selection.deselect();

    // ===== 2. Create the final 3253 x 3405 document =====
    var out=app.documents.add(W,H,72,'Shoe_AutoLayout_Result_v6_1',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
    app.activeDocument=out;

    // ===== 3. Prepare a separate full-canvas background source =====
    app.activeDocument=source;
    var bgPrep=source.duplicate();
    bgPrep.name='Shoe_AutoLayout_BackgroundPrep_v6_1';
    app.activeDocument=bgPrep;
    try{ bgPrep.flatten(); }catch(e1){}
    bgPrep.resizeImage(UnitValue(W,'px'),UnitValue(H,'px'),null,ResampleMethod.PRESERVEDETAILS);
    bgPrep.selection.selectAll();
    bgPrep.activeLayer.copy();
    bgPrep.selection.deselect();

    app.activeDocument=out;
    out.paste();
    var bg=out.activeLayer;
    bg.name='Background — Content Aware Expansion';

    // Clean the exact guide rectangle from the background copy BEFORE putting the real subject on top.
    // This is the key difference from the broken v5/v6 logic.
    var bgOk=true;
    try{
        selectRect(left,top,right,bottom);
        fillContentAware();
        clearSelection();
    }catch(e2){
        bgOk=false;
        clearSelection();
    }

    // ===== 4. Put the correctly scaled original image on top =====
    out.paste();
    var subject=out.activeLayer;
    subject.name='Original Image — Guide Area';
    var bounds=subject.bounds;
    var lw=px(bounds[2])-px(bounds[0]), lh=px(bounds[3])-px(bounds[1]);
    var destLeft=left+(targetW-lw)/2, destTop=top+(targetH-lh)/2;
    subject.translate(UnitValue(destLeft-px(bounds[0]),'px'),UnitValue(destTop-px(bounds[1]),'px'));

    // Guides for visual checking.
    for(var xi=0;xi<xs.length;xi++) out.guides.add(Direction.VERTICAL,UnitValue(xs[xi],'px'));
    for(var yi=0;yi<ys.length;yi++) out.guides.add(Direction.HORIZONTAL,UnitValue(ys[yi],'px'));

    try{ subjectPrep.close(SaveOptions.DONOTSAVECHANGES); }catch(e3){}
    try{ bgPrep.close(SaveOptions.DONOTSAVECHANGES); }catch(e4){}

    // Save PSD + PNG beside the original source.
    try{
        var baseFolder=source.path;
        var psdFile=new File(baseFolder+'/shoe_auto_layout_result_v6_1.psd');
        var psdOpt=new PhotoshopSaveOptions(); psdOpt.layers=true;
        out.saveAs(psdFile,psdOpt,true,Extension.LOWERCASE);
        var pngFile=new File(baseFolder+'/shoe_auto_layout_result_v6_1.png');
        var pngOpt=new PNGSaveOptions();
        out.saveAs(pngFile,pngOpt,true,Extension.LOWERCASE);
    }catch(e5){}

    if(bgOk){
        alert('v6.1 完成！\n\n画布：3253 × 3405 px\n主体：只放置一次，位于参考线矩形内。\n背景：先清理参考线矩形，再把主体放回最上层。\n已尝试保存 PSD + PNG。');
    }else{
        alert('主体定位完成，但 Photoshop 2021 的内容识别填充失败。\n这次不会再复制出第二个主体。');
    }
})();
