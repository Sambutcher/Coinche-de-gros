var $window = $(window);

var $loginPage = $('#loginpage'); // The login page
var $closePage = $('#closepage'); // The close page
var $mainPage = $('#mainpage');// The main page


// Prompt for setting a username
var noJoueur;

var socket = io();//connection au socket

// Sets the client's username
const setUsername = () => {

  //nettoie le text de l'input
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  username = cleanInput($('#joueur'+noJoueur).val().trim());

  //Si le username est ok on l'envoie avec le numéro au serveur et on entre dans la salle
  if (username) {
    $loginPage.hide();
    $mainPage.show();
    socket.emit('add user', username, noJoueur);
  }
}


//Evenements Click sur un bouton de login pour entrer dans la salle
for (let i=1;i<5;i++){
$('#Entrer'+i).click(()=>{
  noJoueur=i;
  setUsername();
})}


//evenements du socket//

//Si Salle pleine, changer de page (le socket est déconnecté par le serveur)
socket.on('sallePleine',()=>{
  $loginPage.hide();
  $closePage.show();
})

//Met à jour la salle d'attente quand le serveur demande
socket.on('MAJsalle',(salle)=>{
  for (let i=0;i<4;i++){
    $('#joueur'+(i+1)).val(salle[i]);
    if (salle[i]!="") { $('#Entrer'+(i+1)).hide();
    } else { $('#Entrer'+(i+1)).show();
    }
  }
})
