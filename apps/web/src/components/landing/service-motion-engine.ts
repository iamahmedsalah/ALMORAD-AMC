import type { SceneEngine } from './service-scene-types';

// Shader artwork adapted from docs/assets/almorad-motion; lifecycle is owned by the stage.
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  const PRE = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;uniform float uPtrOn;uniform float uLight;',
    '#define DEEP mix(vec3(.024,.059,.141),vec3(.984,.945,.902),uLight)',
    '#define NAVY mix(vec3(.043,.122,.267),vec3(.933,.945,.969),uLight)',
    '#define NAVY2 mix(vec3(.086,.188,.416),vec3(.867,.890,.937),uLight)',
    '#define PANEL mix(vec3(.059,.129,.278),vec3(.867,.890,.937),uLight)',
    '#define PANEL_TOP mix(vec3(.09,.16,.35),vec3(.945,.953,.969),uLight)',
    'const vec3 ORANGE=vec3(.969,.463,.118);',
    '#define CREAM mix(vec3(.984,.945,.902),vec3(.043,.122,.267),uLight)',
    '#define SLATE mix(vec3(.424,.498,.690),vec3(.290,.373,.561),uLight)',
    'const float PI=3.14159265;',
    'float ss(float a,float b,float x){return a<b?smoothstep(a,b,x):1.-smoothstep(b,a,x);}',
    'float hash(float n){return fract(sin(n*127.1)*43758.5453);}',
    'float aa(){return 1.5/uRes.y;}',
    'float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}',
    'float fill(float d){return 1.-ss(-aa(),aa(),d);}',
    'vec2 pos(){return (gl_FragCoord.xy-.5*uRes)/uRes.y;}',
    'vec2 ptr(){return (uPtr-.5)*vec2(uRes.x/uRes.y,1.);}'
  ].join('\n');

  const SH: Record<string, string> = {};

  /* Marketing: a voice as a radial equaliser, ripples going out, an audience drifting in. */
  SH.marketing = PRE + [
    'void main(){',
    ' vec2 p=pos();vec2 m=ptr();float t=uTime;float r=length(p);',
    ' vec3 col=mix(DEEP,NAVY2,ss(.95,.0,r)*.9);',
    ' col+=ORANGE*.1*ss(.5,.0,r);',
    ' for(int i=0;i<3;i++){float ph=fract(t*.2+float(i)/3.);float rr=.12+ph*.62;float d=abs(r-rr)-.002;col+=ORANGE*(1.-ss(0.,aa()*1.5,d))*(1.-ph)*.5;}',
    ' float ang=atan(p.y,p.x);float u=(ang+PI)/(2.*PI);',
    ' float pm=min(1.,length(m)*2.2)*uPtrOn;float pa=atan(m.y,m.x);',
    ' float N=72.;float cell=u*N;float s=floor(cell);float sa=(s+.5)/N*2.*PI-PI;',
    ' float h=.05+.1*(.5+.5*sin(sa*3.+t*1.6))*(.55+.45*sin(sa*7.-t*2.1));',
    ' float dd=abs(atan(sin(sa-pa),cos(sa-pa)));float b=max(0.,1.-dd/.8);h+=pm*.16*b*b;',
    ' float across=(fract(cell)-.5)*r*2.*PI/N;',
    ' float dBar=max(abs(across)-.0045,max(.2-r,r-(.2+h)));',
    ' col=mix(col,mix(ORANGE,CREAM,.5+.5*sin(sa*2.+t*.4)),fill(dBar));',
    ' float N2=120.;float c2=u*N2;float s2=floor(c2);float sb=(s2+.5)/N2*2.*PI-PI;',
    ' float h2=.02+.05*(.5+.5*sin(sb*5.-t*1.2))+.03*(.5+.5*sin(sb*11.+t*2.4));',
    ' float d2=abs(atan(sin(sb-pa),cos(sb-pa)));float b2=max(0.,1.-d2/.6);h2+=pm*.07*b2;',
    ' float acr2=(fract(c2)-.5)*r*2.*PI/N2;',
    ' float dB2=max(abs(acr2)-.0022,max(.42-r,r-(.42+h2)));',
    ' col=mix(col,SLATE,fill(dB2)*.85);',
    ' float cr=.11+.012*sin(t*3.);',
    ' col=mix(col,ORANGE,fill(r-cr));',
    ' col=mix(col,CREAM,fill(abs(r-cr-.028)-.0016)*.7);',
    ' for(int i=0;i<28;i++){float fi=float(i);float a2=fi*2.399+t*.1;float k=fract(t*(.04+.04*hash(fi))+hash(fi*7.1));',
    '  float rad=.78-k*.24;float al=ss(0.,.12,k)*(1.-ss(.85,1.,k));',
    '  vec2 q=vec2(cos(a2),sin(a2))*rad;col+=CREAM*(1.-ss(.0035,.0075,length(p-q)))*al*.85;}',
    ' col*=1.-.35*ss(.55,1.,r);',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  /* Advertising: an LED outdoor board at dusk. Light sweeps across, a ticker runs, a pointer sends out a ping. */
  SH.advertising = PRE + [
    'void main(){',
    ' vec2 p=pos();vec2 m=ptr();float t=uTime;',
    ' vec3 col=mix(DEEP,NAVY,ss(-.5,.5,p.y));',
    ' float bx=floor((p.x+.8)*12.);float top=-.12+.3*hash(bx*3.1);float inB=step(p.y,top)*step(.3,hash(bx*1.7+2.));',
    ' col=mix(col,DEEP*.7,inB*.9);',
    ' vec2 wc=vec2(fract((p.x+.8)*12.*3.)-.5,fract(p.y*26.)-.5);float win=step(abs(wc.x),.18)*step(abs(wc.y),.2)*step(.82,hash(floor((p.x+.8)*36.)+floor(p.y*26.)*17.));',
    ' col+=ORANGE*.35*win*inB;',
    ' for(int i=0;i<2;i++){float px=-.3+.6*float(i);float dp=sdBox(p-vec2(px,-.33),vec2(.012,.17),.004);col=mix(col,NAVY2,fill(dp));}',
    ' vec2 c0=vec2(0.,.08);float bd=sdBox(p-c0,vec2(.5,.26),.02);',
    ' col+=ORANGE*.2*exp(-max(bd,0.)*11.)*(.85+.15*sin(t*2.));',
    ' col=mix(col,DEEP,fill(bd));',
    ' float c=.016;vec2 gp=(p-c0)/c;vec2 id=floor(gp);vec2 f=fract(gp)-.5;vec2 q=(id+.5)*c;',
    ' float ee=1.5/(uRes.y*c);float dotm=1.-ss(.36-ee,.36+ee,length(f));',
    ' float s=fract((q.x*.9+q.y*.5)*1.1-t*.15);float band=ss(0.,.05,s)*(1.-ss(.12,.3,s));',
    ' float in1=step(-.42,q.x)*step(q.x,.16)*step(abs(q.y-.12),.034);',
    ' float in2=step(-.42,q.x)*step(q.x,-.1)*step(abs(q.y-.04),.02);',
    ' float tb=q.x*7.+t*1.5;float on=step(.35,hash(floor(tb)))*step(fract(tb),.78)*step(abs(q.y+.14),.014);',
    ' float pd=abs(length(q-m)-fract(t*.5)*.5);float ping=ss(.04,.0,pd)*(1.-fract(t*.5))*uPtrOn;',
    ' vec3 led=mix(NAVY2*.6,ORANGE,band*.9);led=mix(led,CREAM,in1*.95);led=mix(led,ORANGE,in2);led+=CREAM*on*.9;led+=ORANGE*ping*1.3;',
    ' float inside=1.-ss(-.012,-.008,bd);',
    ' col=mix(col,led,dotm*inside);col+=ORANGE*.05*band*inside;',
    ' col=mix(col,ORANGE,fill(abs(bd+.003)-.004)*.95);',
    ' col*=1.-.3*ss(.6,1.,length(p));',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  /* Consulting: contour lines of a noisy field. They straighten where the pointer rests: clarity before complexity. */
  SH.consulting = PRE + [
    'float fld(vec2 q,float t){return sin(q.x*3.+t*.3+sin(q.y*2.7-t*.2)*1.4)+sin(q.y*3.4-t*.25+cos(q.x*2.2+t*.15)*1.2)+.5*sin((q.x+q.y)*5.1+t*.2);}',
    'void main(){',
    ' vec2 p=pos();vec2 m=ptr();float t=uTime;float r=length(p);',
    ' vec2 mm=mix(vec2(.0,.0),m,uPtrOn);',
    ' float calm=ss(.45,.05,length(p-mm))*uPtrOn;',
    ' float f=fld(p,t);float e=.003;',
    ' float g=length(vec2(fld(p+vec2(e,0.),t)-fld(p-vec2(e,0.),t),fld(p+vec2(0.,e),t)-fld(p-vec2(0.,e),t)))/(2.*e);',
    ' float fc=p.y*4.+sin(p.x*2.+t*.2)*.15;f=mix(f,fc,calm);g=mix(g,4.,calm);',
    ' float v=f*2.6;g*=2.6;float idl=floor(v);',
    ' float acc=step(mod(idl,4.),.5);',
    ' float wv=g*mix(.0022,.004,acc);',
    ' float dist=abs(fract(v)-.5);float ln=1.-ss(wv,wv+g*aa()*1.6,.5-dist);',
    ' vec3 col=mix(DEEP,NAVY2,ss(1.,.0,r)*.8);',
    ' col=mix(col,mix(CREAM*.55,ORANGE,acc),ln*mix(.55,1.,acc));',
    ' col=mix(col,DEEP,.6*ss(.43,.3,r));',
    ' float ang=atan(p.y,p.x);float dash=step(.5,fract(ang/(2.*PI)*36.+t*.03));',
    ' col=mix(col,CREAM,fill(abs(r-.36)-.0016)*dash*.75);',
    ' col=mix(col,SLATE,fill(abs(r-.2)-.001)*.5);',
    ' for(int i=0;i<4;i++){float a=t*.3+float(i)*PI*.5;vec2 q=vec2(cos(a),sin(a))*.36;',
    '  float dl=abs(dot(p-q*.5,vec2(-q.y,q.x)/length(q)));float along=dot(p,q/length(q));',
    '  float seg=step(0.,along)*step(along,.36)*fill(dl-.0012)*.5;col=mix(col,CREAM,seg);',
    '  col=mix(col,i==0?ORANGE:CREAM,fill(length(p-q)-.02));col=mix(col,NAVY,fill(length(p-q)-.008));}',
    ' col=mix(col,NAVY,fill(r-.075));col=mix(col,ORANGE,fill(abs(r-.075)-.004));',
    ' col=mix(col,ORANGE,fill(r-.03-.006*sin(t*3.)));',
    ' col*=1.-.3*ss(.6,1.,r);',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  /* Web development: one interface, mirrored from LTR to RTL and back. Elements slide past each other. */
  SH.web = PRE + [
    'float E;',
    'float el(vec2 p,float cx,float cy,float hw,float hh,float r){return sdBox(p-vec2(mix(cx,-cx,E),cy),vec2(hw,hh),r);}',
    'void main(){',
    ' vec2 p=pos();vec2 m=ptr();float t=uTime;',
    ' float ph=mod(t,7.)/7.;E=ss(.35,.5,ph)-ss(.85,1.,ph);',
    ' vec3 col=mix(DEEP,NAVY,ss(-.6,.6,p.y));',
    ' vec2 gr=abs(fract(p*14.)-.5);col+=SLATE*.06*(1.-ss(.0,.03,min(gr.x,gr.y)));',
    ' col+=ORANGE*.14*ss(.6,.0,length(p));',
    ' vec2 q=p-m*.015*uPtrOn;',
    ' float win=sdBox(q,vec2(.52,.4),.03);',
    ' col=mix(col,DEEP,fill(sdBox(q-vec2(0.,-.02),vec2(.54,.42),.04))*.5);',
    ' col=mix(col,PANEL,fill(win));',
    ' float inW=fill(win+.003);',
    ' vec3 ui=PANEL;',
    ' ui=mix(ui,PANEL_TOP,fill(el(q,0.,.34,.52,.045,0.)));',
    ' for(int i=0;i<3;i++){float cx=-.46+.04*float(i);ui=mix(ui,i<2?ORANGE:SLATE,fill(el(q,cx,.34,.01,.01,.01)));}',
    ' for(int i=0;i<3;i++){float cx=-.34+.12*float(i);ui=mix(ui,CREAM,fill(el(q,cx,.22,.045,.012,.012))*(i==0?.9:.3));}',
    ' ui=mix(ui,CREAM,fill(el(q,-.24,.13,.22,.022,.022))*.95);',
    ' ui=mix(ui,CREAM,fill(el(q,-.28,.07,.18,.022,.022))*.95);',
    ' ui=mix(ui,ORANGE,fill(el(q,-.34,.01,.12,.022,.022)));',
    ' ui=mix(ui,SLATE,fill(el(q,-.26,-.06,.2,.007,.007))*.8);',
    ' ui=mix(ui,SLATE,fill(el(q,-.31,-.095,.15,.007,.007))*.8);',
    ' ui=mix(ui,ORANGE,fill(el(q,-.38,-.2,.08,.035,.012)));',
    ' ui=mix(ui,DEEP,fill(el(q,-.38,-.2,.04,.006,.003)));',
    ' for(int i=0;i<2;i++)for(int j=0;j<2;j++){',
    '  float cx=.23+.18*float(i);float cy=.1-.2*float(j);',
    '  float live=mix(cx,-cx,E);float hov=ss(.2,.0,length(vec2(live,cy)-m))*uPtrOn;',
    '  vec3 cc=(i==1&&j==1)?ORANGE:mix(NAVY2,vec3(.15,.27,.52),hov);',
    '  ui=mix(ui,cc,fill(el(q,cx,cy,.08,.085,.012)));',
    '  ui=mix(ui,CREAM,fill(el(q,cx-.012,cy-.04,.045,.006,.006))*.85);',
    '  ui=mix(ui,CREAM,fill(el(q,cx-.02,cy-.06,.035,.005,.005))*.4);}',
    ' ui=mix(ui,SLATE,fill(sdBox(q-vec2(0.,-.31),vec2(.075,.024),.024))*.55);',
    ' ui=mix(ui,ORANGE,fill(length(q-vec2(mix(-.05,.05,E),-.31))-.017));',
    ' col=mix(col,ui,inW);',
    ' col=mix(col,SLATE,fill(abs(win)-.0016)*.8);',
    ' col*=1.-.3*ss(.6,1.,length(p));',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

export function createFlatScene(canvas: HTMLCanvasElement, name: string): SceneEngine {
  const shader = SH[name];
  if (!shader) throw new Error('Unknown discipline scene');
  const gl = canvas.getContext('webgl', {antialias:false, alpha:false, powerPreference:'low-power'});
  if (!gl) throw new Error('WebGL unavailable');
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const destroy = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(s=>gl.deleteShader(s));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    const compile = (type: number, code: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error('Shader allocation failed');
      shaders.push(s); gl.shaderSource(s, code); gl.compileShader(s);
      if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return s;
    };
    program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program,compile(gl.VERTEX_SHADER,VERT));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Shader linking failed');
    gl.useProgram(program);
    buffer=gl.createBuffer();
    if (!buffer) throw new Error('Buffer allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const attribute=gl.getAttribLocation(program,'a');
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,'uRes'),time=gl.getUniformLocation(program,'uTime');
    const ptr=gl.getUniformLocation(program,'uPtr'),on=gl.getUniformLocation(program,'uPtrOn');
    const light=gl.getUniformLocation(program,'uLight');
    let x=.5,y=.5,tx=.5,ty=.5,amount=0,target=0;
    return {
      resize(w,h,dpr) { canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));gl.viewport(0,0,canvas.width,canvas.height); },
      pointer(px,py,active) {tx=px;ty=1-py;target=active?1:0;},
      render(seconds) {
        x+=(tx-x)*.14;y+=(ty-y)*.14;amount+=(target-amount)*.12;
        gl.uniform2f(res,canvas.width,canvas.height);gl.uniform1f(time,seconds);
        gl.uniform2f(ptr,x,y);gl.uniform1f(on,amount);
        gl.uniform1f(light,document.documentElement.classList.contains('dark')||document.documentElement.dataset.theme==='dark'?0:1);
        gl.drawArrays(gl.TRIANGLES,0,3);
      },
      destroy,
    };
  } catch(error) { destroy();throw error; }
}
