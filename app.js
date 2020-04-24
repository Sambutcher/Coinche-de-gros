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

var game=new Game();

//connections et déconnections
io.on('connection',socket=>{

  function reconnect(){
    if (game.joueurs){
      var id=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
      var no=game.lastJoueurs.map(joueur=>(joueur && joueur.cookie)).indexOf(id);
       if (no!=-1 && game.joueurs[no]==undefined){
         game.joueurs[no]=new Joueur(game.lastJoueurs[no].nom,socket);
         MAJ.mains(game,no);
         (game.phase?game.phase(game):null);
       }
       MAJ.data(game);
    }
  }

  reconnect();

  //Login
  MAJ.data(game);
  socket.once('add user',(nomjoueur,no)=>{
    game.joueurs[no]=new Joueur(nomjoueur,socket);
    MAJ.data(game);
    if (! game.joueurs.includes(undefined)){
    game.start(game);
    }

  })

  //Déconnection
  socket.on('disconnect', () => {
    var id=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
    var nojoueur=game.joueurs.map(joueur=>(joueur && joueur.cookie)).indexOf(id);
    if (nojoueur != (-1)){
      game.lastJoueurs[nojoueur]=game.joueurs[nojoueur];
      game.joueurs[nojoueur]=undefined;
      MAJ.data(game);
    };
  });
})

//fonctions de connection au client
var MAJ={
  //envoie la mise à jour des données au client
   data(g){
    var data={
      'joueurs': g.joueurs.map(joueur=>(joueur && joueur.nom)),
      'scores': g.scores,
      'etoiles': g.etoiles,
      'donneur': g.donneur,
      'preneur':(g.donne && g.donne.preneur),
      'contrat':(g.donne && g.donne.contrat),
      'joueuractif':g.joueuractif,
      'pli':(g.donne && g.donne.pli),
      'ramasseur':(g.donne && g.donne.ramasseur),
      'pointsfaits':(g.donne && g.donne.pointsfaits),
      'phase':(g.phase && g.phase.name),
      'tour':g.tour
    }
    io.emit('MAJdata',data);
  },

  //envoi des mains (d'une seule si nojoueur est spécifié)
  mains(g,nojoueur){

    if (nojoueur!=null){
      g.joueurs[nojoueur].socket.emit('MAJmain',(g.donne? g.donne.mains[nojoueur] : []),nojoueur);
    } else {
      for (let i=0;i<4;i++){g.joueurs[i].socket.emit('MAJmain', g.donne.mains[i])}
    }
  },

  //envoi de toutes les mains
  mainsPosees(g){
    io.emit('MAJmainsposees',g.donne.mains);
  },

//doit recevoir les 4 messages "mess" pour lancer fn. Si les 4 data sont semblables (edit score), on les trasnmets
  onAll(g,mess,fn){
    var i=0;
    var res;//pour comparer les data
    for (j=0;j<g.joueurs.length;j++){
      g.joueurs[j].socket.once(mess,(data)=>{
        console.log('onAll',j,data);
        if (i>=3){
          (res && data && res.toString()==data.toString())?res=data:res=null;
          fn(res);
        } else {
          if (i==0){res=data} else {(res && data && res.toString()==data.toString())?res=data:res=null}
          i++;
        }
      })
    }
  }
}


