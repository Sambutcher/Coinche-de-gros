window.addEventListener('load',()=>{

var $loginPage = document.getElementById('loginpage'); // The login page
var $closePage = document.getElementById('closepage'); // The close page
var $mainPage = document.getElementById('mainpage');// The main page
var $annoncesPage = document.getElementById('annoncespage');// The main page
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];
var noJoueur=(-1);//numéro de joueur
var main;//main du joueur
var table;//table en cours
var socket = io();//connection au socket

//Evenements Click sur un bouton de login pour entrer dans la salle
for (let i=0;i<4;i++){
  document.getElementById('Entrer'+i).addEventListener('click',()=>{
    username = document.getElementById('joueur'+i).value;
    if (username==""){return};
    noJoueur=i;
    $loginPage.style.display="none";
    $mainPage.style.display="block";
    socket.emit('add user', username, noJoueur);
  }
)}

//Evenemnts de choix du contrat
document.getElementById('Jeprends').addEventListener('click',()=>{
  var radioCouleur=document.getElementsByName('couleurcontrat');
  var contrat=[document.getElementById('valeurcontrat').value,"",document.getElementById('coinche').value,noJoueur];
  for (let i=0;i<radioCouleur.length;i++){
    if (radioCouleur[i].checked){contrat[1]=radioCouleur[i].value};
  }
  if (contrat[1]!=""){
    socket.emit('Jeprends',contrat);//On envoie au serveur le contrat
  };
})
document.getElementById('Jannule').addEventListener('click',()=>{
  socket.emit('Jannule');//On envoie au serveur le contrat
  document.getElementById('form').reset();//on efface les données du formulaire
  $annoncesPage.style.display="none";
})

//evenements du socket*************************

//Si Salle pleine, changer de page (le socket est déconnecté par le serveur)
socket.on('sallePleine',()=>{
  $loginPage.style.display="none";
  $closePage.style.display="block";
})

//Met à jour des joueurs
socket.on('MAJsalle',(salle)=>{
  //MAJ de la salle d'attente
  for (let i=0;i<4;i++){
    document.getElementById('joueur'+i).value=salle[i];
    if (salle[i]!="") {
      document.getElementById('Entrer'+i).style.display="none";
      document.getElementById('joueur'+i).disabled=true;
    } else { document.getElementById('Entrer'+i).style.display='block';
    }
  };
  //MAJ de la Table
  if (noJoueur!=(-1)){
    if (salle[(noJoueur+1)%4]!="") {jGauche.set({text: salle[(noJoueur+1)%4]})};
    if (salle[(noJoueur+2)%4]!="") {jFace.set({text: salle[(noJoueur+2)%4]})};
    if (salle[(noJoueur+3)%4]!="") {jDroite.set({text: salle[(noJoueur+3)%4]})};
  };
  canvas.renderAll();
});

//Lancement de la partie
socket.on('debutDePartie',()=>{
  afficherMain();
  $annoncesPage.style.display="block";
});

//a moi de jouer
socket.on('atoidejouer',(data)=>{
  document.getElementById('form').reset();//on efface les données du formulaire
  $annoncesPage.style.display="none";
  jGauche.set({textBackgroundColor:'transparent'});
  jFace.set({textBackgroundColor:'transparent'});
  jDroite.set({textBackgroundColor:'transparent'});
  if (data==noJoueur){
    sousmain.set({fill:'blue'});
    canvas.forEachObject((object)=>{//rend les cartes bougeables sur le tapis
      object.off('moving',zoneSousMain);
      object.on('moving',zoneJouable);
    });
  } else {
    sousmain.set({fill:'green'});
    if (data==(noJoueur+1)%4) {jGauche.set({textBackgroundColor:'blue'})};// on met en évidence celui qui a la main
    if (data==(noJoueur+2)%4) {jFace.set({textBackgroundColor:'blue'})};
    if (data==(noJoueur+3)%4) {jDroite.set({textBackgroundColor:'blue'})};
  }
  canvas.renderAll();
})

//on affiche la carte posée par un autre joueur
socket.on('carteposee',(carte,alamain)=>{
  imageCarte=imagesCartes[carte.couleur+"_"+carte.valeur];
  if (alamain==(noJoueur+1)%4) {
    imageCarte.set({left:200,top:280,angle:90});
    canvas.add(imageCarte);
  };
  if (alamain==(noJoueur+2)%4) {
    imageCarte.set({left:400,top:125});
    canvas.add(imageCarte);
  };
  if (alamain==(noJoueur+3)%4) {
    imageCarte.set({left:600,top:280,angle:90});
    canvas.add(imageCarte);
  };
  canvas.renderAll();
})

//un pli est fait et doit être ramassé
socket.on('turamasses',(pli, no)=>{
  jGauche.set({textBackgroundColor:'transparent'});
  jFace.set({textBackgroundColor:'transparent'});
  jDroite.set({textBackgroundColor:'transparent'});
  sousmain.set({fill:'green'});
  for (i=0;i<4;i++){
    imagesCartes[pli[i].couleur+"_"+pli[i].valeur].set({left:360+20*i,top:400,angle:0});
  }
  imagePli=new fabric.Group([
    imagesCartes[pli[0].couleur+"_"+pli[0].valeur],
    imagesCartes[pli[1].couleur+"_"+pli[1].valeur],
    imagesCartes[pli[2].couleur+"_"+pli[2].valeur],
    imagesCartes[pli[3].couleur+"_"+pli[3].valeur],
  ],{originX:'center',originY:'center',hasControls:false,hasBorders:false,});
  canvas.add(imagePli);
  for (i=0;i<4;i++){
    canvas.remove(imagesCartes[pli[i].couleur+"_"+pli[i].valeur]);
  }
  if (no==(noJoueur+1)%4) {imagePli.set({left:200,top:280,angle:90})};
  if (no==(noJoueur+2)%4) {imagePli.set({left:400,top:125})};
  if (no==(noJoueur+3)%4) {imagePli.set({left:600,top:280,angle:90})};
  canvas.renderAll();
});


//Affichage du canvas***************************

//config de l'affichage de la table de jeu
var canvas = new fabric.Canvas('c');
fabric.Object.prototype.objectCaching = false;//Empeche le caching pour l'affichage
canvas.moveCursor = 'pointer';
canvas.hoverCursor = 'pointer';
canvas.selection = false;

//Dessin du fond + noms des joueurs
var sousmain=new fabric.Rect({  width: 800, height: 120, fill: 'green', left: 0, top: 480, evented:false, hoverCursor:'default'});
var soustable=new fabric.Rect({  width: 600, height: 400, fill: 'darkgreen', left: 100, top: 50, evented:false,hoverCursor:'default'});
var jGauche=new fabric.Text("En attente", { left: 50, top: 280, fontSize:16 , evented:false, originX: "center", originY: "center",hoverCursor:'default'});
var jFace=new fabric.Text("En attente", { left: 400, top: 25, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });
var jDroite= new fabric.Text("En attente", { left: 750, top: 280, fontSize:16, evented:false, originX: "center", originY: "center",hoverCursor:'default' });
var imagePli;
canvas.add(jGauche,jFace,jDroite);
canvas.add(sousmain);
canvas.add(soustable);

//Création des sprites cartes
var imagesCartes={};
var buf;
buf = new fabric.Image( document.getElementById('back'), {
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    scaleX:80/169,
    scaleY:80/169,
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
        scaleX:80/169,
        scaleY:80/169,
        hasControls:false,
        hasBorders:false,
        evented:false,
        id:{couleur:couleurs[i],valeur:valeurs[j]},
      });
      imagesCartes[couleurs[i]+"_"+valeurs[j]]=buf;
  }
}

