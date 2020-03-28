window.addEventListener('load',()=>{


var $mainPage = document.getElementById('mainpage');// The main page
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];
var noJoueur=0;//numéro de joueur
var main=[{Couleur:'spade',Valeur:'1'},{Couleur:'heart',Valeur:'king'}];//main du joueur
var table;//table en cours

document.getElementById('annoncespage').style.display="none";
document.getElementById('Jannule').addEventListener('click',()=>{
  document.getElementById('form').reset();
})

document.getElementById('Jeprends').addEventListener('click',()=>{
  console.log(document.getElementById('valeurcontrat').value);
})

//config de l'affichage de la table de jeu
var canvas = new fabric.Canvas('c');
fabric.Object.prototype.objectCaching = false;//Empeche le caching pour l'affichage
canvas.moveCursor='pointer';
canvas.hoverCursor = 'pointer';
canvas.selection = false;

//Dessin du fond + noms des joueurs
var sousmain=new fabric.Rect({  width: 800, height: 120, fill: 'green', left: 0, top: 480, selectable:false, hoverCursor:'default'});
var soustable=new fabric.Rect({  width: 600, height: 400, fill: 'darkgreen', left: 100, top: 50, selectable:false,hoverCursor:'default'});
var jGauche=new fabric.Text("En attente", { left: 50, top: 280, fontSize:16 , selectable:false, originX: "center", originY: "center",hoverCursor:'default'});
var jFace=new fabric.Text("En attente", { left: 400, top: 25, fontSize:16, selectable:false, originX: "center", originY: "center",hoverCursor:'default' });
var jDroite= new fabric.Text("En attente", { left: 750, top: 280, fontSize:16, selectable:false, originX: "center", originY: "center",hoverCursor:'default' });
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
      selectable:false,
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


//Afficher la main du joueur en cours
function afficherMain(){

      for (let i=0;i<main.length;i++){
          var carte=main[i].Couleur+"_"+main[i].Valeur;
          imagesCartes[carte].set({left:100+i*90,top:540,selectable:true});
          canvas.add(imagesCartes[carte]);
        }
  }

afficherMain();

canvas.forEachObject(object=>{
  object.off('moving',zoneSousMain);
  object.on('moving',zoneJouable);
});

/*//Event de pose d'une carte
for (let i=0;i<couleurs.length;i++) {
 for (j=0;j<valeurs.length;j++){
    imagesCartes[couleurs[i]+"_"+valeurs[j]].on('modified',(options)=>{

      if (options.target.top<=450){
        //imagesCartes["spade_1"].selectable=false;
        //socket.emit('cartejouee',options.target.id);//on previent le serveur de la carte jouée
        options.target.selectable=false;//on ne peut plus bouger la carte jouée//TODO: ca ne marche pas!
        canvas.forEachObject((object)=>{//on ne peut plus poser de cartes
          object.off('moving',zoneJouable);
          object.on('moving',zoneSousMain);
        });
      }
    });
  }
}*/


//imagesCartes["spade_1"]


canvas.on('mouse:up',options=>{
  if (options.target){
    if (options.target.id && (options.target.top<=450)){
    options.target.set({evented:false});
    console.log(options.target.selectable);
    }
  }
})


})
