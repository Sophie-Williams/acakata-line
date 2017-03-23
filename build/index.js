'use strict';

var _rooms = require('./rooms');

var _rooms2 = _interopRequireDefault(_rooms);

var _questions = require('./questions');

var _questions2 = _interopRequireDefault(_questions);

var _firebaseAdmin = require('firebase-admin');

var _firebaseAdmin2 = _interopRequireDefault(_firebaseAdmin);

var _reducers = require('./reducers');

var _reducers2 = _interopRequireDefault(_reducers);

var _redux = require('redux');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var serviceAccount = require("./firebase");
_firebaseAdmin2.default.initializeApp({
  credential: _firebaseAdmin2.default.credential.cert(serviceAccount),
  databaseURL: "https://acakkata-12bf7.firebaseio.com"
});
var database = _firebaseAdmin2.default.database();

var env = process.env.NODE_ENV || 'development';

if (env == 'production') {
  var Bot = require('node-line-messaging-api');
  var ID = '1501455661';
  var SECRET = '367d38f1f36d2b9c3de59437a88ddd23';
  var TOKEN = '8Rn/qNeXALta5QAW9d/bSeT4qGsdSTH8VF3d+GFIARxEPOoTC+Sl0+3KdIVLXXOUelUDlxociqtljNPP3py59QH9ECwZbd3AvWBTC2IAHYEZDpYm3QhZE+m6+/aUYQPU18WXCFZ+XTZocY6FcCmp3QdB04t89/1O/w1cDnyilFU=';
} else {
  var Bot = require('node-line-messaging-api');
  var ID = '1506324098';
  var SECRET = '67cdf8ca5562c3b558c66d88115762c7';
  var TOKEN = 'qP7mjb0JygPTaztahWWNdv+3x1oQEcYAk3jAcORqe7Ictlfza8qCuG8eTb2VAfppXhh73MG3gAAuW42/SCGoyjB3N/9NFsSe6rh0I0xM9WAEVvTnKqIPXIXtOn9UbGIoQIqvEg12mQ39tQ+o+Y3n6gdB04t89/1O/w1cDnyilFU=';
}

var PORT = process.env.PORT || 3002;
var bot = new Bot({
  secret: SECRET,
  token: TOKEN,
  options: {
    port: PORT,
    tunnel: false,
    verifySignature: true
  }
});

var store = (0, _redux.createStore)(_reducers2.default);
var questions = new _questions2.default(store);
var room = new _rooms2.default(store);

var questionId = null;
var answersLength = 0;
var currentUsers = null;
var currentTimer = null;

room.syncReducer({ database: database });

database.ref('updates').on('child_added', function (snapshot) {
  var result = snapshot.val();
  if (result) {
    if (!result.stickerId || !result.packageId) {
      result.stickerId = 114;
      result.packageId = 1;
    }
    room.broadCastUsers(function (user) {
      var button = {
        altText: result.title + ' - ' + result.description,
        title: result.title,
        text: result.description,
        actions: [{
          type: 'message',
          label: 'Menu',
          text: '/menu'
        }]
      };
      if (result.thumbnailImageUrl) button.thumbnailImageUrl = result.thumbnailImageUrl;
      bot.pushMessage(user.lineId, new Bot.Messages().addButtons(button).addSticker({ packageId: result.packageId, stickerId: result.stickerId }).commit());
    });
  }
});

