#target photoshop
/*
 Shoe Auto Layout V8
 关键修复：
 1. 不再把整张原图当“主体”。
 2. 使用 Photoshop Select Subject (autoCutout) 获取真正主体。
 3. 主体按“真实主体边界”缩放到参考线矩形。
 4. 背景仍然使用原图铺满，但在背景层上用“主体实际位置”
    做 Content-Aware Fill，去掉重复主体。
 5. 如果 Content-Aware Fill 失败，停止并明确报错，
    不保存错误成品。
*/

(function(){
    var W=3253,H=3405,DPI=72;

    function px(v){return v.as("px");}
    function closeQuiet(d){try{if(d)d.close(SaveOptions.DONOTSAVECHANGES);}catch(e){}}

    function selectSubject(){
        var d=new ActionDescriptor();
        d.putBoolean(stringIDToTypeID("sampleAllLayers"),false);
        executeAction(stringIDToTypeID("autoCutout"),d,DialogModes.NO);
    }

    function selectRect(l,t,r,b){
        app.activeDocument.selection.select([
            [UnitValue(l,"px"),UnitValue(t,"px")],
            [UnitValue(r,"px"),UnitValue(t,"px")],
            [UnitValue(r,"px"),UnitValue(b,"px")],
            [UnitValue(l,"px"),UnitValue(b,"px")]
        ]);
    }

    function getGuides(doc){
        var xs=[],ys=[];
        for(var i=0;i<doc.guides.length;i++){
            var g=doc.guides[i],c=px(g.coordinate);
            if(g.direction===Direction.VERTICAL)xs.push(c);
            else ys.push(c);
        }
        xs.sort(function(a,b){return a-b;});
        ys.sort(function(a,b){return a-b;});
        var ix=[],iy=[];
        for(var x=0;x<xs.length;x++)if(xs[x]>2&&xs[x]<W-2)ix.push(xs[x]);
        for(var y=0;y<ys.length;y++)if(ys[y]>2&&ys[y]<H-2)iy.push(ys[y]);
        if(ix.length<2||iy.length<2)return null;
        return {left:ix[0],right:ix[ix.length-1],top:iy[0],bottom:iy[iy.length-1],xs:xs,ys:ys};
    }

    function addGuides(doc,g){
        for(var i=0;i<g.xs.length;i++)doc.guides.add(Direction.VERTICAL,UnitValue(g.xs[i],"px"));
        for(var j=0;j<g.ys.length;j++)doc.guides.add(Direction.HORIZONTAL,UnitValue(g.ys[j],"px"));
    }

    function centerLayer(layer,l,t,r,b){
        var q=layer.bounds;
        var w=px(q[2])-px(q[0]),h=px(q[3])-px(q[1]);
        layer.translate(
            UnitValue(l+(r-l-w)/2-px(q[0]),"px"),
            UnitValue(t+(b-t-h)/2-px(q[1]),"px")
        );
    }

    function fitCanvas(layer){
        var q=layer.bounds;
        var w=px(q[2])-px(q[0]),h=px(q[3])-px(q[1]);
        var s=Math.max(W/w,H/h);
        layer.resize(s*100,s*100,AnchorPosition.MIDDLECENTER);
        q=layer.bounds;
        w=px(q[2])-px(q[0]);h=px(q[3])-px(q[1]);
        layer.translate(
            UnitValue((W-w)/2-px(q[0]),"px"),
            UnitValue((H-h)/2-px(q[1]),"px")
        );
    }

    function contentAware(){
        var d=new ActionDescriptor();
        d.putEnumerated(charIDToTypeID("Usng"),charIDToTypeID("FlCn"),stringIDToTypeID("contentAware"));
        d.putUnitDouble(charIDToTypeID("Opct"),charIDToTypeID("#Prc"),100);
        d.putEnumerated(charIDToTypeID("Md  "),charIDToTypeID("BlnM"),charIDToTypeID("Nrml"));
        executeAction(charIDToTypeID("Fl  "),d,DialogModes.NO);
    }

    function saveOut(doc,source){
        var dir=source.path;
        var f1=new File(dir+"/shoe_auto_layout_result_V8.psd");
        var po=new PhotoshopSaveOptions();po.layers=true;
        doc.saveAs(f1,po,true,Extension.LOWERCASE);
        var f2=new File(dir+"/shoe_auto_layout_result_V8.png");
        var pn=new PNGSaveOptions();
        doc.saveAs(f2,pn,true,Extension.LOWERCASE);
    }

    if(app.documents.length<2){alert("请同时打开：\n\n① 3253 × 3405 参考线 PSD\n② 原图");return;}

    var template=null,source=null;
    for(var i=0;i<app.documents.length;i++){
        var d=app.documents[i];
        if(Math.round(px(d.width))===W&&Math.round(px(d.height))===H){template=d;break;}
    }
    if(!template){alert("没有找到 3253 × 3405 的参考线 PSD。");return;}
    for(var j=0;j<app.documents.length;j++)if(app.documents[j]!==template){source=app.documents[j];break;}
    if(!source){alert("没有找到原图。");return;}

    app.activeDocument=template;
    var g=getGuides(template);
    if(!g){alert("没有找到足够的内部参考线。");return;}

    var targetW=g.right-g.left,targetH=g.bottom-g.top;
    var subjectDoc=null,bgDoc=null,out=null;

    try{
        subjectDoc=source.duplicate("V8_SubjectPrep");
        app.activeDocument=subjectDoc;
        try{subjectDoc.flatten();}catch(e0){}
        selectSubject();
        var origSel=subjectDoc.selection.bounds;
        var ow=px(origSel[2])-px(origSel[0]);
        var oh=px(origSel[3])-px(origSel[1]);
        if(ow<20||oh<20)throw new Error("Photoshop「选择主体」没有得到有效主体。");
        subjectDoc.selection.copy();
        subjectDoc.selection.deselect();

        out=app.documents.add(W,H,DPI,"Shoe_AutoLayout_Result_V8",NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
        app.activeDocument=out;
        out.paste();
        var subject=out.activeLayer;
        subject.name="主体 — Select Subject";
        var q=subject.bounds;
        var sw=px(q[2])-px(q[0]),sh=px(q[3])-px(q[1]);
        var scale=Math.min(targetW/sw,targetH/sh);
        subject.resize(scale*100,scale*100,AnchorPosition.MIDDLECENTER);
        centerLayer(subject,g.left,g.top,g.right,g.bottom);
        q=subject.bounds;
        var sl=px(q[0]),st=px(q[1]),sr=px(q[2]),sb=px(q[3]);
        var pad=Math.max(25,Math.round(Math.max(sr-sl,sb-st)*0.025));
        sl=Math.max(0,sl-pad);st=Math.max(0,st-pad);sr=Math.min(W,sr+pad);sb=Math.min(H,sb+pad);

        bgDoc=source.duplicate("V8_BackgroundPrep");
        app.activeDocument=bgDoc;
        try{bgDoc.flatten();}catch(e1){}
        bgDoc.selection.selectAll();
        bgDoc.activeLayer.copy();
        bgDoc.selection.deselect();
        app.activeDocument=out;
        out.paste();
        var bg=out.activeLayer;
        bg.name="背景 — 扩展";
        fitCanvas(bg);
        bg.move(subject,ElementPlacement.PLACEAFTER);
        app.activeDocument=out;

        selectRect(sl,st,sr,sb);
        app.activeDocument.activeLayer=bg;
        try{contentAware();}
        catch(fillErr){
            try{out.selection.deselect();}catch(e2){}
            throw new Error("【背景去重】Content-Aware Fill 失败：\n"+fillErr.message+"\n\n主体本身已经正确分离；脚本拒绝保存带重复主体的成品。");
        }
        out.selection.deselect();
        subject.move(bg,ElementPlacement.PLACEBEFORE);
        addGuides(out,g);
        closeQuiet(subjectDoc);closeQuiet(bgDoc);
        app.activeDocument=out;
        var check=subject.bounds;
        var fw=px(check[2])-px(check[0]),fh=px(check[3])-px(check[1]);
        if(fw>W*0.95||fh>H*0.95)throw new Error("主体检查失败：主体层仍接近整张画布。");
        saveOut(out,source);
        alert("V8 完成！\n\n画布："+W+" × "+H+" px\n参考区域："+Math.round(targetW)+" × "+Math.round(targetH)+" px\n真实主体："+Math.round(fw)+" × "+Math.round(fh)+" px\n\n✓ 主体不是整张原图\n✓ 背景重复主体已尝试移除\n✓ PSD + PNG 已保存");
    }catch(err){
        closeQuiet(subjectDoc);closeQuiet(bgDoc);closeQuiet(out);
        alert("V8 没有保存错误成品。\n\n"+err.message);
    }
})();
