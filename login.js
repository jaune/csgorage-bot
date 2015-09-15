var io = require('socket.io-client');

function main () {
	var login = document.querySelector('.black_background .container .login a');

	if (!login) {
    var nickname = document.querySelector('.black_background .container .logged_in .nickname');
    
    var socket = io.connect('http://localhost:3000');

    socket.emit('raffles', {
      nickname: nickname.textContent.trim(),
      raffles: listRaffles()
    });

		return;
	}

	var e = document.createEvent('MouseEvents');
	e.initEvent('click', true, true);
	login.dispatchEvent(e);
}


function listRaffles () {
  var raffles = [],
      links = document.querySelectorAll('.row .raffle_box_lg a');

  var link, i, l = links.length, ribbon, progress;

  for (i = 0; i < l; ++i) {
    link = links[i];

    ribbon = link.querySelector('.ribbon-blue-mms');
    progress = link.querySelector('.barra > span').textContent;

    var matches = progress.match(/([0-9]*)\/ ([0-9]*)$/);
  
    var href = links[i].getAttribute('href');
    var href_matches = href.match(/([0-9]*)$/)
    var id = parseInt(href_matches[1]);

    raffles.push({
      raffle: id,
      label: link.querySelector('p.gun').textContent.trim(),
      href: href,
      ribbon: !!ribbon,
      progressValue: parseInt(matches[1]),
      progressMax: parseInt(matches[2])
    });
  }
  return raffles;
}

main();