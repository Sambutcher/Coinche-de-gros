//init du serveur http et du socket (nécessite d'installer express et socket sur le serveur node)
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var cookie=require('cookie');

app.use(session);
app.use(express.static(__dirname + '/Public')); //sert les fichiers clients dans le dossier "public

//lancement du serveur sur le port 3000
http.listen(process.env.PORT || 3000);

var table= new Table();
var jeu;//tas de carte
var donne; //suivi de la donne en cours
var pli=[-1,-1,-1,-1];//pli en cours: n0 de carte dans la main du joueur
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];

//***evenements du serveur***

//TODO: reprendre sa carte, regarder le pli précédent, faute de jeu, sur annule et redonne, afficher les cartes

//connection d'un client sur le socket
io.on('connection', function(socket){

/*  //refus au bout du 4ème dans la salle d'attente
  if (table.numUsers>3) {
    socket.emit('Page','close');
    socket.disconnect(true);
  } else {++table.numUsers;};
*/
  //teste si le joueur a refresh
  var indCookie=table.cookies.id.indexOf(cookie.parse(socket.handshake.headers.cookie)['connect.sid']);
  if (indCookie!=-1){
    nojoueur=indCookie;
    socket.nojoueur = nojoueur;
    table.salle[nojoueur] = table.cookies.name[nojoueur];
    table.sockets[nojoueur]=socket;
    table.cookies.id[nojoueur]=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
    io.emit('MAJsalle',table.salle);
    if (donne){
      //recalcul de l'état (main du joueur, qui doit jouer)
      main=donne['main'+nojoueur];
      plis=donne.plis[0].concat(donne.plis[2], donne.plis[1], donne.plis[3]);
      for (let i=0;i<main.length;i++){
        for (let j=0;j<plis.length;j++){
          if (main[i]==plis[j]) {
              main.splice(i,1);
          }
        }
      };
      //Chercher le joueru a jouer dans le pli
      joueur=donne.alamain;
      for (let i=0;i<4;i++){
        if (pli[(joueur+i)%4]==(-1)){
          joueur=(joueur+i)%4;
          break;
        }
      };

      if (pli.every(e=>e!=(-1))) {
        joueur=donne.ramasseur(pli);
        socket.emit('Tourplifait',[donne.main0[pli[0]],donne.main1[pli[1]],donne.main2[pli[2]],donne.main3[pli[3]]],donne.ramasseur(pli));
      };
      socket.emit('Refresh', socket.nojoueur, main, joueur);
    } else {addUser(table.salle[nojoueur],nojoueur)};
  }

  // Quand quelqu'un se déconnecte
  socket.on('disconnect', () => {
    //--table.numUsers;
    if (socket.nojoueur||(socket.nojoueur==0)){
      table.salle[socket.nojoueur]="";
      table.sockets[socket.nojoueur]=undefined;
    };
    socket.broadcast.emit('MAJsalle', table.salle);
  });

  //Etat de la salle à la connection du client
  socket.emit('MAJsalle',table.salle);

  // Inscription d'un joueur dans la salle et lancement de la partie
  socket.on('add user', addUser);

function addUser(username,nojoueur) {
    socket.nojoueur = nojoueur;
    table.salle[nojoueur] = username;
    table.sockets[nojoueur]=socket;
    table.cookies.id[nojoueur]=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
    table.cookies.name[nojoueur]=username;
    io.emit('MAJsalle',table.salle);//on previent tout le monde
    socket.emit('Page','main');
    if (table.salle[0]!="" && table.salle[1]!="" && table.salle[2]!="" && table.salle[3]!=""){//lancement de la partie
      jeu = new Jeu();
      donne = new Donne(0);
      jeu.melanger();
      donne.distribuer(jeu);
      debutDeDonne();
    };
  }

  socket.on('Jeprends',()=>{
    socket.broadcast.emit('Page','main');
  })

  socket.on('Jedonnelecontrat',(data)=>{
    donne.contrat=data;
    if (data[0]=="Générale"){donne.alamain=data[3]};
    io.emit('Touratoi',donne.alamain);
  })

  //le 4ème joueur passe
  socket.on('Redonner',()=>{
    jeu.melanger();
    nouveaudonneur=(donne.donneur+1)%4;
    donne=new Donne(nouveaudonneur);
    donne.distribuer(jeu);
    debutDeDonne();
  })

  //TODO: "j'annule"

  //Un joueur a joué une carte
  socket.on('cartejouee',(carte)=>{
    socket.broadcast.emit('MAJcarteposee',donne['main'+socket.nojoueur][carte],socket.nojoueur);//on previent les autres qu'une carte a été posée
    pli[socket.nojoueur]=carte;
    if (pli.every(e=>e!=(-1))){ //Les 4 cartes sont posées
      io.emit('Tourplifait',[donne.main0[pli[0]],donne.main1[pli[1]],donne.main2[pli[2]],donne.main3[pli[3]]],donne.ramasseur(pli));
    } else {
      io.emit('Touratoi',(socket.nojoueur+1)%4);
    }
  })

  //un joueur a pris le pli
  socket.on('plireleve',()=>{
    socket.broadcast.emit('MAJpliramasse');
    var ramasseur=donne.ramasseur(pli);
    donne.ramasser(pli);
    pli=[-1,-1,-1,-1];
    var nbplis=0;
    for (let i=0;i<4;i++){nbplis+=donne.plis[i].length};
    if (nbplis==32){//fin de donne
      if (ramasseur%2==0){donne.compte[0]+=10} else {donne.compte[1]+=10};//10 de der
      donne.MAJcompte();
      table.finDeDonne(donne);
      io.emit('MAJscores',donne.contrat, donne.compte,table.points);
      io.emit('Page','score');
    } else {
      io.emit('Touratoi',donne.alamain);
    }
  })

  //un joueur a validé la donne Suivante
  socket.on('donneSuivante',()=>{
    table.flagDonneSuivante++;
    if (table.flagDonneSuivante==4){
      if (table.points[0]>=1000 || table.points[1]>=1000) {table.points=[0,0];}
      jeu.liste=donne.plis[0].concat(donne.plis[2], donne.plis[1], donne.plis[3]);//on refait le jeu
      jeu.couper();
      nouveaudonneur=(donne.donneur+1)%4;
      donne=new Donne(nouveaudonneur);
      donne.distribuer(jeu);
      debutDeDonne();
    }
  })

});



