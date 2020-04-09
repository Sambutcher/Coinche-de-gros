window.addEventListener('load',()=>{



fabric.Object.prototype.objectCaching = false;//Empeche le caching pour la librairie fabric

const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];
var nojoueur=(-1);//numéro de joueur
var main;//main du joueur
var socket = io();//connection au socket

//*********init du canvas
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

initCanvas();


//******Initialisation des boutons

//Init login page: events de boutons
for (let i=0;i<4;i++){
  document.getElementById('Entrer'+i).addEventListener('click',()=>{
    username = document.getElementById('joueur'+i).value;
    if (username==""){return};
    nojoueur=i;
    affichePage('main');
    socket.emit('add user', username, nojoueur);
  })
}

//Init de contrat page: events de bouton
document.getElementById('Jeprends').addEventListener('click',()=>{
  socket.emit('Jeprends');
  affichePage('annonces');
});

document.getElementById('OK').addEventListener('click',()=>{
  var radioCouleur=document.getElementsByName('couleurcontrat');
  var contrat=[document.getElementById('valeurcontrat').value,"",document.getElementById('coinche').value,nojoueur];
  for (let i=0;i<radioCouleur.length;i++){
    if (radioCouleur[i].checked){contrat[1]=radioCouleur[i].value};
  }
  if (contrat[1]!=""){
    socket.emit('Jedonnelecontrat',contrat);//On envoie au serveur le contrat
  };
  affichePage('main');
})
document.getElementById('Annule').addEventListener('click',()=>{
  socket.emit('Redonner');
  affichePage('main');
})
document.getElementById('Redonner').addEventListener('click',()=>{
  socket.emit('Redonner');
  document.getElementById('Redonner').style.display="none";
})

//Init de score page: event du bouton
document.getElementById('donneSuivante').addEventListener('click',()=>{
  socket.emit('donneSuivante');//On envoie au serveur la validation de la donne
  affichePage('main');
})

//*************************evenements du socket

socket.on('Page',affichePage); //Demande du serveur de changer de page
socket.on('MAJsalle',MAJsalle); // (salle)
socket.on('MAJcarteposee',MAJcarteposee);//(carte, joueur)
socket.on('MAJpliramasse',MAJpliramasse);//()
socket.on('MAJscores',MAJscores); //(contrat,compte,scores)
socket.on('Tourdebut',debutDeDonne); //(donneur, main)
socket.on('Touratoi',atoidejouer);//(No de joueur à jouer)
socket.on('Tourplifait',plifait);//(pli,no du ramasseur)
socket.on('Refresh',refresh);// (nojoueur, main,joueur qui doit poser une carte)

//********************fonctions de jeu
//Lancement de la partie
function debutDeDonne (donneur,main){
  afficheMain(main);
  afficheJoueurActif((donneur+1)%4);
  affichePage('jeprends');
  if (nojoueur==donneur){
    document.getElementById('Redonner').style.display="initial"
  } else {
    document.getElementById('Redonner').style.display="none";
  }
};

//a quelqu'un de jouer
function atoidejouer(joueur){
  affichePage('main');
  afficheJoueurActif(joueur);
  if (joueur==nojoueur){
    canvas.forEachObject((object)=>{//rend les cartes bougeables sur le tapis
      object.off('moving',zoneSousMain);
      object.on('moving',zoneJouable);
    });
  }
  canvas.renderAll();
}

function refresh(noj,main,joueur){
  nojoueur=noj;
  affichePage('main');
  afficheJoueurActif(joueur);
  afficheMain(main);
  if (joueur==nojoueur){
    canvas.forEachObject((object)=>{//rend les cartes bougeables sur le tapis
      object.off('moving',zoneSousMain);
      object.on('moving',zoneJouable);
    });
  }
  canvas.renderAll();
}

//un pli est fait et doit être ramassé
function plifait(pli, no){
  afficheJoueurActif(no);

  for (let i=0;i<4;i++){
    if (no==nojoueur){imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:(40+(5*i))*vw,top:50*vh,angle:0},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
    if (no==(nojoueur+1)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:30*vw,top:(25+(5*i))*vh,angle:90},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
    if (no==(nojoueur+2)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:(40+(5*i))*vw,top:20*vh,angle:0},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
    if (no==(nojoueur+3)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:70*vw,top:(25+(5*i))*vh,angle:90},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
  }
  /*for (let i=0;i<4;i++){
    if (no==nojoueur){imagesCartes[pli[i].couleur+"_"+pli[i].valeur].set({left:(40+(5*i))*vw,top:50*vh,angle:0})};
    if (no==(nojoueur+1)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].set({left:30*vw,top:(25+(5*i))*vh,angle:90})};
    if (no==(nojoueur+2)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].set({left:(40+(5*i))*vw,top:20*vh,angle:0})};
    if (no==(nojoueur+3)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].set({left:70*vw,top:(25+(5*i))*vh,angle:90})};
  }*/
  setTimeout(()=>{
    canvas.renderAll();
    imagePli=new fabric.Group();
    imagesCartes[pli[0].couleur+"_"+pli[0].valeur].clone(x=>{
      imagePli.addWithUpdate(x);
      imagesCartes[pli[1].couleur+"_"+pli[1].valeur].clone(x=>{
        imagePli.addWithUpdate(x);
        imagesCartes[pli[2].couleur+"_"+pli[2].valeur].clone(x=>{
          imagePli.addWithUpdate(x);
          imagesCartes[pli[3].couleur+"_"+pli[3].valeur].clone(x=>{
            imagePli.addWithUpdate(x);
            imagePli.set({hasControls:false,hasBorders:false,groupe:true});
            if (no!=nojoueur){imagePli.set({evented:false})};
            canvas.add(imagePli);
          })
        })
      })
    })
    for (let i=0;i<4;i++){
      canvas.remove(imagesCartes[pli[i].couleur+"_"+pli[i].valeur]);
    }
    canvas.renderAll();
  },1000);

};

//*********************initialisation du canvas
function initCanvas (){
  vh=window.innerHeight/100;
  vw=window.innerWidth/100;

  canvas.setDimensions({width:100*vw,height:100*vh});

  soustable=new fabric.Rect({  width: 70*vw, height: 60*vh, fill: 'darkgreen', left: 15*vw, top: 5*vh, evented:false,hoverCursor:'default'});

  sousmain=new fabric.Rect({  width: 100*vw, height: 30*vh, fill: 'green', left: 0, top: 70*vh, evented:false, hoverCursor:'default'});
  jGauche=new fabric.Text("", { left: 8*vw, top: 35*vh, fontSize:16 , evented:false, originX: "center", originY: "center",hoverCursor:'default'});
  jFace=new fabric.Text("", { left: 50*vw, top: 3*vh, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });
  jDroite= new fabric.Text("", { left: 92*vw, top: 35*vh, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });

  canvas.add(jGauche,jFace,jDroite);
  canvas.add(sousmain);
  canvas.add(soustable);

  //Création des sprites cartes
  var buf;
  buf = new fabric.Image( document.getElementById('back'), {
      left: 0,
      top: 0,
      originX: "center",
      originY: "center",
      scaleX:30*vh/169,
      scaleY:30*vh/169,
      hasControls:false,
      hasBorders:false,
    });
  imagesCartes['back']=buf;
  for (let i=0;i<couleurs.length;i++){
    for (let j=0;j<valeurs.length;j++){
      buf = new fabric.Image( document.getElementById(couleurs[i]+"_"+valeurs[j]), {
          left: 0,
          top: 0,
          originX: "center",
          originY: "center",
          scaleX:30*vh/244,
          scaleY:30*vh/244,
          hasControls:false,
          hasBorders:false,
          evented:false,
        });
        imagesCartes[couleurs[i]+"_"+valeurs[j]]=buf;
    }
  }
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

  soustable.set({  width: 70*vw, height: 60*vh, fill: 'darkgreen', left: 15*vw, top: 5*vh, evented:false,hoverCursor:'default'});
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

//callback d'event
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
cliques=function(options){
  if (options.target){
    if (options.target.groupe){//on clique sur un pli
      socket.emit('plireleve');
      canvas.remove(imagePli);
      canvas.renderAll();
    } else {
    if (options.target.top<=70*vh){
      socket.emit('cartejouee',options.target.id);//on previent le serveur de la carte jouée
      sousmain.set({fill:'transparent'});
      options.target.evented=false;//on ne peut plus bouger la carte jouée
      canvas.forEachObject((object)=>{//on ne peut plus poser de cartes
        object.off('moving',zoneJouable);
        object.on('moving',zoneSousMain);
      });
     }
    }
  }
}

//Event de mouvements de imagesCartes
for (let i=0;i<couleurs.length;i++) {
 for (let j=0;j<valeurs.length;j++){
    imagesCartes[couleurs[i]+"_"+valeurs[j]].on('moving',zoneSousMain);
  }
}

//Event de pose d'une carte et de relevé de pli
canvas.on('mouse:up', cliques);

//************************fonctions d'affichage
//Affichage d'une page donnée
function affichePage (page){
  var pages=['login','close','main'];// Pages disponibles
  var dialogs=['annonces','score','jeprends'] ;//fenetres de dialogue
  for (let i=0;i<pages.length;i++){
    if (page==pages[i]){
      document.getElementById(pages[i]+'page').style.display="block";
    } else {
      document.getElementById(pages[i]+'page').style.display="none";
    }
  }
  for (let i=0;i<dialogs.length;i++){
    if (page==dialogs[i]){
      document.getElementById('mainpage').style.display="block";
      document.getElementById('valeurcontrat').selectedIndex=0;//on efface les données du formulaire
      document.getElementsByName('couleurcontrat').forEach((obj)=>obj.checked=false);
      document.getElementById('coinche').selectedIndex=0;
      document.getElementById(dialogs[i]+'page').style.display="block";
    } else {
      document.getElementById(dialogs[i]+'page').style.display="none";
    }
  }
}

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
}

function afficheMain(main){
for (let i in imagesCartes){
  imagesCartes[i].set({evented:false,id:-1,angle:0});
  canvas.remove(imagesCartes[i]);
}
for (let i=0;i<main.length;i++){
  var carte=main[i].couleur+"_"+main[i].valeur;
  imagesCartes[carte].set({left:5*vw+(i+1)*10*vw,top:85*vh,evented:true,id:i, groupe:false, angle:0});
  canvas.add(imagesCartes[carte]);
}
canvas.renderAll();
};

//Met à jour des joueurs
function MAJsalle(salle){
  //MAJ de la salle d'attente
  for (let i=0;i<4;i++){
    if (salle[i]!="") {
      document.getElementById('Entrer'+i).style.display="none";
      document.getElementById('joueur'+i).disabled=true;
      document.getElementById('joueur'+i).value=salle[i];
    } else {
      document.getElementById('Entrer'+i).style.display='initial';
      document.getElementById('joueur'+i).disabled=false;
    }
  };
  //MAJ de la Table
  if (nojoueur!=(-1)){
    jGauche.set({text: salle[(nojoueur+1)%4]});
    jFace.set({text: salle[(nojoueur+2)%4]});
    jDroite.set({text: salle[(nojoueur+3)%4]});
  };
  canvas.renderAll();
  //MAJ du tableau de score
  document.getElementById('equipe0').innerHTML=salle[0] + "<BR>" + salle[2];
  document.getElementById('equipe1').innerHTML=salle[1] + "<BR>" + salle[3];

};

//on affiche la carte posée par un autre joueur
function MAJcarteposee (carte,alamain){
  if (alamain==(nojoueur+1)%4) {
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:35*vw,top:35*vh,angle:90});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
  if (alamain==(nojoueur+2)%4) {
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:50*vw,top:20*vh});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
  if (alamain==(nojoueur+3)%4) {
    imagesCartes[carte.couleur+"_"+carte.valeur].set({left:65*vw,top:35*vh,angle:90});
    canvas.add(imagesCartes[carte.couleur+"_"+carte.valeur]);
  };
}

//le pli est ramassé par qq1, on l'efface
function MAJpliramasse(){
  canvas.remove(imagePli);
  canvas.renderAll();
};

//on m et à jour la page de scores
function MAJscores (contrat,compte,scores){
  var buf;
  switch (contrat[1]){
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
    buf=contrat[1];
  break;
  }
  document.getElementById('contrat').innerHTML="Contrat: "+contrat[0]+buf+contrat[2];
  document.getElementById('compte').innerHTML="Points faits: "+compte[contrat[3]%2];
  document.getElementById('score0').innerHTML=scores[0];
  document.getElementById('score1').innerHTML=scores[1];
};

});
