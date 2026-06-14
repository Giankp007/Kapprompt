/* ============================================================
   KAPPROMPT — journey interactions (vanilla)
   ============================================================ */
(function(){
"use strict";
var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v));};
var lerp=function(a,b,t){return a+(b-a)*t;};
var ease=function(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;};
var dpr=Math.min(devicePixelRatio||1,2);

/* reveals */
(function(){var els=document.querySelectorAll(".reveal");
 if(reduce||!("IntersectionObserver"in window)){els.forEach(function(e){e.classList.add("in");});return;}
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.16});
 els.forEach(function(e){io.observe(e);});})();

/* ============ COSMOS: brain -> earth ============ */
(function(){
 var cv=document.getElementById("cosmos"); if(!cv) return;
 var c=cv.getContext("2d"); var hero=document.querySelector(".hero");
 var W=0,H=0,cx=0,cy=0,R=0,running=true;
 var N = innerWidth<768?1200:2300;
 var P=[];               // particles
 var spin=0;

 // ---- brain target points (normalized -0.5..0.5), via emoji mask, fallback procedural
 function brainPoints(max){
   var S=320,off=document.createElement("canvas");off.width=S;off.height=S;var o=off.getContext("2d");
   o.textAlign="center";o.textBaseline="middle";o.font=Math.round(S*.82)+"px serif";o.fillStyle="#fff";
   try{o.fillText("\uD83E\uDDE0",S/2,S/2);}catch(e){}
   var d=null;try{d=o.getImageData(0,0,S,S).data;}catch(e){}
   var p=[];
   if(d){for(var y=0;y<S;y+=2)for(var x=0;x<S;x+=2){if(d[(y*S+x)*4+3]>130)p.push([x/S-0.5,(y/S-0.5)*0.92]);}}
   if(p.length<600){p=[];var tr=0;while(p.length<3000&&tr<150000){tr++;var X=(Math.random()-.5)*1.02,Y=(Math.random()-.5)*0.9;
     if((X*X)/(.47*.47)+(Y*Y)/(.42*.42)>1)continue;if(Y>.12&&Math.abs(X)>.32-(Y-.12)*.62)continue;
     if(Math.abs(X)<.02&&Y<.04&&Math.random()<.6)continue;p.push([X,Y]);}}
   for(var i=p.length-1;i>0;i--){var j=(Math.random()*(i+1))|0,t=p[i];p[i]=p[j];p[j]=t;}
   return p.slice(0,max);
 }
 // ---- earth: fibonacci sphere unit vectors + land/ocean colour
 function earthPoints(n){
   var pts=[],ga=Math.PI*(3-Math.sqrt(5));
   for(var i=0;i<n;i++){var y=1-(i/(n-1))*2,r=Math.sqrt(1-y*y),th=ga*i;
     var x=Math.cos(th)*r,z=Math.sin(th)*r;
     var lat=Math.asin(y),lon=Math.atan2(z,x);
     var land=Math.sin(lon*2.3+1.7)+Math.cos(lat*3.1-0.6)+Math.sin(lon*5.1+lat*2.0)*0.7;
     var col;
     if(Math.abs(lat)>1.22) col="#eaf4ff";                 // ice caps
     else if(land>0.55) col=(land>1.2?"#2fd08a":"#1f9e6e"); // land
     else col=(z+x>0?"#2f8fff":"#0a4fc4");                  // ocean
     pts.push({x:x,y:y,z:z,c:col});
   }
   return pts;
 }
 var brainPalette=["#8b5cff","#2f8fff","#58e0ff","#ffb24d","#22c3a6","#ffffff"];
 var brain=brainPoints(N), earth=earthPoints(N);

 function build(){
   P=[];
   for(var i=0;i<N;i++){
     P.push({bx:brain[i][0],by:brain[i][1], e:earth[i],
       bc:brainPalette[(Math.random()*brainPalette.length)|0],
       sz:0.8+Math.random()*1.6, ph:Math.random()*6.28, fa:0.4+Math.random()*1.1,
       x:0,y:0});
   }
 }
 function layout(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;
   c.setTransform(dpr,0,0,dpr,0,0);cx=W*0.6;cy=H*0.5;R=Math.min(W,H)*0.34;
   if(innerWidth<860){cx=W*0.5;cy=H*0.46;R=Math.min(W,H)*0.36;}
 }
 var hexCache={};
 function mix(c1,c2,t){
   function h(x){if(hexCache[x])return hexCache[x];var n=parseInt(x.slice(1),16);var o=[(n>>16)&255,(n>>8)&255,n&255];hexCache[x]=o;return o;}
   var a=h(c1),b=h(c2);return "rgb("+((a[0]+(b[0]-a[0])*t)|0)+","+((a[1]+(b[1]-a[1])*t)|0)+","+((a[2]+(b[2]-a[2])*t)|0)+")";
 }
 var morph=0,t=0;
 function progress(){if(!hero)return 0;var r=hero.getBoundingClientRect();var tot=hero.offsetHeight-innerHeight;return tot>0?clamp(-r.top/tot,0,1):0;}

 function frame(){
   t+=0.016; var p=progress();
   morph += ((clamp((p-0.04)/0.55,0,1)) - morph)*0.12;   // smooth brain->earth
   spin += 0.0032 + morph*0.0026;
   var m=ease(morph);
   c.clearRect(0,0,W,H);
   var sinA=Math.sin(spin),cosA=Math.cos(spin);
   var arr=P, order=[];
   for(var i=0;i<arr.length;i++){
     var p0=arr[i];
     // earth projected (rotate around Y)
     var ex=p0.e.x*cosA - p0.e.z*sinA;
     var ez=p0.e.x*sinA + p0.e.z*cosA;
     var ey=p0.e.y;
     var px_e=cx+ex*R, py_e=cy-ey*R, depth=ez;
     // brain pos
     var px_b=cx+p0.bx*R*1.7 + Math.cos(t*p0.fa+p0.ph)*2.0;
     var py_b=cy+p0.by*R*1.85 + Math.sin(t*p0.fa+p0.ph)*2.0;
     var x=lerp(px_b,px_e,m), y=lerp(py_b,py_e,m);
     p0.x=x;p0.y=y;
     // size & alpha: brain uniform-ish; earth depth-shaded
     var dShade=(depth+1)/2;                       // 0 back .. 1 front
     var sz=lerp(p0.sz, p0.sz*(0.55+dShade*1.1), m);
     var al=lerp(0.85, (0.25+dShade*0.8), m);
     var col=mix(p0.bc, p0.e.c, m);
     order.push({x:x,y:y,s:sz,a:al,c:col,d:lerp(0.5,dShade,m)});
   }
   if(m>0.15) order.sort(function(a,b){return a.d-b.d;});
   for(var k=0;k<order.length;k++){var q=order[k];c.globalAlpha=q.a;c.fillStyle=q.c;c.beginPath();c.arc(q.x,q.y,q.s,0,6.283);c.fill();}
   c.globalAlpha=1;
   if(running)requestAnimationFrame(frame);
 }
 build();layout();addEventListener("resize",function(){layout();});addEventListener("load",function(){layout();});
 if(reduce){morph=0;frame();}
 else{
   if(hero&&"IntersectionObserver"in window){
     new IntersectionObserver(function(es){es.forEach(function(e){
       if(e.isIntersecting&&!running){running=true;requestAnimationFrame(frame);}else if(!e.isIntersecting)running=false;});},{threshold:0}).observe(hero);
   }
   requestAnimationFrame(frame);
 }
})();

