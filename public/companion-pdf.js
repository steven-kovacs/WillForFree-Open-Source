import {currentLanguage, display} from "./locale.js";
// The will and publisher forms have their own layout. This layout is for the kit's reading copies.
export async function renderCompanion({pdf, doc, regular, bold}, place, title, build) {
  title=display(title);
  const [width,height] = ["CA","US"].includes(place.country) ? [612,792] : [595.28,841.89];
  const margin=49, usable=width-2*margin, bottom=61;
  const navy=pdf.rgb(.08,.16,.35), teal=pdf.rgb(.10,.34,.39), pale=pdf.rgb(.84,.90,.87);
  const dot=pdf.rgb(.28,.59,.74);
  const supported=new Set(regular.getCharacterSet());
  const nativeContext=document.createElement("canvas").getContext("2d");
  const nativeFont=size=>size+"px system-ui, sans-serif";
  const fallback=createSearchLayer(pdf,doc);
  const images=[];
  let page,y;
  // Match the site wordmark and colours using embedded type so the PDF also works offline.
  function newPage(){
    page=doc.addPage([width,height]);
    page.drawText("WillForFree",{x:margin,y:height-42,size:16,font:bold,color:navy});
    page.drawCircle({x:margin+bold.widthOfTextAtSize("WillForFree",16)+5,y:height-39,size:2.3,color:dot});
    page.drawLine({start:{x:margin,y:height-54},end:{x:width-margin,y:height-54},thickness:1,color:pale});
    y=height-88;
  }
  function room(n){if(y-n<bottom)newPage();}
  function linkArea(url,x,base,w,size){
    if(!url || !url.startsWith("https://"))return;
    const annot=doc.context.obj({Type:"Annot",Subtype:"Link",Rect:[x,base-2,x+w,base+size],Border:[0,0,0],
      A:{S:"URI",URI:pdf.PDFString.of(url)}});
    page.node.addAnnot(doc.context.register(annot));
  }
  function lines(value,font,size,leading,color,url){
    for(const paragraph of String(value).split(/\r\n|[\r\n]/u)){
      const native=[...paragraph].some(ch=>!supported.has(ch.codePointAt(0)));
      nativeContext.font=nativeFont(size);
      const measure=native ? s=>nativeContext.measureText(s).width : s=>font.widthOfTextAtSize(s,size);
      const draw=line=>{
        room(leading);
        if(native){
          // Let the device shape scripts missing from Reddit Sans. No glyph or answer leaves the browser.
          const target=page, baseline=y, drawnWidth=measure(line);
          const scale=3, canvas=document.createElement("canvas");
          canvas.width=Math.ceil((drawnWidth+4)*scale);canvas.height=Math.ceil((size*2+4)*scale);
          const c=canvas.getContext("2d");c.scale(scale,scale);c.font=nativeFont(size);
          c.fillStyle="#142959";c.textAlign="left";c.fillText(line,2,size*1.4);
          images.push(doc.embedPng(canvas.toDataURL("image/png")).then(image=>{
            target.drawImage(image,{x:margin-2,y:baseline+size*1.4-canvas.height/scale,width:canvas.width/scale,height:canvas.height/scale});
          }));
          fallback.draw(page,line,margin,y,drawnWidth,size);
        }else page.drawText(line,{x:margin,y,font,size,color});
        linkArea(url,margin,y,measure(line),size);
        y-=leading;
      };
      let line="";
      for(const word of paragraph.trim().split(/\s+/u)){
        if(!word)continue;
        const joined=line ? line+" "+word : word;
        if(measure(joined)<=usable){line=joined;continue;}
        if(line)draw(line);
        line="";
        if(measure(word)<=usable){line=word;continue;}
        // A long URL or an unspaced script can wrap without dropping or changing characters.
        const clusters=typeof Intl.Segmenter==="function"
          ? [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(word)].map(s=>s.segment) : [...word];
        for(const ch of clusters){
          if(line && measure(line+ch)>usable){draw(line);line="";}
          line+=ch;
        }
      }
      if(line)draw(line);
    }
  }
  const body=(value,verbatim=false)=>{lines(verbatim?value:display(value),regular,11,15.5,navy);y-=6;};
  const heading=(value,verbatim=false)=>{room(50);y-=4;lines(verbatim?value:display(value),bold,15,19,teal);y-=3;};
  const entry=(label,value,rawValue=false,rawLabel=false)=>{
    room(35);lines(rawLabel?label:display(label),bold,10,13,teal);lines(rawValue?value:display(value),regular,11,15.5,navy);y-=6;
  };
  const link=(label,url)=>{
    room(34);
    if(label)lines(display(label),bold,10,13,teal);
    lines(url,regular,10,14,teal,url);y-=6;
  };
  function paragraph(value){
    const match=String(value).match(/^(.*?)\s*(https:\/\/\S+)$/u);
    if(match){const translated=display(value);link(translated.replace(/\s*https:\/\/\S+$/u,""),match[2]);}else body(value);
  }
  doc.setTitle(title);doc.setCreator("WillForFree");doc.setAuthor("WillForFree");doc.setLanguage(currentLanguage());
  newPage();
  lines(title,bold,27,32,navy);y-=2;
  lines(display(place.label),regular,10.5,15,teal);y-=12;
  build({body,heading,entry,link,paragraph});
  await Promise.all(images);
  const pages=doc.getPages();
  pages.forEach((sheet,i)=>{
    sheet.drawLine({start:{x:margin,y:43},end:{x:width-margin,y:43},color:pale,thickness:.7});
    sheet.drawText(title,{x:margin,y:27,font:regular,size:8.5,color:teal});
    const folio=(i+1)+" / "+pages.length;
    sheet.drawText(folio,{x:width-margin-regular.widthOfTextAtSize(folio,8.5),y:27,font:regular,size:8.5,color:teal});
  });
  await fallback.finish(regular);
  return doc.save();
}