//**************Objets du jeu***************
//Constructeur du jeu global
function Game(){

   this.start=function(g){
    g.paquet.couper();
    g.donne=new Donne(g.donneur);
    g.donne.distribuer(g.paquet,g.donneur);
    g.joueuractif=1;
    MAJ.mains(g);
    phases.annonces(g);
  }

  //fonctions d'avancée dans le jeu
  var phases={

    annonces(g){
      g.phase=g.phases.annonces;
      MAJ.data(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      g.joueurs.map((joueur)=>{
        joueur.socket.once('Jeprends',()=>{
          g.donne.preneur=g.joueurs.indexOf(joueur);
          g.joueuractif=null;
          g.phases.saisiecontrat(g);
        })
      })
      g.joueurs.map((joueur)=>{
        joueur.socket.once('Redonner',()=>{
          g.joueuractif=null;
          g.phases.redonne(g);
        })
      })
    },

    redonne(g){
      g.phase=g.phases.redonne;
      MAJ.data(g);
      MAJ.mainsPosees(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      MAJ.onAll(g,'donneSuivante',()=>{
        g.donneur=(g.donneur+1)%4;
        g.joueuractif=(g.donneur+1)%4;
        g.paquet=new Paquet();
        g.paquet.couper();
        g.donne=new Donne(g.donneur);
        g.donne.distribuer(g.paquet,g.donneur);
        MAJ.mains(g);
        g.phases.annonces(g);
      });
    },

    saisiecontrat(g){
      g.phase=g.phases.saisiecontrat;
      MAJ.data(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      g.joueurs[g.donne.preneur].socket.once('Jedonnelecontrat',contrat=>{
        g.donne.contrat=contrat;
        g.joueuractif=(g.donne.contrat.valeur=='Générale' ? g.donne.preneur : (g.donneur+1)%4)
        g.donne.isBelote();
        g.phases.jouerpli(g);
      })
    },

    jouerpli(g){
      g.phase=g.phases.jouerpli;
      MAJ.data(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      g.joueurs[g.joueuractif].socket.once('cartejouee',carte=>{
        g.donne.pli[g.joueuractif]=carte;
        var indice=-1;
        var main=g.donne.mains[g.joueuractif]
        for (let i=0;i<main.length;i++){
          if (main[i].valeur==carte.valeur && main[i].couleur==carte.couleur){indice=i}
        }
        g.donne.mains[g.joueuractif].splice(indice,1);
        g.tour++;
        if (g.tour%4==0){
          g.donne.ramassepli();
          g.joueuractif=g.donne.ramasseur;
          g.phases.findepli(g);
        } else {
        g.joueuractif=(g.joueuractif+1)%4;
        g.phases.jouerpli(g);
        }
      })
    },

    findepli(g){
      g.phase=g.phases.findepli;
      MAJ.data(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      g.joueurs[g.joueuractif].socket.once('plireleve',()=>{
        if (g.tour==32){
          g.tour=0;
          g.donne.pli=Array(4);
          var resultat=g.donne.MAJcomptes();
          g.scores[0]+=resultat[0];
          g.scores[1]+=resultat[1];
          var etoile=g.donne.isEtoile();
          g.etoiles[0]+=etoile[0];
          g.etoiles[1]+=etoile[1];
          g.joueuractif=null;
          g.phases.findedonne(g);
        } else {
          g.donne.pli=Array(4);
          g.phases.jouerpli(g);
        }
      })
    },

    findedonne(g){
      g.phase=g.phases.findedonne;
      MAJ.data(g);
      g.joueurs.map(joueur=>joueur.socket.removeAllListeners());
      MAJ.onAll(g,'donneSuivante',(score)=>{
        if (score && parseInt(score[0]) && parseInt(score[1])) {
          g.scores[0]=parseInt(score[0]);
          g.scores[1]=parseInt(score[1]);
        };

        console.log(g);
        g.donneur=(g.donneur+1)%4;
        g.joueuractif=(g.donneur+1)%4;
        if (g.scores[0]>=1000 || g.scores[1]>=1000) {g.scores=[0,0]};
        g.paquet.cartes=g.donne.plis[0].concat(g.donne.plis[1],g.donne.plis[2],g.donne.plis[3]);
        g.paquet.couper();
        g.donne=new Donne(g.donneur);
        g.donne.distribuer(g.paquet,g.donneur);
        MAJ.mains(g);
        g.phases.annonces(g);
      })
    }
  }

  //données du jeu
  this.tour=0;
  this.joueuractif;
  this.donne;
  this.donneur=0;
  this.scores=[0,0];
  this.etoiles=[0,0];
  this.paquet=new Paquet();
  this.joueurs=Array(4);
  this.lastJoueurs=Array(4);//archive du joueur en cas de déconnection
  this.phase;
  this.phases=phases;
}

//Constructeur du paquet de cartes
function Paquet() {
  //Construction du jeu de carte
  var cartes=new Array();
  var couleurs=["spade","heart","diamond","club"];
  var valeurs=["1","king","queen","jack","10","9","8","7"];
  //Associer les 32 cartes
  for (let i=0;i<couleurs.length;i++){
    for (let j=0;j<valeurs.length;j++){
      var carte={valeur:valeurs[j], couleur:couleurs[i]};
      cartes.push(carte);
    }
  }

  //Mélanger
  for (let i = cartes.length - 1; i > 0; i--) {
    let k = Math.floor(Math.random() * (i + 1));
    [cartes[i], cartes[k]] = [cartes[k], cartes[i]];
  }

  //Fonction de coupe du jeu
  function couper(){
    const r=Math.floor(Math.random() * 32);
    var res=new Array();
    for (let i=0;i<this.cartes.length;i++){
      res[i]=this.cartes[(i+r)%32];
    }
    this.cartes=res;
  }

  this.cartes=cartes;
  this.couper=couper;
}

//Constructeur des joueurs
function Joueur(nomjoueur,socket){
  this.nom=nomjoueur;
  this.socket=socket;
  this.cookie=cookie.parse(socket.handshake.headers.cookie)['connect.sid'];
}

//constructeur donne de 4 joueurs et un donneur
function Donne(donneur){
  //Distribuer les cartes aux joueurs
  function distribuer(paquet,donneur){
    paquet.couper;
    var j=paquet.cartes;
    for (let i=0;i<4;i++){
        this.mains[(donneur+i+1)%4].push(j[3*i],j[3*i+1],j[3*i+2],j[3*i+12],j[3*i+13],j[3*i+14],j[2*i+24],j[2*i+25]);
    }
  }

  //Calcul le ramasseur d'un pli -> pour fonction ramasser
  function calculramasseur(pli,contrat,ramasseur){
    var noOuvreur=ramasseur;
    const ordreCouleur=["7","8","9","jack","queen","king","10","1"];
    const ordreAtout=["7","8","queen","king","10","1","9","jack"];
    atout=contrat.couleur;
    couleurDemande=pli[noOuvreur].couleur;
    score=[0,0,0,0];
    for (let i=0;i<4;i++){
      switch (atout){
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
        break;
      }
    }
    return score.indexOf(Math.max(...score));//retourne l'indice du plus grand
  }

  //ramasser un pli (no de carte de chaque main dans un tableau de 4 indices,  on remplit le pli pour le ramasseur)
  function ramassepli(){
    this.ramasseur=calculramasseur(this.pli,this.contrat,this.ramasseur);
    this.plis[this.ramasseur]=this.plis[this.ramasseur].concat(this.pli);
  }

  //chercher la belote et mettre à jour le compte
  function isBelote(){
    if (this.contrat.valeur=='Capot'||this.contrat.valeur=='Générale'){return};//pas de belote sur capots et générale
    for (let j=0;j<4;j=j+2){
      var res=0;
      var main=this.mains[((this.preneur+j) %4)];//main du preneur puis de son equipier
      for (let i=0;i<main.length;i++){
        if ((main[i].couleur==this.contrat.couleur)&&(main[i].valeur=='king')){res++};
        if ((main[i].couleur==this.contrat.couleur)&&(main[i].valeur=='queen')){res++};
      }
      this.flagbelote=(this.flagbelote||res==2);
    }
  }


  function compte(tab,contrat){
      res=0;
      for (let i=0;i<tab.length;i++){
        carte=tab[i];
        switch(carte.valeur){
          case "jack":
          if ((contrat.couleur=="TA")||(carte.couleur==contrat.couleur)){
            res+=20;
          } else {
            res+=2;
          }
          break;
          case "9":
          if ((contrat.couleur=="TA")||(carte.couleur==contrat.couleur)){
            res+=14;
          }
          break;
          case "1":
          res+=11;
          break;
          case "10":
          res+=10;
          break;
          case "king":
          res+=4;
          break;
          case "queen":
          res+=3;
          break;
        }
      }
      return res;
  }

  //chercher si il y a une etoile et renvoi [n,m]
  function isEtoile(){
    var res=[0,0];
    //on cherche la générale non annoncée
    for (let i=0;i<4;i++){
      if (this.plis[i].length==32){//le joueur i a || le joueur i  a fait une générale
        if (this.contrat.valeur!='Générale' || this.preneur!=i){//le joueur i n'a pas annoncé une générale ou n'est pas le preneur
            res[i%2]=1;
        }
      }
    }

    //on cherche le capot non annoncé de l'équipe 0
    if (this.plis[0].length +this.plis[2].length==32){//l'équipe 0 a fait un capot
      if ((this.contrat.valeur!='Générale' && this.contrat.valeur!='Capot')){//le contrat n'est ni une générale ni un capot
          res[0]=1;
        } else if (this.preneur==1 || this.preneur==3){//le preneur n'est pas 0 ni 2
          res[0]=1;
        }
    }

    //on cherche le capot non annoncé de l'équipe 1
    if (this.plis[1].length +this.plis[3].length==32){//l'équipe 0 a fait un capot
      if ((this.contrat.valeur!='Générale' && this.contrat.valeur!='Capot')){//le contrat n'est ni une générale ni un capot
          res[1]=1;
        } else if (this.preneur==0 || this.preneur==2){//le preneur n'est pas 0 ni 2
          res[1]=1;
        }
    }

    return res;
  }

  //met à jour points faits et retourne points à marquer (à mettre dans score)
  function MAJcomptes(){
    //Calcul du compte des plis des attaquants
   var res=0;
   if (this.flagbelote){res+=20}; //on compte la belote
   if ((this.ramasseur%2)==(this.preneur%2)){res+=10};// on compte le 10 de der
   res+=compte(this.plis[this.preneur],this.contrat);
   res+=compte(this.plis[(this.preneur+2)%4],this.contrat);

   //Points à marquer
   var compteur=[0,0];//score de l'équipe qui marque
   switch (this.contrat.valeur){
     case 'Générale':
     if (this.plis[this.preneur].length==32){
       compteur[this.preneur %2]=500;
     } else {
       compteur[(this.preneur+1)%2]=160;
     }
     break;
     case 'Capot':
     if (this.plis[this.preneur].length+this.plis[(this.preneur+2)%4].length==32){
       compteur[this.preneur %2]=250;
     } else {
       compteur[(this.preneur +1)%2]=160;
     }
     break;
     default:
     var valcontrat=parseInt(this.contrat.valeur,10);
     if (res>=valcontrat){
       compteur[this.preneur %2]=valcontrat;
     } else {
       compteur[(this.preneur +1)%2]=160;
     }
     break;
   }
   if (this.contrat.coinche=="Coinché"){compteur=compteur.map(n=>2*n)};
   if (this.contrat.coinche=="Surcoinché"){compteur=compteur.map(n=>4*n)};

   this.pointsfaits=res;
   return compteur;
  }

  //définition des fonctions
  this.distribuer = distribuer;
  this.ramassepli = ramassepli;//prend un tableau avec les 4 indices des cartes jouées
  this.isBelote=isBelote;
  this.compte=compte;
  this.MAJcomptes=MAJcomptes;
  this.isEtoile=isEtoile;


  //Définitions des variables
  this.pli=Array(4);//Pli en cours
  this.preneur;//du contrat
  this.contrat;
  this.plis=[[],[],[],[]];//plis de chaque joueur
  this.flagbelote;
  this.ramasseur = (donneur+1)%4;//Dernier a avoir fait un pli
  this.mains=[new Array(),new Array(),new Array(),new Array()];
  this.pointsfaits=0;
}
