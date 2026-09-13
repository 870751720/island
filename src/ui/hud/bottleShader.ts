/** 三个瓶子合并在一个小画布中绘制：玻璃轮廓、液面、折射高光与气泡。 */
export const bottleVertexShader = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;

export const bottleFragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform vec3 uLevels;
uniform float uTime;
uniform float uMotion;

float box(vec2 p,vec2 size,float radius){
  vec2 q=abs(p)-size+radius;
  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
}
float bottle(vec2 p,float kind){
  float body;
  if(kind<0.5) body=length((p-vec2(0.0,-0.07))*vec2(1.0,0.96))-0.31;
  else if(kind<1.5) body=box(p-vec2(0.0,-0.07),vec2(0.29,0.30),0.12);
  else body=box(p-vec2(0.0,-0.055),vec2(0.24,0.325),0.16);
  return min(body,box(p-vec2(0.0,0.24),vec2(0.115,0.14),0.035));
}
void main(){
  float kind=floor(vUv.x*3.0);
  vec2 p=vec2(fract(vUv.x*3.0)-0.5,(vUv.y-0.5)*1.10);
  float level=kind<0.5?uLevels.x:(kind<1.5?uLevels.y:uLevels.z);
  vec3 tint=kind<0.5?vec3(0.91,0.25,0.32):(kind<1.5?vec3(0.95,0.63,0.16):vec3(0.16,0.67,0.88));
  float d=bottle(p,kind);
  float glass=1.0-smoothstep(-0.008,0.008,d);
  float inner=1.0-smoothstep(-0.024,-0.012,d);
  vec3 color=mix(vec3(0.36,0.54,0.53),vec3(0.94,0.98,0.89),inner);
  float alpha=glass*mix(0.8,0.27,inner);
  float wave=(sin(p.x*15.0+uTime*2.4+kind)*0.009+sin(p.x*25.0-uTime*1.7)*0.005)*uMotion;
  float surface=mix(-0.405,0.355,level)+wave*sin(level*3.14159);
  float liquid=(1.0-smoothstep(surface-0.008,surface+0.008,p.y))*inner*step(0.001,level);
  vec3 fluid=tint*(0.78+0.24*(p.y+0.4)/0.8);
  fluid+=vec3(0.18)*exp(-abs(p.y-surface)*150.0);
  float caustic=pow(max(0.0,sin(p.x*13.0+p.y*4.0+uTime*0.7)),8.0)*0.07*uMotion;
  fluid+=caustic;
  color=mix(color,fluid,liquid);
  alpha=max(alpha,liquid*0.95);
  for(int i=0;i<2;i++){
    float fi=float(i);
    vec2 bubble=vec2(sin(fi*8.0+kind*3.0)*0.13,-0.32+mod(uTime*0.045+fi*0.21+kind*0.12,0.58));
    float ring=(1.0-smoothstep(0.002,0.007,abs(length(p-bubble)-0.015)))*liquid*uMotion;
    color=mix(color,vec3(1.0),ring*0.32);
  }
  float shine=(1.0-smoothstep(0.008,0.026,abs(p.x+0.17)))*(1.0-smoothstep(0.06,0.24,abs(p.y+0.01)))*glass;
  color=mix(color,vec3(1.0,1.0,0.95),shine*0.75);
  alpha=max(alpha,shine*0.72);
  float rim=1.0-smoothstep(-0.004,0.006,box(p-vec2(0.0,0.345),vec2(0.15,0.035),0.015));
  color=mix(color,vec3(0.87,0.93,0.84),rim);alpha=max(alpha,rim*0.95);
  float cork=1.0-smoothstep(-0.004,0.006,box(p-vec2(0.0,0.405),vec2(0.103,0.043),0.012));
  color=mix(color,mix(vec3(0.65,0.44,0.25),vec3(0.86,0.68,0.43),smoothstep(0.36,0.45,p.y)),cork);
  alpha=max(alpha,cork);
  gl_FragColor=vec4(color,alpha);
}
`;