//*****fonctions du jeu

function debutDeDonne(){
  for (let i=0;i<4; i++){
    table.sockets[i].emit('Tourdebut',donne.donneur,donne['main'+i]);
  }
}

//***Déinition des objets du jeu***

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
        let k = Math.floor(Math.random() * (i + 1));
        [j[i], j[k]] = [j[k], j[i]];
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
function Donne(donneur){
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
  //Calcul le ramasseur d'un pli -> pour fonction ramasser
  function ramasseur(pli){
    var noOuvreur=this.alamain;
    var contrat=this.contrat;
    var tab=[this.main0[pli[0]],this.main1[pli[1]],this.main2[pli[2]],this.main3[pli[3]]];
    const ordreCouleur=["7","8","9","jack","queen","king","10","1"];
    const ordreAtout=["7","8","queen","king","10","1","9","jack"];
    atout=contrat[1];
    couleurDemande=tab[noOuvreur].couleur;
    score=[0,0,0,0];
    for (let i=0;i<4;i++){
      switch (atout){
        case "SA":
          if (tab[i].couleur==couleurDemande){
            score[i]=1+ordreCouleur.indexOf(tab[i].valeur);
          }
        break;
        case "TA":
        if (tab[i].couleur==couleurDemande){
          score[i]=1+ordreAtout.indexOf(tab[i].valeur);
        }
        break;
        default:
          switch (tab[i].couleur){
          case atout:
            score[i]=9+ordreAtout.indexOf(tab[i].valeur);
            break;
          case couleurDemande:
            score[i]=1+ordreCouleur.indexOf(tab[i].valeur);
            break;
          }
        break;
      }
    }
    return score.indexOf(Math.max(...score));//retourne l'indice du plus grand
  }
  //ramasser un pli (no de carte de chaque main dans un tableau de 4 indices,  on remplit le pli pour le ramasseur)
  function ramasser(pli){
    ram=this.ramasseur(pli);
    for (let i=0;i<4;i++){
      this.plis[ram].push(this['main'+i][pli[i]]); //range le pli
    }
    this.alamain=ram;//on donne la main au preneur
  }
  //chercher la belote et mettre à jour le compte
  function isBelote(){
    if (this.contrat[0]=='Capot'||this.contrat[0]=='Générale'){return};//pas de belote sur capots et générale
    for (let j=0;j<4;j=j+2){
      var res=0;
      var main=this['main'+((this.contrat[3]+j) %4)];//main du preneur puis de son equipier
      for (let i=0;i<main.length;i++){
        if ((main[i].couleur==this.contrat[1])&&(main[i].valeur=='king')){res++};
        if ((main[i].couleur==this.contrat[1])&&(main[i].valeur=='queen')){res++};
      }
      if (res==2){this.compte[(this.contrat[3])%2]+=20};
    }
  }

  //compte les points des plis
  function MAJcompte(){
   this.isBelote();//on compte la belote
    for (let i=0;i<4;i++){
      for (let j=0;j<this.plis[i].length;j++){
        carte=this.plis[i][j];
        switch(carte.valeur){
          case "jack":
          if ((this.contrat[1]=="TA")||(carte.couleur==this.contrat[1])){
            this.compte[i%2]+=20;
          } else {
            this.compte[i%2]+=2;
          }
          break;
          case "9":
          if ((this.contrat[1]=="TA")||(carte.couleur==this.contrat[1])){
            this.compte[i%2]+=14;
          }
          break;
          case "1":
          this.compte[i%2]+=11;
          break;
          case "10":
          this.compte[i%2]+=10;
          break;
          case "king":
          this.compte[i%2]+=4;
          break;
          case "queen":
          this.compte[i%2]+=3;
          break;
        }
      }
    }
  }
  //définition des propriétés
  this.main0 = [];
  this.main1 = [];
  this.main2 = [];
  this.main3 = [];
  this.plis=[[],[],[],[]];//plis de chaque joueur
  this.compte=[0,0];//comptes des équipes
  this.isBelote=isBelote;
  this.contrat = ["","","",-1];//score, couleur, coinche, numéro du preneur
  this.donneur = donneur;
  this.alamain = (donneur+1)%4;//dans le pli en cours
  this.distribuer = distribuer;
  this.ramasseur = ramasseur;
  this.ramasser = ramasser;//prend un tableau avec les 4 indices des cartes jouées
  this.MAJcompte=MAJcompte;
}

