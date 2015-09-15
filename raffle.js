var io = require('socket.io-client');
var socket = io.connect('http://localhost:3000');

var token = document.querySelector('.tok span').textContent;
var rid = document.querySelector('#r_title').getAttribute('rid');
var lastSlot = parseInt(document.querySelector('#slotsloading').getAttribute('last'));

var tradeinError = document.querySelector('#slots .tradein_error');

function queryRegisterSlots() {
	var slots = [];
	var registerSlots = document.querySelector('.skin_info > .available > .info_sm');

	if (registerSlots) {
		var parts = registerSlots.textContent.split(',');

		parts.forEach(function (part) {
			var matches = part.match(/([0-9]*)$/);
			var slot = parseInt(matches[1]);
		
			if (slot) {
				slots.push(slot);
			}
		});
	}	

	return slots;
}

function requestFirstFreeSlot(next) {
	$.ajax({
		url:"/slots",
		type:"POST",
		dataType:"json",
		data: {
			rid:rid,
			last:lastSlot,
			_token:token
		},
		success: function (s) {
			if (Object.keys(s).length == 240) {
				lastSlot += 240;
				requestFirstFreeSlot(next);
			} else {

				for (var i = 1; i < 240; ++i) {
					if (!s.hasOwnProperty(lastSlot + i)) {
						next(null, lastSlot + i);
						return;
					}
				}
				
				next('no slot left.');
			}
		},
		error: function () {
			next('some error');
		}
	});
}

function registerSlot(slots, next) {
	// console.log('registerSlot', slots);
	$.ajax({
		url:"/getslotfree",
		type:"POST",
		dataType:"json",
		data: {
			rid:rid,
			slots:slots,
			_token:token
		},
		success:function(e){
			if (e.r) {
				next(null, slots);
				return;
			}
			switch (e.c) {
				case 1: return next("Sorry, you don`t have enough credits.");
				case 2: return next("Sorry, slots already taken.");
				case 5: return next("Raffle ended.");
				case 6: return next("Invalid slots.");
				default: return next("some error !!!");
			}
		},
		error:function() {
			console.log("Sorry, server error, please try again.")
		}
	});
}


function registerCandidateSlot() {
	function onRaffleDone(error, slots) {
		socket.emit('raffle register', {
			raffle: rid,
			error: error,
			slots: slots
		});
	}

	var candidate = document.querySelector('#slots > .slots[sid]');
	if (candidate) {
		registerSlot([parseInt(candidate.getAttribute('sid'))], onRaffleDone);
	} else {
		requestFirstFreeSlot(function (error, sid) {
			if (error) {
				console.log(error);
				return;
			}
			registerSlot([sid], onRaffleDone);
		});
	}
}

(function () {

if (tradeinError) {
	socket.emit('raffle update', {
		raffle: rid,
		lock: true
	});
} else {
	var slots = queryRegisterSlots();

	if (slots.length === 0) {
		registerCandidateSlot();
	} else {
		socket.emit('raffle update', {
			raffle: rid,
			slots: slots
		});
	}
}

})();