store.subscribe(function () {
  var state = store.getState();

  if (currentUsers != state.users && Object.keys(state.users).length > 0) {
    currentUsers = state.users;
    room.syncScore({ database: database });
  }

  if (currentTimer != state.timer) {
    currentTimer = state.timer;
    if (currentTimer == 5) {
      room.broadCastAnswerState(function (_ref) {
        var user = _ref.user,
            answerState = _ref.answerState,
            position = _ref.position;

        if (answerState) {
          if (position == 0) {
            bot.pushMessage(user.lineId, new Bot.Messages().addSticker({ packageId: 1, stickerId: 114 }).addText('Yeay, kamu berhasil menjadi penjawab pertama pertahankan terus...').commit());
          } else {
            bot.pushMessage(user.lineId, new Bot.Messages().addSticker({ packageId: 1, stickerId: 2 }).addText('Mantap. kamu berhasil menjawab pertanyaan, kalo bisa lebih cepat menjawab supaya scorenya lebih tinggi...').commit());
          }
        } else {
          bot.pushMessage(user.lineId, new Bot.Messages().addSticker({ packageId: 1, stickerId: 16 }).addText('Waduh, kamu belum menjawab pertanyaan, semangat!').commit());
        }
      });
      room.broadCastAll(function (user) {
        bot.pushMessage(user.lineId, new Bot.Messages().addText('Pertanyaan berikutnya akan muncul dalam 5 detik.').commit());
      });
    }
  }

  if (questionId !== state.questionId) {
    questionId = state.questionId;
    var pertanyaan = state.activeQuestion.question;
    var randomAnswer = state.activeQuestion.randomAnswer;

    room.broadCastAll(function (user) {
      bot.pushMessage(user.lineId, new Bot.Messages().addText(pertanyaan + '\n\n' + randomAnswer).commit());
    });

    room.checkUserActive(function (user) {
      bot.pushMessage(user.lineId, new Bot.Messages().addButtons({
        altText: 'Kamu sudah lama tidak menjawab ketik /exit untuk keluar, atau /continue untuk tetap bermain',
        title: 'Acakata',
        text: 'Kamu sudah lama tidak menjawab, mau melanjutkan game?',
        actions: [{
          type: 'message',
          label: 'Lanjutkan Permainan',
          text: '/continue'
        }, {
          type: 'message',
          label: 'Keluar Permainan',
          text: '/exit'
        }]
      }).commit());
    });
  }

  if (state.answers.length != answersLength) {
    answersLength = state.answers.length;
    var lastAnswer = state.answers[answersLength - 1];
    if (lastAnswer) {
      room.broadCast({ roomId: lastAnswer.roomId, callback: function callback(user) {
          if (lastAnswer.answerState) {
            if (lastAnswer.addedScore == 10) {
              bot.pushMessage(user.lineId, new Bot.Messages().addSticker({ packageId: 1, stickerId: 114 }).addText(lastAnswer.displayName + ' menjawab dengan benar (+10)').commit());
            } else if (lastAnswer.addedScore == 5) {
              bot.pushMessage(user.lineId, new Bot.Messages().addText(lastAnswer.displayName + ' menjawab ' + lastAnswer.answerText + ' (+5)').commit());
            } else {
              bot.pushMessage(user.lineId, new Bot.Messages().addText(lastAnswer.displayName + ' menjawab benar (+1)').commit());
            }
          } else {
            bot.pushMessage(user.lineId, new Bot.Messages().addText(lastAnswer.displayName + ' menjawab ' + lastAnswer.answerText).commit());
          }
        }
      });
    }
  }
});

room.createRoom('test');
questions.start();

var showOnBoarding = function showOnBoarding(displayName) {
  return new Bot.Messages().addText('Halo ' + displayName + '!\n\nKenalin aku bot acakata. Kita bisa main tebak tebakan kata multiplayer loh sama teman-teman lain yang lagi online.\n\nCara mainnya gampang, kita tinggal cepet-cepetan menebak dari petunjuk dan kata yang diacak. Semakin cepat kita menebak benar maka score yang kita dapat semakin tinggi. Serunya, kita bertanding sama semua orang yang lagi main online juga!').addSticker({ packageId: 1, stickerId: 406 }).commit();
};

var showMenu = function showMenu(displayName) {
  return new Bot.Messages().addButtons({
    thumbnailImageUrl: 'https://firebasestorage.googleapis.com/v0/b/memeline-76501.appspot.com/o/acakatacover.png?alt=media&token=85134e75-bdc7-4747-9590-1915b79baf0a',
    altText: 'Silakan ketik\n\n/battle untuk mulai battle\n/startduel untuk mulai duel\n/highscore untuk lihat score tertinggi\n/help untuk melihat cara bermain\n/exit untuk keluar dari battle atau duel',
    title: 'Acakata Menu',
    text: 'Mau mulai main?',
    actions: [{
      type: 'message',
      label: 'Mulai Battle',
      text: '/battle'
    }, {
      type: 'message',
      label: 'Duel 1 vs 1',
      text: '/startduel'
    }, {
      type: 'message',
      label: 'Highscore',
      text: '/highscore'
    }, {
      type: 'message',
      label: 'Cara Bermain',
      text: '/help'
    }]
  }).commit();
};

bot.on('webhook', function (_ref2) {
  var port = _ref2.port,
      endpoint = _ref2.endpoint;

  console.log('bot listens on port ' + port + '.');
});

