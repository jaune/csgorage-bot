//var ___prodution = true;
var ___prodution = false;

var fs = require('fs');
var Menu = require('menu');
var Tray = require('tray');
var BrowserWindow = require('browser-window');  // Module to create native browser window.

var tray = null;
var app = require('app');  // Module to control application life.

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});


var timeout = null;
var RAFFLES = {};
var NICKNAME = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  tray = new Tray(__dirname+'/favicon_64x64.png');
  tray.setToolTip('CSGORage - BOT');
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
  	width: 1280,
  	height: 720,
    show: !___prodution,
  	'node-integration': false
  });

  mainWindow.loadUrl('http://csgorage.com/free-raffles/current');
  if (!___prodution){
    mainWindow.openDevTools();
  }
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', function () {
  	var url = this.getUrl();

  	if (url.indexOf('steamcommunity.com/openid/login') !== -1) {
  		mainWindow.show();
      clearTimeout(timeout);
      timeout = null;
  	} else if (url === 'http://csgorage.com/free-raffles/current') {
      if (___prodution){
        mainWindow.hide();
      }  		
		  this.executeJavaScript('(function () {'+ fs.readFileSync(__dirname+'/login.bundle.js') +'})()');
      timeout = setTimeout(function () {
        mainWindow.loadUrl('http://csgorage.com/free-raffles/current');
      }, 60 * 1000);
  	}
  });
});

function destroyRaffle(id) {
  closeRaffle(id);
  if (RAFFLES[id]) {
    delete RAFFLES[id];
  }
}

function closeRaffle(id) {
  if (RAFFLES[id]) {
    if (RAFFLES[id]['window']) {
      RAFFLES[id]['window'].close();  
    }    
    RAFFLES[id]['window'] = null;
  }
}

function renderTray() {
  var template =  [
    { label: NICKNAME, icon: __dirname+'/profile.png', },
    { type: 'separator' }
  ];

  Object.keys(RAFFLES).forEach(function(id) {
    var raffle = RAFFLES[id];
    
    var progress = Math.floor((raffle.progressValue / raffle.progressMax) * 100);
    
    var label = raffle.label + ' '+progress+'%';

    if (raffle.slots.length > 0) {
      label = '#'+raffle.slots.join(', #') + ' ' + label;
    }
    

    var icon;

    if (raffle.lock) {
      icon = __dirname+'/lock.png';
    } else {
      if (raffle.ribbon) {
        icon = __dirname+'/checked-yes.png';
      } else {
        icon = __dirname+'/checked-no.png';
      }
    }    

    template.push({ icon: icon, label: label });
  });

  if (Object.keys(RAFFLES).length > 0) {
    template.push({ type: 'separator' });
  }
  
  template.push({
    icon: __dirname+'/exit.png',
    label: 'Exit',
    click: function () {
      app.quit();
    }
  });

  var contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
}

function createRaffle(data) {
  var id = data.raffle;

  console.log('------ createRaffle('+id+') ------');
  
  RAFFLES[id] = data;

  R = RAFFLES[id];
  R.slots = [];
  R.lock = false;
  R['window'] = null;

  requestRaffle(id);
}

function updateRaffle(id, data) {
  console.log('------ updateRaffle('+id+') ------');
  console.log(JSON.stringify(data));

  var R = RAFFLES[id];

  Object.keys(data).forEach(function (key) {
    R[key] = data[key];
  });

  if (!R.lock && !R.ribbon) {
    requestRaffle(id); 
  }
  
}

function requestRaffle(id) {
  if (RAFFLES[id]['window']) {
    return;
  }

  console.log('------ requestRaffle('+id+') ------');

  var win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: !___prodution,
    'node-integration': false
  });

  RAFFLES[id]['window'] = win;

  var url = 'http://csgorage.com'+RAFFLES[id].href;

  win.loadUrl(url);

  win.on('closed', function() {
    if (RAFFLES[id]) {
      RAFFLES[id]['window'] = null;
    } 
    win = null;     
  });

  win.webContents.on('did-finish-load', function () {
    this.executeJavaScript('(function () {'+ fs.readFileSync(__dirname+'/raffle.bundle.js') +'})()');
  });
}

var io = require('socket.io')();
io.on('connection', function(socket){

	socket.on('raffles', function (payload) {
    NICKNAME = payload.nickname;

    payload.raffles.forEach(function(raffle) {
      var R = RAFFLES[raffle.raffle];
      if (!R) {
        createRaffle(raffle);
      } else {
        updateRaffle(raffle.raffle, raffle);
      }     
    });

    Object.keys(RAFFLES).forEach(function (id) {
      var test = false;

      payload.raffles.forEach(function (raffle) {
        test = test || (raffle.raffle == id);
      });

      if (!test) {
        destroyRaffle(id);
      }
    });

    renderTray();
	});

  socket.on('raffle update', function (payload) {
    closeRaffle(payload.raffle);
    updateRaffle(payload.raffle, payload);
    renderTray();
  });

  socket.on('raffle error', function (payload) {
    closeRaffle(payload.raffle);
    console.log('-----------------ERROR 224-------------------');
  });

	socket.on('raffle register', function (payload) {
    closeRaffle(payload.raffle);

    console.log('-----------------raffle register-------------------');
    
    if (payload.error) {
      console.log('-----------------ERROR 231-------------------');
      console.log(payload.error);
      return;
    }

    var R = RAFFLES[payload.raffle];

    updateRaffle(payload.raffle, {
      ribbon: true,
      slots: payload.slots
    });

		tray.displayBalloon({
			title: 'CSGORage - BOT',
			content: 'Raffle '+R.label+' #'+payload.raffle+'\nslots: #'+payload.slots.join(', #')
		});

    renderTray();
	});

});
io.listen(3000);


// document.body.scrollTop = document.body.scrollHeight