//caractéristiques de cartes
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];

//constructeur tas de cartes mélangé et méthode de coupe
function Jeu(){
  var jeu=new Array(); //creation du jeu (liste de cartes)
//Associer les 32 cartes
  for (let i=0;i<couleurs.length;i++){
    for (let j=0;j<valeurs.length;j++){
      var carte={Valeur:valeurs[j], Couleur:couleurs[i]};
      jeu.push(carte);
    }
  }
    //Mélanger le jeu
    for (let i = jeu.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [jeu[i], jeu[j]] = [jeu[j], jeu[i]];
    }

    //Couper le jeu
    function couperJeu(j){
      const r=Math.floor(Math.random() * 32);
      var res=[];
      for (let i=0;i<j.length;i++){
        res[i]=j[(i+r)%32];
      }
      return res;
    }

  this.liste=jeu;
  this.couperJeu=couperJeu(this.liste);

}

//constructeur joueur (avec un nom et une main)
function Joueur(prenom){
  this.nom=prenom;
  this.main=[];
}

//construcuteur Table de 4 joueurs et un donneur
function Table(nom1,nom2,nom3,nom4){

  //Distribuer les cartes aux joueurs
  function distribuer(jj){
    jj.couperJeu;
    var j=jj.liste;
    for (let i=0;i<4;i++){
        this["joueur"+(this.donneur+i+1)%4].main.push(j[3*i],j[3*i+1],j[3*i+2]);
        this["joueur"+(this.donneur+i+1)%4].main.push(j[3*i+12],j[3*i+13],j[3*i+14]);
        this["joueur"+(this.donneur+i+1)%4].main.push(j[2*i+24],j[2*i+25]);
    }

  }

  function tourner(){
    this.donneur=(this.donneur+1)%4;
  }

  this.joueur0= new Joueur(nom1);
  this.joueur1= new Joueur(nom2);
  this.joueur2= new Joueur(nom3);
  this.joueur3= new Joueur(nom4);
  this.donneur= 0;
  this.distribuer=distribuer;
  this.tourner=tourner;
}


//constructeur d'une donne. Elle est composé des plis qui vident les mains de la table avec un donneur fixé
function Donne(donneur){

  function ramasser(joueur){
    this["plisFaitsJ"+joueur].push(this.pliEnCours);
    this.pliEnCours=[];
    this.joueurActif=joueur;//donne la main à celui qui ramasse
  }

  this.pliEnCours=[];
  this.plisFaitsJ0=[];
  this.plisFaitsJ1=[];
  this.plisFaitsJ2=[];
  this.plisFaitsJ3=[];
  this.joueurActif=(donneur+1)%4;
  this.ramasser=ramasser;
}

var jeu=new Jeu();
var table=new Table("Filou","Cochonou","Shokooh","Sam");

function afficher(){
  for (let noJoueur=0;noJoueur<4;noJoueur++){
    var affiche=table['joueur'+noJoueur].nom+"<BR>";//affihce le nom du joueur
    var main=table["joueur"+noJoueur].main;
    //affiche la main du joueur
    for (let i=0;i<main.length;i++){
      affiche=affiche+'<img src="/img/'+main[i].Couleur+'_'+main[i].Valeur+'.png" class="carte" onclick="jouerCarte('+i+')"/>';
    }
    document.getElementById('joueur'+noJoueur).innerHTML=affiche;
  }

  //affiche le pli en cours
  for (let i=0;i<donne.pliEnCours.length;i++){
    var carte=donne.pliEnCours[i];
    var affiche='<img src="/img/'+carte.Couleur+'_'+carte.Valeur+'.png" class="carte"/>';
    document.getElementById('devantJ'+((donne.joueurActif-donne.pliEnCours.length+i+4)%4)).innerHTML=affiche;
  }
  document.getElementById('joueur'+(donne.joueurActif+3)%4).style.backgroundColor="";
  document.getElementById('joueur'+donne.joueurActif).style.backgroundColor="Blue";

}

table.distribuer(jeu);

var donne=new Donne(table.donneur);

//jeu d'une carte, modification de la donne et de la table
function jouerCarte(noCarte){
  donne.pliEnCours.push(table["joueur"+donne.joueurActif].main[noCarte]);//met la carte dans le pli
  table["joueur"+donne.joueurActif].main.splice(noCarte,1);//retire la carte de la main
  donne.joueurActif=(donne.joueurActif+1)%4;
  afficher();
}

afficher();