// A locally drawn fallback line also carries searchable, selectable Unicode in the PDF.
// Its invisible text has its own character IDs and ToUnicode map, independent of the device's font.
function createSearchLayer(pdf,doc){
  const codes=new Map(), resources=new Map();
  const ref=doc.context.nextRef();
  const hex=n=>n.toString(16).padStart(4,"0");
  function draw(page,line,x,y,width,size){
    let name=resources.get(page);
    if(!name){name=page.node.newFontDictionary("ReadingCopy",ref);resources.set(page,name);}
    const ids=[...line].map(ch=>{
      if(!codes.has(ch))codes.set(ch,codes.size+1);
      return hex(codes.get(ch));
    });
    page.pushOperators(pdf.pushGraphicsState(),pdf.beginText(),pdf.setFontAndSize(name,size),
      pdf.setTextRenderingMode(3),pdf.setCharacterSqueeze(100*width/(ids.length*size)),pdf.moveText(x,y),
      pdf.showText(pdf.PDFHexString.of(ids.join(""))),pdf.endText(),pdf.popGraphicsState());
  }
  async function finish(regular){
    if(!codes.size)return;
    await regular.embed();
    const original=doc.context.lookup(regular.ref), descendant=original.lookup(pdf.PDFName.of("DescendantFonts")).lookup(0);
    const descriptor=descendant.get(pdf.PDFName.of("FontDescriptor"));
    const baseName=descendant.get(pdf.PDFName.of("BaseFont"));
    const cid=doc.context.register(doc.context.obj({Type:"Font",Subtype:"CIDFontType2",BaseFont:baseName,
      CIDSystemInfo:{Registry:pdf.PDFString.of("Adobe"),Ordering:pdf.PDFString.of("Identity"),Supplement:0},
      CIDToGIDMap:"Identity",FontDescriptor:descriptor,DW:1000}));
    const map=["/CIDInit /ProcSet findresource begin","12 dict begin","begincmap",
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def","/CMapName /WFFUnicode def",
      "/CMapType 2 def","1 begincodespacerange","<0000> <FFFF>","endcodespacerange"];
    const rows=[...codes].map(([ch,n])=>"<"+hex(n)+"> <"+pdf.PDFHexString.fromText(ch).asString().slice(4)+">");
    for(let i=0;i<rows.length;i+=100){
      const part=rows.slice(i,i+100);map.push(part.length+" beginbfchar",...part,"endbfchar");
    }
    map.push("endcmap","CMapName currentdict /CMap defineresource pop","end","end");
    const toUnicode=doc.context.register(doc.context.flateStream(map.join("\n")));
    doc.context.assign(ref,doc.context.obj({Type:"Font",Subtype:"Type0",BaseFont:baseName,Encoding:"Identity-H",DescendantFonts:[cid],ToUnicode:toUnicode}));
  }
  return {draw,finish};
}
