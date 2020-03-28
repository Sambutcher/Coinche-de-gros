
//init du serveur http et du socket (nécessite d'installer express et socket sur le serveur node)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public')); //sert les fichiers clients dans le dossier "public"

var numUsers=0;//nonmbre dans la salle d'attente
var salle=["","","",""];//salle de jeu
var jeu;
var donne;
var pli;

//***evenements du serveur***

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
    socket.nojoueur = nojoueur;
    salle[nojoueur] = username;
    socket.broadcast.emit('MAJsalle',salle);//on previent les autres
    socket.emit('MAJsalle',salle);
    if (salle[0]!="" && salle[1]!="" && salle[2]!="" && salle[3]!=""){
      jeu = new Jeu();
      donne = new Donne(salle,0);
      jeu.melanger();
      donne.distribuer(jeu);
      io.emit('debutDePartie');
    };
  });

  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    --numUsers;
    salle["joueur"+socket.nojoueur]="";
    socket.broadcast.emit('MAJsalle',salle);
    //TODO: si deconnection en cours de jeu, faire qq chose
  });

  //TODO: gerer la reconnection

  //Envoi la main quand on lui demande
  socket.on('pingMain',(fn)=>{
    fn(donne["main"+socket.nojoueur]);
    console.log("main:",socket.nojoueur,donne["main"+socket.nojoueur]);
  })

  //Un joueur prends
  socket.on('Jeprends',(data)=>{
    donne.contrat=data;
    io.emit('alamain',donne.alamain);//TODO: voir le cas de la générale
    console.log("preneur:",data);
  })

  //Un joueur annule
  socket.on('Jannule',()=>{
    //TODO:on annule la donne
  })

//Un joueur a joué une carte
  socket.on('cartejouee',(carte)=>{
    console.log("carte jouée:",socket.nojoueur,carte);
    socket.broadcast.emit('carteposee',carte,donne.alamain);//on previent les autres qu'une carte a été posée
    //TODO: une carte vient d'être jouée
  })
});


//lancement du serveur sur le port 3000
http.listen(3000, function(){
  //console.log('listening on *:3000');
});

//***Routines du jeu***

//caractéristiques de cartes
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];


//constructeur tas de cartes mélangé et méthode de coupe
function Jeu(){
  var jeu=new Array(); //creation du jeu (liste de cartes)
  //Associer les 32 cartes
  for (let i=0;i<couleurs.length;i++){
    for (let j=0;j<valeurs.length;j++){
      var carte={valeur:valeurs[j], couleur:couleurs[i]};
      jeu.push(carte);
    }
  }
  //Mélanger le jeu
  function melanger(){
    j=this.liste;
    for (let i = j.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [j[i], j[k]] = [j[k], jeu[i]];
    }
    this.liste=j;
  }
  //Couper le jeu
  function couper(){
    j=this.liste;
    const r=Math.floor(Math.random() * 32);
    var res=[];
    for (let i=0;i<j.length;i++){
      res[i]=j[(i+r)%32];
    }
    this.liste=res;
  }

  this.liste=jeu;
  this.melanger=melanger;
  this.couper=couper;

}

//constructeur donne de 4 joueurs et un donneur
function Donne(salle,donneur){
  //Distribuer les cartes aux joueurs
  function distribuer(jeu){
    jeu.couper;
    var j=jeu.liste;
    for (let i=0;i<4;i++){
        this["main"+(this.donneur+i+1)%4].push(j[3*i],j[3*i+1],j[3*i+2]);
        this["main"+(this.donneur+i+1)%4].push(j[3*i+12],j[3*i+13],j[3*i+14]);
        this["main"+(this.donneur+i+1)%4].push(j[2*i+24],j[2*i+25]);
    }
  }
  //faire tourner le donneur
  function tourner(){
    this.donneur=(this.donneur+1)%4;
    this.alamain=(this.donneur+1)%4;
  }
  //Calcul le ramasseur d'un pli -> pour fonction ramasser
  function ramasseur(pli,noOuvreur,contrat){
    const ordreCouleur=["7","8","9","jack","queen","king","10","1"];
    const ordreAtout=["7","8","queen","king","10","1","9","jack"];
    atout=contrat[1];
    couleurDemande=pli[noOuvreur].couleur;
    score=[0,0,0,0];
    for (i=0;i<4;i++){
      switch (atout=="SA"||atout=="TA"){
        case "SA":
          if (pli[i].couleur==couleurDemande){
            score[i]=1+ordreCouleur.indexOf(pli[i].valeur);
          }
        break;
        case "TA":
        if (pli[i].couleur==couleurDemande){
          score[i]=1+ordreAtout.indexOf(pli[i].valeur);
        }
        break;
        default:
          switch (pli[i].couleur){
          case atout:
            score[i]=9+ordreAtout.indexOf(pli[i].valeur);
            break;
          case couleurDemande:
            score[i]=1+ordreCouleur.indexOf(pli[i].valeur);
            break;
        }
      }
    }
    return score.indexOf(Math.max(...score));//retourne l'indice du plus grand
  }
  //ramasser un pli (no de carte de chaque main dans un tableau de 4 indices, on vide la main et on remplit le pli pour le ramasseur)
  function ramasser(tab){
    ram=ramasseur([this.main0[tab[0]],this.main1[tab[1]],this.main2[tab[2]],this.main3[tab[3]]],this.alamain,this.contrat);
    for (i=0;i<4;i++){
      carte=this["main"+i].splice(tab[i],1); //supprime l'élément tab(i) de la main i
      this["plis"+(ram)%2].push(carte[0]); //met l'élément supprimé dans le pli
    }
    this.alamain=ram;
  }
  //définition des propriétés
  this.main0 = [];
  this.main1 = [];
  this.main2 = [];
  this.main3 = [];
  this.plis0 = [];//plis de l'équipe 0/2
  this.plis1 = [];//plis de l'équipe 1/3
  this.contrat = ["","","",-1];//score, couleur, coinche, numéro du preneur
  this.donneur = donneur;
  this.alamain = (donneur+1)%4;
  this.distribuer = distribuer;
  this.tourner = tourner;//donneur suivant
  this.ramasser = ramasser;//prend un tableau avec les 4 indices des cartes jouées
}


//chercher la belote dans la main -> 1 ou 0
function isBelote(main, contrat){
  res=0;
  for (let i=0;i<main.length;i++){
    if ((main[i].couleur==contrat[1])&&(main[i].valeur=='king')){res++};
    if ((main[i].couleur==contrat[1])&&(main[i].valeur=='queen')){res++};
  }
  if (res==2){return 1}else{return 0};
}
