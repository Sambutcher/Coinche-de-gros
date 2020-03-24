
//init du serveur http et du socket (nécessite d'installer express et socket sur le serveur node)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

var numUsers=0;//nonmbre dans la salle d'attente
var salle=["","","",""];//salle de jeu

//connection d'un client sur le socket
io.on('connection', function(socket){

  //refus au bout du 4ème dans la salle d'attente
  if (numUsers>3) {
    socket.emit('sallePleine');
    socket.disconnect(true);
  } else {++numUsers;};

  //Etat de la salle à la connection du client
  socket.emit('MAJsalle',salle);

  // Inscription d'un joueur dans la salle
  socket.on('add user', (username,nojoueur) => {
    socket.username = username; // sotckage du nom du client
    socket.nojoueur=nojoueur;
    salle[nojoueur-1]=username;
    socket.broadcast.emit('MAJsalle',salle);//on previent les autres
  });

  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    --numUsers;
    salle[salle.indexOf(socket.username)]="";
    socket.broadcast.emit('MAJsalle',salle);
  });

  //Envoi la main quand on lui demande
  socket.on('pingMain',(fn)=>{
    fn(table["joueur"+socket.nojoueur].main);
  })
});


//lancement du serveur sur le port 3000
http.listen(3000, function(){
  console.log('listening on *:3000');
});

//Routine du jeu

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



var jeu=new Jeu();//on bat les cartes
var table=new Table("Filou","Cochonou","Shokooh","Sam");//TODO: mettre les joueurs connectés
table.distribuer(jeu);
