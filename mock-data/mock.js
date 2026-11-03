/* mock-data/  — demo values ONLY. Shape = contract the MATLAB layer must return.
   Nothing in components/ or pages/ reads from here directly.
   ===================================================================== */
const MOCK = {
  case:{caseId:'IDS-2026-0147',evidenceId:'EV-0001',status:'Awaiting evidence'},
  metrics:{quality:{label:'Image quality',value:0.82,unit:'%',risk:false},ela:{label:'ELA anomaly',value:0.64,unit:'%',risk:true},
    noise:{label:'Noise inconsistency',value:0.41,unit:'%',risk:false},texture:{label:'Texture anomaly',value:0.58,unit:'%',risk:false},
    fft:{label:'Frequency anomaly',value:0.37,unit:'%',risk:false},copyMove:{label:'Copy-move evidence',value:0.72,unit:'%',risk:true}},
  regions:[{id:1,name:'Photo area',score:.87,bbox:[.06,.28,.28,.5],confidence:.91},{id:2,name:'Text area',score:.72,bbox:[.40,.34,.5,.1],confidence:.78},{id:3,name:'Background',score:.61,bbox:[.66,.08,.28,.2],confidence:.64}],
  copyMoveMatches:14,
  dataset:{total:10000,processed:8742,genuine:5000,manipulated:5000,types:['Passport','National ID','Driving licence','Residence permit']},
  steps:['Preprocessing','Image quality','ELA analysis','Noise analysis','Frequency analysis','Copy-move detection','Generating anomaly map'],
  assessment:'REQUIRES MANUAL REVIEW'
};
MOCK.rows=Array.from({length:40},(_,i)=>({id:'IMG-'+String(i+1).padStart(5,'0'),type:MOCK.dataset.types[i%4],label:i%2?'Manipulated':'Genuine',score:i%2?.5+((i*7)%45)/100:((i*5)%30)/100,status:i<34?'Processed':'Pending'}));
