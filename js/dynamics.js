/* 60 Hz arcade model: velocity has its own heading; rear traction controls how it follows the body. */
const Dynamics={
 driftSpeed:3,driftAngle:18,
 clamp(x,a,b){return Math.max(a,Math.min(b,x));},
 wrap(a){return Math.atan2(Math.sin(a),Math.cos(a));},
 maximum(stats,base=10){return stats.maxVelocity||7.5+(stats.topSpeed||.82)*2;},
 surfaces:{ASPHALT:{grip:1,response:1,brake:1,drag:1},ICE_STUDDED:{grip:.72,response:.8,brake:.65,drag:.84},WET_ASPHALT:{grip:.82,response:.9,brake:.8,drag:.95},GRAVEL:{grip:.7,response:.82,brake:.75,drag:1.25},SNOW:{grip:.6,response:.75,brake:.6,drag:1.3}},
 step(v,input,stats,surface,baseAccel=.13,baseMax=10){
  const profile=this.surfaces[surface]||this.surfaces.ASPHALT,shoulder=surface==='shoulder',gas=input.throttle??(input.ArrowUp?1:0),brake=!!input.ArrowDown,hand=!!input[' '],steer=input.steer??((input.ArrowRight?1:0)-(input.ArrowLeft?1:0));
  const c=Math.cos(v.angle),s=Math.sin(v.angle),speed=Math.hypot(v.vx,v.vy),response=(stats.response||1)*profile.response;
  v.steer=(v.steer||0)+(steer-(v.steer||0))*Math.min(.45,.16*response);v.throttle=(v.throttle||0)+(gas-(v.throttle||0))*.08;
  v.boost=(v.boost||0)+((gas&&speed>2?1:0)-(v.boost||0))*(gas?(stats.spool||.02):.08);
  let forward=v.vx*c+v.vy*s,side=-v.vx*s+v.vy*c;
  const slip=Math.atan2(side,Math.max(.1,Math.abs(forward))),counter=Math.sign(v.steer)===Math.sign(side)&&Math.abs(side)>.5;
  const slide=speed>2&&(hand||Math.abs(slip)>.2||gas&&Math.abs(v.steer)>.5&&speed>4);
  v.drift=(v.drift||0)+((slide?1:0)-(v.drift||0))*(slide?.12:.035);
  const wheelspin=1+Math.min(.16,Math.max(0,(stats.power||.15)-.18)*v.throttle);
  forward+=(stats.power||baseAccel)*v.throttle*(stats.delivery||1)*(1+(stats.boost||0)*v.boost)/Math.sqrt(stats.weight||1)*(shoulder?.55:1);
  if(brake){if(forward>.2)forward=Math.max(0,forward-.23*(stats.brake||1)*profile.brake);else if(!gas)forward=Math.max(-2.8,forward-.08);}
  forward*=shoulder?.95:gas?.987: .961;
  if(hand)forward*=.978;
  const loss=(hand?.007:v.drift>.3?.018/wheelspin:.13)*(stats.grip||1)*profile.grip*(counter?1.12:1);
  side*=Math.max(.65,1-loss);if(!gas&&!hand)side*=1-.018*profile.drag;
  const reverse=forward<-.1,steerLimit=(.032+Math.min(speed,8)*.001)/(1+Math.max(0,speed-7)*.055);
  let yaw=v.steer*steerLimit*(stats.steering||1)*Math.min(1,speed/1.5)*(reverse?-1:1)*(hand?1.2:1);
  const slipLimit=.85*(stats.angle||1);if(!counter&&Math.abs(slip)>slipLimit)yaw*=.42;
  yaw+=side*.0013*(stats.stability||1)*profile.grip; // local lateral component: invariant under track rotation.
  v.yaw=(v.yaw||0)+(yaw-(v.yaw||0))*Math.min(.5,.24*response);v.angle+=v.yaw;
  v.vx=c*forward-s*side;v.vy=s*forward+c*side;const next=Math.hypot(v.vx,v.vy),limit=this.maximum(stats,baseMax);if(next>limit){v.vx*=limit/next;v.vy*=limit/next;}
  if(!gas&&!brake&&Math.hypot(v.vx,v.vy)<.06){v.vx=v.vy=v.yaw=v.drift=0;}v.lateral=-v.vx*Math.sin(v.angle)+v.vy*Math.cos(v.angle);return Math.hypot(v.vx,v.vy);
 },
 drive(v,target,wanted,slip=0,skill=1){
  const speed=Math.hypot(v.vx,v.vy),aim=Math.atan2(target.y-v.y,target.x-v.x),desired=Math.min(wanted,this.maximum(v.car?.stats||{},10));
  v.drift=(v.drift||0)+(Math.min(1,Math.abs(slip)/.45)-(v.drift||0))*.09;
  const bodyTarget=aim+slip,rotation=this.wrap(bodyTarget-v.angle);v.yaw=(v.yaw||0)+(this.clamp(rotation*.2,-.045,.045)-(v.yaw||0))*.3;v.angle+=v.yaw;
  const c=Math.cos(v.angle),sn=Math.sin(v.angle),lateral=-v.vx*sn+v.vy*c;
  // Real tire force depends on drift state. Momentum and engine thrust affect the path.
  const tire=lateral*(.09*(1-v.drift)+.008*v.drift),thrust=speed<desired?.018:0;
  v.vx+=sn*tire+c*thrust;v.vy-=c*tire-sn*thrust;
  const ax=Math.cos(aim)*desired-v.vx,ay=Math.sin(aim)*desired-v.vy,force=Math.hypot(ax,ay),limit=.35*skill;
  if(force){const k=Math.min(1,limit/force);const forward=ax*c+ay*sn,side=(-ax*sn+ay*c)*(1-.25*v.drift);v.vx+=(forward*c-side*sn)*k;v.vy+=(forward*sn+side*c)*k;}
  v.lateral=-v.vx*sn+v.vy*c;return Math.hypot(v.vx,v.vy);
 }
};