/* ============ PERSPECTIVE HIGHLIGHT (facts tilt + sheen) ============ */
(function(){
 if(reduce)return;
 document.querySelectorAll(".fact").forEach(function(el){
   el.addEventListener("pointermove",function(ev){
     var r=el.getBoundingClientRect();var mx=(ev.clientX-r.left)/r.width,my=(ev.clientY-r.top)/r.height;
     el.style.setProperty("--mx",(mx*100)+"%");el.style.setProperty("--my",(my*100)+"%");
     el.style.transform="perspective(800px) rotateX("+((0.5-my)*6).toFixed(2)+"deg) rotateY("+((mx-0.5)*7).toFixed(2)+"deg) translateZ(0)";
   });
   el.addEventListener("pointerleave",function(){el.style.transform="";});
 });
})();

/* ============ SPLINE ROBOT: auto-move + remove badge ============ */
(function(){
 var sv=document.querySelector("spline-viewer"); var fb=document.querySelector(".stage .fb"); var stage=document.querySelector(".stage");
 if(!sv) return;
 var loaded=false;
 function killBadge(){try{if(sv.shadowRoot){var l=sv.shadowRoot.querySelector("#logo");if(l)l.remove();}}catch(e){}}
 function ready(){if(loaded)return;loaded=true;if(fb)fb.style.display="none";var n=0,iv=setInterval(function(){killBadge();if(++n>20)clearInterval(iv);},150);}
 sv.addEventListener("load",ready);
 // robust fallback: hide the loader as soon as the viewer's canvas exists
 var poll=setInterval(function(){try{if(sv.shadowRoot&&sv.shadowRoot.querySelector("canvas")){ready();clearInterval(poll);}}catch(e){}},400);
 setTimeout(function(){clearInterval(poll);if(!loaded&&fb)fb.textContent="3D-Figur konnte nicht geladen werden — am besten am Desktop ansehen.";},14000);

 // figure follows the REAL mouse; only when the user is idle does it gently
 // look around on its own (synthetic drive yields to real pointer activity)
 if(reduce||!stage) return;
 var active=false,tt=0,lastReal=0;
 // real user moves are isTrusted; our synthetic ones are not — count only real
 stage.addEventListener("pointermove",function(e){if(e.isTrusted)lastReal=performance.now();},{passive:true});
 new IntersectionObserver(function(es){es.forEach(function(e){active=e.isIntersecting;if(active)loop();});},{threshold:.25}).observe(stage);
 function loop(){
   if(!active)return;
   // if the user moved the mouse recently, let the real cursor drive the figure
   if(performance.now()-lastReal<2600){requestAnimationFrame(loop);return;}
   tt+=0.016;
   var r=sv.getBoundingClientRect();
   if(r.width>0){
     // gentle, contained idle look-around (small amplitude, stays upright)
     var x=r.left+r.width*(0.5+0.16*Math.sin(tt*0.7));
     var y=r.top +r.height*(0.5+0.12*Math.sin(tt*0.9+1.1));
     var opt={clientX:x,clientY:y,bubbles:true};
     try{sv.dispatchEvent(new PointerEvent("pointermove",opt));sv.dispatchEvent(new MouseEvent("mousemove",opt));
       if(sv.shadowRoot){var cvs=sv.shadowRoot.querySelector("canvas");if(cvs){cvs.dispatchEvent(new PointerEvent("pointermove",opt));cvs.dispatchEvent(new MouseEvent("mousemove",opt));}}
     }catch(e){}
   }
   requestAnimationFrame(loop);
 }
})();

