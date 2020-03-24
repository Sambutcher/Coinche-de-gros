window.addEventListener('load',()=>{

var $loginPage = document.getElementById('loginpage'); // The login page
var $closePage = document.getElementById('closepage'); // The close page
var $mainPage = document.getElementById('mainpage');// The main page

const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];

var noJoueur;//numéro de joueur
var main;//main du joueur

var socket = io();//connection au socket

// Sets the client's username
const setUsername = () => {

  username = document.getElementById('joueur'+noJoueur).value;
    $loginPage.style.display="none";
    $mainPage.style.display="block";
    socket.emit('add user', username, noJoueur);

}
//DEBUG: pour inscrire un joueur
noJoueur=2;
setUsername();

//Evenements Click sur un bouton de login pour entrer dans la salle
for (let i=1;i<5;i++){
  document.getElementById('Entrer'+i).addEventListener('click',()=>{
    noJoueur=i;
    setUsername();
  }
)}


//evenements du socket//

//Si Salle pleine, changer de page (le socket est déconnecté par le serveur)
socket.on('sallePleine',()=>{
  $loginPage.style.display="none";
  $closePage.style.display="block";
})

//Met à jour la salle d'attente quand le serveur demande
socket.on('MAJsalle',(salle)=>{
  for (let i=0;i<4;i++){
    document.getElementById('joueur'+(i+1)).value=salle[i];
    if (salle[i]!="") { document.getElementById('Entrer'+(i+1)).style.display="none";
  } else { document.getElementById('Entrer'+(i+1)).style.display='block';
    }
  }
})

//DEBUG: entrée direte dans la salle pour gagner le login
$loginPage.style.display="none";
$mainPage.style.display='block';

//init de l'affichage de la table de jeu
var canvas = new fabric.Canvas('c');
canvas.moveCursor='pointer';
canvas.hoverCursor = 'pointer';

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
        selectable:true,
      });
      imagesCartes[couleurs[i]+"_"+valeurs[j]]=buf;
  }
}


var main;//=[{Valeur:"1",Couleur:"heart"},{Valeur:"king",Couleur:"spade"}]//a mettre à jour

//Afficher la main du joueur en cours
function afficherMain(){
    var sousmain=new fabric.Rect({  width: 800, height: 120, fill: 'green', left: 0, top: 480,selectable:false});
    var soustable=new fabric.Rect({  width: 600, height: 400, fill: 'darkgreen', left: 100, top: 50,selectable:false});
    canvas.add(sousmain);
    canvas.add(soustable);
    socket.emit('pingMain', (data)=>{
      main=data;
      for (let i=0;i<main.length;i++){
          var imagecarte=imagesCartes[main[i].Couleur+"_"+main[i].Valeur];
          imagecarte.set({left:100+i*90,top:540});
          canvas.add(imagecarte);
        }
    });

  }

  afficherMain();

})
