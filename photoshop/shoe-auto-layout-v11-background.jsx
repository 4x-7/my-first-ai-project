#target photoshop
app.bringToFront();
app.displayDialogs = DialogModes.NO;

(function () {
    if (app.documents.length < 2) {
        alert('请同时打开：参考线 PSD + 原图 JPG/PNG。');
        return;
    }

    var ref = null, source = null;
    for (var i=0; i<app.documents.length; i++) {
        if (app.documents[i].guides.length >= 4) { ref = app.documents[i]; break; }
    }
    if (!ref) { alert('没有找到参考线 PSD。'); return; }
    for (var j=0; j<app.documents.length; j++) {
        if (app.documents[j] !== ref) { source = app.documents[j]; break; }
    }
    if (!source) { alert('没有找到原图。'); return; }

    function guides(dir) {
        var a=[];
        for (var k=0;k<ref.guides.length;k++) if (ref.guides[k].direction==dir) a.push(ref.guides[k].coordinate.as('px'));
        a.sort(function(a,b){return a-b;}); return a;
    }
    var xs=guides(Direction.VERTICAL), ys=guides(Direction.HORIZONTAL);
    var cw=ref.width.as('px'), ch=ref.height.as('px'), cx=cw/2, cy=ch/2;
    var left=null,right=null,top=null,bottom=null;
    for(var x=0;x<xs.length;x++){if(xs[x]<cx) left=xs[x]; if(xs[x]>cx){right=xs[x];break;}}
    for(var y=0;y<ys.length;y++){if(ys[y]<cy) top=ys[y]; if(ys[y]>cy){bottom=ys[y];break;}}
    if(left===null||right===null||top===null||bottom===null){alert('无法找到中心参考矩形。');return;}

    app.activeDocument=ref;
    var result=ref.duplicate('Shoe_AutoLayout_v11_Result', true);
    app.activeDocument=result;

    // Place source natively, exactly as the proven v9/v10 method.
    var f=new File(source.fullName);
    var d=new ActionDescriptor();
    d.putPath(charIDToTypeID('null'),f);
    d.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));
    executeAction(charIDToTypeID('Plc '),d,DialogModes.NO);
    var subject=result.activeLayer;
    subject.name='ORIGINAL IMAGE - PLACED';

    // Fit subject inside guide rectangle.
    var b=subject.bounds;
    var sw=b[2].as('px')-b[0].as('px'), sh=b[3].as('px')-b[1].as('px');
    var bw=right-left, bh=bottom-top;
    var scale=Math.min(bw/sw,bh/sh)*100;
    subject.resize(scale,scale,AnchorPosition.MIDDLECENTER);
    b=subject.bounds;
    var sx=(b[0].as('px')+b[2].as('px'))/2, sy=(b[1].as('px')+b[3].as('px'))/2;
    subject.translate(UnitValue((left+right)/2-sx,'px'),UnitValue((top+bottom)/2-sy,'px'));

    // Make a conservative background layer from the placed image.
    // It is deliberately blurred so the subject cannot appear as a sharp duplicate.
    var bg=subject.duplicate();
    bg.name='BACKGROUND - SOFT EXTENSION';
    bg.move(subject,ElementPlacement.PLACEAFTER);
    bg.rasterize(RasterizeType.ENTIRELAYER);

    // Scale the background copy to cover the full output canvas.
    b=bg.bounds;
    sw=b[2].as('px')-b[0].as('px'); sh=b[3].as('px')-b[1].as('px');
    var outW=3253,outH=3405;
    var bgScale=Math.max(outW/sw,outH/sh)*100*1.08;
    bg.resize(bgScale,bgScale,AnchorPosition.MIDDLECENTER);
    b=bg.bounds;
    var bx=(b[0].as('px')+b[2].as('px'))/2, by=(b[1].as('px')+b[3].as('px'))/2;
    bg.translate(UnitValue(outW/2-bx,'px'),UnitValue(outH/2-by,'px'));

    // Strong blur hides recognizable duplicated subject details.
    try { bg.applyGaussianBlur(55); } catch(e) {}

    // Resize canvas exactly to requested size.
    result.resizeCanvas(UnitValue(outW,'px'),UnitValue(outH,'px'),AnchorPosition.MIDDLECENTER);

    // Keep subject above the soft background.
    subject.move(bg,ElementPlacement.PLACEBEFORE);
    result.activeLayer=subject;

    alert('v11 完成！\n\n主体已保持在参考线矩形内，画布为 3253 × 3405。\n外围使用柔化背景扩展，避免重复出现清晰主体。\n\n先检查整体是否自然，再决定是否继续优化背景。');
})();