bot.on('follow', function (event) {
  bot.getProfileFromEvent(event).then(function (_ref3) {
    var displayName = _ref3.displayName;

    room.addUserFollow({ lineId: event.source.userId, displayName: displayName });
    bot.pushMessage(event.source.userId, showMenu());
    bot.pushMessage(event.source.userId, showOnBoarding(displayName)).catch(function (err) {
      return console.log(err);
    });
  });
});

bot.on('text', function (_ref4) {
  var replyToken = _ref4.replyToken,
      source = _ref4.source,
      type = _ref4.source.type,
      text = _ref4.message.text;

  if (text == '/battle') {
    bot.getProfile(source[source.type + 'Id']).then(function (_ref5) {
      var displayName = _ref5.displayName;

      room.addUser({ lineId: source.userId, displayName: displayName, replyToken: replyToken, roomId: 'test' });
      room.onlineUser({ roomId: 'test', callback: function callback(_ref6) {
          var users = _ref6.users;

          var timer = questions.getTimer();
          bot.pushMessage(source.userId, new Bot.Messages().addText('Pertanyaan berikutnya akan muncul dalam ' + timer + ' detik').commit());
          if (users.length <= 10 && users.length > 1) {
            bot.pushMessage(source.userId, new Bot.Messages().addText('Berikut ini pemain yang online:\n\n' + users.filter(function (user) {
              return user.lineId != source.userId;
            }).map(function (user) {
              return '- ' + user.displayName;
            }).join('\n')).commit());
          }
          bot.pushMessage(source.userId, new Bot.Messages().addText('Ada ' + users.length + ' pemain yang online').commit());
        } });
    });
  } else if (text == '/help') {
    bot.pushMessage(source.userId, new Bot.Messages().addSticker({ packageId: 1, stickerId: 406 }).addText('Cara mainnya gampang, kita tinggal cepet-cepetan menebak dari petunjuk dan kata yang diacak. Semakin cepat kita menebak benar maka score yang kita dapat semakin tinggi. Serunya, kita bertanding sama semua orang yang lagi main online juga!').commit());
  } else if (text == '/startduel') {
    var nameUser = text.split(' ')[1];
    bot.pushMessage(source.userId, new Bot.Messages().addText('Untuk mengundang duel silakan ketik\n\n/duel <salah satu nama di bawah>').commit());
    room.listHighscore({ userId: source.userId, callback: function callback(_ref7) {
        var user = _ref7.user,
            highscores = _ref7.highscores;

        bot.pushMessage(user.lineId, new Bot.Messages().addText('' + highscores.map(function (user) {
          return '- ' + user.displayName + ' = ' + user.score;
        }).join('\n')).commit());
      } });
  } else if (text.indexOf('/duel') > -1) {
    var _nameUser = text.split(' ')[1];
    bot.getProfile(source[source.type + 'Id']).then(function (_ref8) {
      var displayName = _ref8.displayName;

      var arrayName = [_nameUser, displayName].sort();
      room.createRoom(arrayName[0] + '-' + arrayName[1]);
      room.addUser({ lineId: source.userId, displayName: displayName, replyToken: replyToken, roomId: arrayName[0] + '-' + arrayName[1] });

      room.onlineUser({ roomId: arrayName[0] + '-' + arrayName[1], callback: function callback(_ref9) {
          var users = _ref9.users;

          if (users.length > 1) {
            bot.pushMessage(source.userId, new Bot.Messages().addText('Duel sudah dimulai').commit());
          } else {
            bot.pushMessage(source.userId, new Bot.Messages().addText('Menunggu lawan duel').commit());
          }
        } });
    });
  } else if (text == '/continue') {
    room.exte;
  } else if (text == '/highscore') {
    room.listHighscore({ userId: source.userId, callback: function callback(_ref10) {
        var user = _ref10.user,
            highscores = _ref10.highscores;

        bot.pushMessage(user.lineId, new Bot.Messages().addText('Highscore: \n\n' + highscores.map(function (user) {
          return '- ' + user.displayName + ' = ' + user.score;
        }).join('\n')).commit());
      } });
  } else if (text == '/exit') {
    room.removeUser({ lineId: source.userId });
    bot.pushMessage(source.userId, new Bot.Messages().addText('Kamu sudah keluar dari permainan').commit());
  } else if (text == '/menu') {
    bot.pushMessage(source.userId, showMenu());
  } else if (room.checkUserExist({ lineId: source.userId })) {
    var answerText = text;
    questions.checkAnswer({ answerText: answerText, lineId: source.userId });
  }
});