//constructeur de l'objet Table qui gère tous les joueurs
function Table (){
  function finDeDonne(donne){
    //Comparons le contrat et le score
    var compteur=[0,0];//score de l'équipe qui marque
    switch (donne.contrat[0]){
      case 'Générale':
      if (donne.plis[donne.contrat[3]].length==32){
        compteur[donne.contrat[3]%2]=500;
      } else {
        compteur[(donne.contrat[3]+1)%2]=160;
      }
      break;
      case 'Capot':
      if (donne.plis[donne.contrat[3]].length+donne.plis[(donne.contrat[3]+2)%4].length==32){
        compteur[donne.contrat[3]%2]=250;
      } else {
        compteur[(donne.contrat[3]+1)%2]=160;
      }
      break;
      default:
      var valcontrat=parseInt(donne.contrat[0],10);
      if (donne.compte[donne.contrat[3]%2]>=valcontrat){
        compteur[donne.contrat[3]%2]=valcontrat;
      } else {
        compteur[(donne.contrat[3]+1)%2]=160;
      }
      break;
    }
    if (donne.contrat[2]=="Coinché"){compteur=compteur.map(n=>2*n)};
    if (donne.contrat[2]=="Surcoinché"){compteur=compteur.map(n=>4*n)};
    this.points[0]+=compteur[0];
    this.points[1]+=compteur[1];
    this.flagDonneSuivante=0;
  }

  //this.numUsers=0;//nombre de personne qui ouvrent un socket
  this.salle=["","","",""];//nom des joueurs
  this.sockets=[,,,];//sockets des joueurs
  this.cookies={'id':[,,,],'name':[,,,]};//cookie des joueurs et nom associé
  this.points=[0,0];//suivi des totaux
  this.flagDonneSuivante=0;//pour savoir si tout le monde est ok pour passer à la donne suivante
  this.finDeDonne=finDeDonne;//met à jour les scores et le flag
}