/* ============ FERRARI SCRUB ============ */
(function(){
 var FN=300,AR=1200/676;
 var url=function(i){return "assets/frames/"+String(i+1).padStart(4,"0")+".webp";};
 var section=document.querySelector(".scrub"),card=document.querySelector(".scrub-card"),canvas=document.getElementById("scrub-canvas");
 var loader=document.querySelector(".scrub-loader"),tT=document.querySelector(".scrub-title.top"),tB=document.querySelector(".scrub-title.bottom");
 if(!section||!canvas)return;
 var ctx=canvas.getContext("2d");canvas.width=1920;canvas.height=1081;
 var im=new Array(FN),last=-1,first=false;
 var ok=function(i){var m=im[i];return !!m&&m.complete&&m.naturalWidth>0;};
 var draw=function(idx){var u=idx;if(!ok(u)){var f=-1;for(var d=1;d<FN;d++){if(u-d>=0&&ok(u-d)){f=u-d;break;}if(u+d<FN&&ok(u+d)){f=u+d;break;}}if(f<0)return;u=f;}
   if(last===u)return;ctx.drawImage(im[u],0,0,canvas.width,canvas.height);last=u;};
 var onFirst=function(){if(first)return;first=true;draw(0);if(loader)loader.classList.add("hidden");};
 var load=function(i){var g=new Image();g.decoding="async";g.onload=function(){if(i===0)onFirst();};g.src=url(i);im[i]=g;};
 var INIT=Math.min(28,FN);for(var i=0;i<INIT;i++)load(i);
 (function rest(c){if(c>=FN)return;var e=Math.min(FN,c+28);for(var j=c;j<e;j++)load(j);setTimeout(function(){rest(e);},50);})(INIT);
 var immerse=function(){var bw=card.offsetWidth,bh=card.offsetHeight;if(bw<=0||bh<=0)return 1.6;return Math.max(innerWidth/bw,innerHeight/bh)*1.03;};
 var spread=function(){return innerWidth<768?80:60;};
 var apply=function(){var r=section.getBoundingClientRect(),tot=section.offsetHeight-innerHeight;var p=tot>0?clamp(-r.top/tot,0,1):0,sI=immerse(),sc,tx,op;
   if(p<.12){var a=p/.12;sc=1;tx=lerp(0,8,a);op=1;}
   else if(p<.8){var b=(p-.12)/.68;sc=lerp(1,sI,b);tx=lerp(8,spread(),Math.min(1,b*1.4));op=clamp(1-b*1.8,0,1);}
   else{var d=(p-.8)/.2;sc=lerp(sI,1,d);tx=lerp(spread(),0,d);op=clamp(d*1.6-.1,0,1);}
   card.style.transform="scale("+sc.toFixed(4)+")";tT.style.transform="translateX("+(-tx).toFixed(2)+"vw)";tB.style.transform="translateX("+tx.toFixed(2)+"vw)";
   tT.style.opacity=op;tB.style.opacity=op;
   var s=clamp((p-.12)/.68,0,1);draw(Math.min(FN-1,Math.floor(s*FN)));};
 if(reduce){card.style.transform="scale(1)";(function s(){if(ok(60))draw(60);else if(first)draw(0);else requestAnimationFrame(s);})();}
 else{var tick=false;addEventListener("scroll",function(){if(tick)return;tick=true;requestAnimationFrame(function(){apply();tick=false;});},{passive:true});
   addEventListener("resize",apply);card.style.transform="scale(1)";apply();}
})();
})();