//callback pour ne laisser les cartes que sur sousmain
function zoneSousMain(options){
  if (options.target.top<=500){options.target.top=500;}
  if (options.target.top>=600){options.target.top=600;}
  if (options.target.left<=0){options.target.left=0;}
  if (options.target.left>=800){options.target.left=800;}
}
function zoneJouable(options){
  if (options.target.top<=350){options.target.top=350;}
  if (options.target.top>=600){options.target.top=600;}
  if (options.target.left<=0){options.target.left=0;}
  if (options.target.left>=800){options.target.left=800;}
  if (options.target.top>=350 && options.target.top<=500){
    if (options.target.left<=120){options.target.left=120;}
    if (options.target.left>=680){options.target.left=680;}
    }
}

//Event de mouvements de imagesCartes
for (let i=0;i<couleurs.length;i++) {
 for (j=0;j<valeurs.length;j++){
    imagesCartes[couleurs[i]+"_"+valeurs[j]].on('moving',zoneSousMain);
  }
}

//Event de pose d'une carte
canvas.on('mouse:up',options=>{
  if (options.target){
    if (options.target.id){//on clique sur une carte
      if (options.target.top<=450){
        socket.emit('cartejouee',options.target.id);//on previent le serveur de la carte jouée
        sousmain.set({fill:'transparent'});
        options.target.evented=false;//on ne peut plus bouger la carte jouée
        canvas.forEachObject((object)=>{//on ne peut plus poser de cartes
          object.off('moving',zoneJouable);
          object.on('moving',zoneSousMain);
        });
      }
    } else {//c'est un groupe (imagepli)
      socket.emit('plireleve');
      canvas.remove(imagePli);
      canvas.renderAll();
    }
  }
})

//Afficher la main du joueur en cours
function afficherMain(){
  socket.emit('pingMain', (data)=>{
    main=data;
    for (let i=0;i<main.length;i++){
        var carte=main[i].couleur+"_"+main[i].valeur;
        imagesCartes[carte].set({left:100+i*90,top:540,evented:true});
        canvas.add(imagesCartes[carte]);
      }
  });
}


});
