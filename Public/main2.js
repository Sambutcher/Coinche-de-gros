window.addEventListener('load',()=>{

var $loginPage = document.getElementById('loginpage'); // The login page
var $closePage = document.getElementById('closepage'); // The close page
var $mainPage = document.getElementById('mainpage');// The main page
var $annoncesPage = document.getElementById('annoncespage');// The main page
const couleurs=["spade","heart","diamond","club"];
const valeurs=["1","king","queen","jack","10","9","8","7"];
var nojoueur=1;//numéro de joueur
var main=[{couleur:'spade',valeur:'1'},{couleur:'heart',valeur:'king'}];//main du joueur


    $loginPage.style.display="none";
    $mainPage.style.display="block";


    //config de l'affichage de la table de jeu
    var canvas = new fabric.Canvas('c');
    fabric.Object.prototype.objectCaching = false;//Empeche le caching pour l'affichage
    canvas.moveCursor = 'pointer';
    canvas.hoverCursor = 'pointer';
    canvas.selection = false;
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



//Lancement de la partie

    for (let i=0;i<main.length;i++){
        var carte=main[i].couleur+"_"+main[i].valeur;
        imagesCartes[carte].set({left:100+i*90,top:540,evented:true,id:i});
        canvas.add(imagesCartes[carte]);
      }

var pli=[{couleur:'spade',valeur:'queen'},{couleur:'club',valeur:'king'},{couleur:'heart',valeur:'jack'},{couleur:'spade',valeur:'7'}];
imagesCartes['spade_queen'].set({left:400,top:400,angle:00});
imagesCartes['club_king'].set({left:200,top:280,angle:90});
imagesCartes['heart_jack'].set({left:400,top:125});
imagesCartes['spade_7'].set({left:600,top:280,angle:90});
canvas.add(imagesCartes['spade_queen']);
canvas.add(imagesCartes['club_king']);
canvas.add(imagesCartes['heart_jack']);
canvas.add(imagesCartes['spade_7']);

//imageCarte.animate({left:360,top:200,angle:0},{duration: 1000, onChange: canvas.renderAll.bind(canvas)});
//imageCarte.animate({left:360,top:200,angle:0},{duration: 1000, onChange:canvas.renderAll()});
no=2;
/*
imagePli=new fabric.Group([
    imagesCartes[pli[0].couleur+"_"+pli[0].valeur],
    imagesCartes[pli[1].couleur+"_"+pli[1].valeur],
    imagesCartes[pli[2].couleur+"_"+pli[2].valeur],
    imagesCartes[pli[3].couleur+"_"+pli[3].valeur],
  ],{originX:'center',originY:'center',hasControls:false,hasBorders:false,});

  if (no==(nojoueur+1)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:200,top:260+(20*i),angle:90},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
  if (no==(nojoueur+2)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:360+(20*i),top:125,angle:0},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
  if (no==(nojoueur+3)%4) {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:600,top:260+(20*i),angle:90},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
*/



  for (i=0;i<4;i++){
    {imagesCartes[pli[i].couleur+"_"+pli[i].valeur].animate({left:360+(20*i),top:300,angle:0},{duration: 1000, onChange: canvas.renderAll.bind(canvas)})};
      }
//  imagePli.animate({left:200,top:280,angle:90},{duration: 2000, onChange: canvas.renderAll.bind(canvas), onComplete:()=>console.log('fini')});

/*
  canvas.add(imagePli);
  for (i=0;i<4;i++){
    canvas.remove(imagesCartes[pli[i].couleur+"_"+pli[i].valeur]);
  }
  if (no==(nojoueur+1)%4) {imagePli.set({left:200,top:280,angle:90})};
  if (no==(nojoueur+2)%4) {imagePli.set({left:400,top:125})};
  if (no==(nojoueur+3)%4) {imagePli.set({left:600,top:280,angle:90})};
  canvas.renderAll();*/
});
