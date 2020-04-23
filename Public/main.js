window.addEventListener('load',()=>{

var nojoueur=(-1);//numéro de joueur
var main;//main du joueur
var socket= io();//connection au socket


//******Initialisation des boutons

//Init login page: events de boutons
for (let i=0;i<4;i++){
  document.getElementById('Entrer'+i).addEventListener('click',()=>{
    username = document.getElementById('joueur'+i).value;
    if (username==""){return};
    nojoueur=i;
    document.getElementById('loginpage').style.display="none";
    document.getElementById('mainpage').style.display="block";
    socket.emit('add user', username, nojoueur);
  })
}

//Init du dialog annonces
document.getElementById('Jeprends').addEventListener('click',()=>{
  socket.emit('Jeprends');
});
document.getElementById('Redonner').addEventListener('click',()=>{
  socket.emit('Redonner');
  document.getElementById('Redonner').style.display="none";
})

//init du dialog saisiecontrat
document.getElementById('OK').addEventListener('click',()=>{
  var radioCouleur=document.getElementsByName('couleurcontrat');
  var contrat={'valeur':document.getElementById('valeurcontrat').value,'couleur':"",'coinche':document.getElementById('coinche').value};
  for (let i=0;i<radioCouleur.length;i++){
    if (radioCouleur[i].checked){contrat.couleur=radioCouleur[i].value};
  }
  if (contrat.couleur!=""){
    socket.emit('Jedonnelecontrat',contrat);
    //Reset du formulaire
    document.getElementById('valeurcontrat').selectedIndex=0;
    document.getElementsByName('couleurcontrat').forEach((obj)=>obj.checked=false);
    document.getElementById('coinche').selectedIndex=0;
  };
})

//init du dialog nlle donne
document.getElementById('nlledonne').addEventListener('click',()=>{
  socket.emit('donneSuivante');
  affichePage("mainpage");
  for (let i in imagesCartes){
    imagesCartes[i].set({evented:false,id:null,angle:0});
    canvas.remove(imagesCartes[i]);
  }
  canvas.renderAll();
})

//Init du dialog score
document.getElementById('donneSuivante').addEventListener('click',()=>{
  var edit=[document.getElementById('score0').innerHTML,document.getElementById('score1').innerHTML];
  socket.emit('donneSuivante',edit);
  affichePage("mainpage");
})

//*************************evenements du socket

socket.on('MAJmain',(main,no)=>{
  afficheMain(main);
  if(no!=null){
    nojoueur=no;
    affichePage('mainpage');
  }
});

socket.on('MAJmainsposees',afficheMainsPosees);

socket.on('MAJdata',data=>MAJdata(data));

function MAJdata(data){
  console.log('data',data,nojoueur);
  //MAJ des noms de la table
  jGauche.text = (data.joueurs[(nojoueur+1)%4]==null ? "" : data.joueurs[(nojoueur+1)%4]);
  jFace.text = (data.joueurs[(nojoueur+2)%4]==null ? "" : data.joueurs[(nojoueur+2)%4]);
  jDroite.text = (data.joueurs[(nojoueur+3)%4]==null ? "" : data.joueurs[(nojoueur+3)%4]);
  afficheJoueurActif(data.joueuractif);
  //MAJ des cartes posées
  canvas.getObjects().forEach(obj=>{(obj.id==null||obj.groupe) ? canvas.remove(obj) : null});
  affichePli(data.pli);
  canvas.renderAll();

  switch (data.phase){
    case 'annonces':
      affichePage("mainpage","annonces");
      document.getElementById('Redonner').style.display=(data.donneur==nojoueur ? "":"none");
    break;
    case 'redonne':
      affichePage("mainpage","nouvelledonne");
      MAJscore(data);
      //utilise l'event MAJmainsposees
    break;
    case 'saisiecontrat':
      if (nojoueur==data.preneur){
        affichePage("mainpage","saisiecontrat");
      } else {
        affichePage("mainpage");
      };
    break;
    case 'jouerpli':
      affichePage("mainpage");
      MAJpliramasse();//on masque le pli si il y en a
      //rend les cartes bougeables sur le tapis
      if (nojoueur==data.joueuractif){
        for (let i in imagesCartes) {
          imagesCartes[i].off('moving',zoneSousMain);
          imagesCartes[i].on('moving',zoneJouable);
        };
      };
    break;
    case 'findepli':
      affichePage("mainpage");
      plifait(data.pli,data.ramasseur);
    break;
    case 'findedonne':
      affichePage("mainpage","scores");
      MAJscore(data);
    break;
    default:
      if (nojoueur!=(-1)){
        affichePage("mainpage");
      } else {
        affichePage("loginpage");
        for (let i=0;i<4;i++){
          if (data.joueurs[i]) {
            document.getElementById('Entrer'+i).style.display='none';
            document.getElementById('joueur'+i).disabled=true;
            document.getElementById('joueur'+i).value=data.joueurs[i];
          } else {
            document.getElementById('Entrer'+i).style.display='';
            document.getElementById('joueur'+i).disabled=false;
          }
        }
      };
    break;
  }
}



//MAJ du tableau de score
function MAJscore(data){

  document.getElementById('equipe0').innerHTML=data.joueurs[0] + "<BR>" + data.joueurs[2];
  document.getElementById('score0').innerHTML=data.scores[0];
  document.getElementById('equipe1').innerHTML=data.joueurs[1] + "<BR>" + data.joueurs[3];
  document.getElementById('score1').innerHTML=data.scores[1];

  if (data.contrat){
    var buf;
    switch (data.contrat.couleur){
    case "spade":
      buf=" <span style='color:black'>&spades;</span> ";
    break;
    case "heart":
      buf=" <span style='color:red'>&hearts;</span> ";
    break;
    case "diamond":
      buf=" <span style='color:red'>&diams;</span> ";
    break;
    case "club":
      buf=" <span style='color:black'>&clubs;</span> ";
    break;
    default:
      buf=data.contrat.couleur;
    break;
    }
    document.getElementById('contrat').innerHTML="Contrat: "+data.contrat.valeur+" "+buf+" "+data.contrat.coinche;
  }
  document.getElementById('compte').innerHTML="Points faits: "+data.pointsfaits;
}


//*********************initialisation du canvas
var canvas = new fabric.Canvas('c',{
  moveCursor : 'pointer',
  hoverCursor : 'pointer',
  selection : false,
});
var vw;//largeur de la fenetre
var vh;//hauteur de la fenetre
var jGauche;
var jFace;
var jDroite;
var imagesCartes={};
var imagePli;
var soustable;
var sousmain;
//callback d'event de click
zoneSousMain= function(options){
  if (options.target.top<=75*vh){options.target.top=75*vh;}
  if (options.target.top>=100*vh){options.target.top=100*vh;}
  if (options.target.left<=0){options.target.left=0;}
  if (options.target.left>=100*vw){options.target.left=100*vw;}
}
zoneJouable=function(options){
  if (options.target.top<=40*vh){options.target.top=40*vh;}
  if (options.target.top>=100*vh){options.target.top=100*vh;}
  if (options.target.left<=0){options.target.left=0;}
  if (options.target.left>=100*vw){options.target.left=100*vw;}
  if (options.target.top>=40*vh && options.target.top<=75*vh){
    if (options.target.left<=15*vw){options.target.left=15*vw;}
    if (options.target.left>=85*vw){options.target.left=85*vw;}
    }
}

function initCanvas (){
  fabric.Object.prototype.objectCaching = false;//Empeche le caching pour la librairie fabric

  vh=window.innerHeight/100;
  vw=window.innerWidth/100;

  canvas.setDimensions({width:100*vw,height:100*vh});

  soustable=new fabric.Rect({  width: 70*vw, height: 60*vh, fill: 'darkgreen', left: 15*vw, top: 5*vh, id:"back", evented:false,hoverCursor:'default'});

  sousmain=new fabric.Rect({  width: 100*vw, height: 30*vh, fill: 'green', left: 0, top: 70*vh,id:"back" , evented:false, hoverCursor:'default'});
  jGauche=new fabric.Text("", { left: 8*vw, top: 35*vh, fontSize:16 , evented:false, id:"back", originX: "center", originY: "center",hoverCursor:'default'});
  jFace=new fabric.Text("", { left: 50*vw, top: 3*vh, fontSize:16, evented:false, id:"back", originX: "center", originY: "center",hoverCursor:'default' });
  jDroite= new fabric.Text("", { left: 92*vw, top: 35*vh, fontSize:16, evented:false,id:"back", originX: "center", originY: "center",hoverCursor:'default' });

  canvas.add(jGauche,jFace,jDroite);
  canvas.add(sousmain);
  canvas.add(soustable);

  //Création des sprites cartes
  for (let carte of document.getElementsByClassName("carte")){
    imagesCartes[carte.id]=new fabric.Image(carte,{
      left: 0,
      top: 0,
      originX: "center",
      originY: "center",
      scaleX:30*vh/244,
      scaleY:30*vh/244,
      hasControls:false,
      hasBorders:false,
      evented:false,
      lockRotation:true,
      lockScalingX:true,
      lockScalingY:true
    });
    imagesCartes[carte.id].on('moving',zoneSousMain);
  };
}

//rediemnsionnement de l'écran
window.onresize= function(){
for (let i in imagesCartes){
  var scale=imagesCartes[i].scaleX;
  var left=imagesCartes[i].left;
  var top=imagesCartes[i].top;
  imagesCartes[i].set({scaleX:scale*(window.innerHeight/(vh*100)),scaleY:scale*(window.innerHeight/(vh*100)),left:left*window.innerWidth/(100*vw),top:top*window.innerHeight/(vh*100)});
  imagesCartes[i].setCoords();
}
if (imagePli){
  var scale=imagePli.scaleX;
  var left=imagePli.left;
  var top=imagePli.top;
  imagePli.set({scaleX:scale*(window.innerHeight/(vh*100)),scaleY:scale*(window.innerHeight/(vh*100)),left:left*window.innerWidth/(100*vw),top:top*window.innerHeight/(vh*100)});
  imagePli.setCoords();
}
vh=window.innerHeight/100;
vw=window.innerWidth/100;
canvas.setDimensions({width:100*vw,height:100*vh});

soustable.set({  width: 70*vw, height: 60*vh, fill: 'darkgreen', left: 15*vw, top: 5*vh, evented:false, hoverCursor:'default'});
soustable.setCoords();
sousmain.set({  width: 100*vw, height: 30*vh, fill: 'green', left: 0, top: 70*vh, evented:false, hoverCursor:'default'});
sousmain.setCoords();
jGauche.set({ left: 8*vw, top: 35*vh, fontSize:16 , evented:false, originX: "center", originY: "center",hoverCursor:'default'});
jGauche.setCoords();
jFace.set({ left: 50*vw, top: 3*vh, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });
jFace.setCoords();
jDroite.set({ left: 92*vw, top: 35*vh, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });
jDroite.setCoords();

canvas.renderAll();

};


cliques=function(options){
  if (options.target){
    if (options.target.groupe){//on clique sur un pli
      socket.emit('plireleve');
    } else {
    if (options.target.top<=70*vh){
      socket.emit('cartejouee',options.target.id);//on previent le serveur de la carte jouée
      sousmain.set({fill:'transparent'});
      options.target.evented=false;//on ne peut plus bouger la carte jouée
      for (let i in imagesCartes){//on ne peut plus poser de cartes
        imagesCartes[i].off('moving',zoneJouable);
        imagesCartes[i].on('moving',zoneSousMain);
      };
     }
    }
  }
}

//Event de pose d'une carte et de relevé de pli
canvas.on('mouse:up', cliques);

initCanvas();
//************************fonctions d'affichage

//rammassage du pli
function plifait(pli, no){

  var compteur=0;
  for (let i=0;i<4;i++){
    imagesCartes[pli[i].couleur+"_"+pli[i].valeur].id=null;
    if (no==nojoueur){imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate(
      {left:(40+(5*i))*vw,top:50*vh,angle:0},
      {
        duration: 1000,
        onChange: canvas.renderAll.bind(canvas),
        onComplete:()=>{(compteur<3) ? compteur++ : creerGroupe()}
      }
    )};
    if (no==(nojoueur+1)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate(
      {left:30*vw,top:(25+(5*i))*vh,angle:90},
      {
        duration: 1000,
        onChange: canvas.renderAll.bind(canvas),
        onComplete:()=>{(compteur<3) ? compteur++ : creerGroupe()}
      }
    )};
    if (no==(nojoueur+2)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate(
      {left:(40+(5*i))*vw,top:20*vh,angle:0},
      {
        duration: 1000,
        onChange: canvas.renderAll.bind(canvas),
        onComplete:()=>{(compteur<3) ? compteur++ : creerGroupe()}
      }
    )};
    if (no==(nojoueur+3)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate(
      {left:70*vw,top:(25+(5*i))*vh,angle:90},
      {
        duration: 1000,
        onChange: canvas.renderAll.bind(canvas),
        onComplete:()=>{(compteur<3) ? compteur++ : creerGroupe()}
      }
    )};
  }

  function creerGroupe(){
    canvas.renderAll();
    imagePli=new fabric.Group();
    imagesCartes[pli[0].couleur+"_"+pli[0].valeur].clone(x=>{
      imagePli.addWithUpdate(x);
      imagesCartes[pli[1].couleur+"_"+pli[1].valeur].clone(x=>{
        imagePli.addWithUpdate(x);
        imagesCartes[pli[2].couleur+"_"+pli[2].valeur].clone(x=>{
          imagePli.addWithUpdate(x);
          imagesCartes[pli[3].couleur+"_"+pli[3].valeur].clone(x=>{
            for (let i=0;i<4;i++){
              canvas.remove(imagesCartes[pli[i].couleur+"_"+pli[i].valeur]);
            }
            imagePli.addWithUpdate(x);
            imagePli.set({hasControls:false,hasBorders:false,groupe:true});
            if (no!=nojoueur){imagePli.set({evented:false})};
            canvas.add(imagePli);
            canvas.renderAll();
          })
        })
      })
    })
  }
};

//Affichage d'une page donnée
function affichePage (page,dialog){
  var pages=document.getElementsByClassName("page");
  for (var p of pages){
    if (p.id==page || p.id==dialog){
      p.style.display="block";
    } else {
      p.style.display="none";
    }
  }

  var dialogs=document.getElementsByClassName("dialog");
  for (var p of dialogs){
    if (p.id==page || p.id==dialog){
      p.style.display="block";
    } else {
      p.style.display="none";
    }
  }
};

function afficheJoueurActif(nojoueuractif){
  jGauche.set({textBackgroundColor:'transparent'});
  jFace.set({textBackgroundColor:'transparent'});
  jDroite.set({textBackgroundColor:'transparent'});
  sousmain.set({fill:'green'});
  if (nojoueur==nojoueuractif){
    sousmain.set({fill:'blue'});
  } else {
    if (nojoueuractif==(nojoueur+1)%4) {jGauche.set({textBackgroundColor:'blue'})};// on met en évidence celui qui a la main
    if (nojoueuractif==(nojoueur+2)%4) {jFace.set({textBackgroundColor:'blue'})};
    if (nojoueuractif==(nojoueur+3)%4) {jDroite.set({textBackgroundColor:'blue'})};
  };
  canvas.renderAll();
};

function afficheMain(main){
for (let i in imagesCartes){
  imagesCartes[i].set({evented:false,id:null,angle:0});
  canvas.remove(imagesCartes[i]);
}
for (let i=0;i<main.length;i++){
  var carte=main[i].couleur+"_"+main[i].valeur;
  imagesCartes[carte].set({left:5*vw+(i+1)*10*vw,top:85*vh,evented:true,id:main[i], groupe:false, angle:0});
  canvas.add(imagesCartes[carte]);
}
for (let i in imagesCartes){
  imagesCartes[i].setCoords();
}
canvas.renderAll();
};

//on affiche le pli en cours
function affichePli (pli){
  if (!pli){return};
  if (pli[nojoueur]) {
    carte=pli[nojoueur];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:50*vw,top:50*vh, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
  if (pli[(nojoueur+1)%4]) {
    carte=pli[(nojoueur+1)%4];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:35*vw,top:35*vh,angle:90, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
  if (pli[(nojoueur+2)%4]) {
    carte=pli[(nojoueur+2)%4];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:50*vw,top:20*vh, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
  if (pli[(nojoueur+3)%4]) {
    carte=pli[(nojoueur+3)%4];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:65*vw,top:35*vh,angle:90, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
};

//le pli est ramassé par qq1, on l'efface
function MAJpliramasse(){
  canvas.remove(imagePli);
  canvas.renderAll();
};

function afficheMainsPosees(mains){

  for (let i=0;i<8;i++){

    carte=mains[(nojoueur+1)%4][i];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:10*vw,top:(20+5*i)*vh,angle:90, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);

    carte=mains[(nojoueur+2)%4][i];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:(35+5*i)*vw,top:15*vh, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);

    carte=mains[(nojoueur+3)%4][i];
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:90*vw,top:(55-5*i)*vh,angle:90, id:carte});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  }
}








});
