/* state
   ===================================================================== */
const S={evidence:null,analysed:false,running:false,step:-1,view:'original',metrics:null,heat:null,cm:null,report:null,ds:null,q:'',f:'All'};
const $=s=>document.querySelector(s),pct=v=>Math.round(v*100);
