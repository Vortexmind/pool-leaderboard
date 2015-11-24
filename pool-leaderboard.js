PoolGames = new Mongo.Collection("poolgames");
Leaderboard = new Mongo.Collection("leaderboard");

if (Meteor.isClient) {

	Meteor.subscribe("leaderboard");

	Tracker.autorun(function() {
		Meteor.subscribe("poolgames",Meteor.userId());
	});

	Session.set('userFound',false);
	Session.set('typedUser','');

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });

  Template.registerHelper('formatDate', function(date) {
		return moment(date).startOf('hour').fromNow();
  });

  Template.registerHelper('getGameBtnClass',function(winner,player) {
		if (winner === '') {
				return 'btn-warning';
		}
		if ( winner === player ) { return 'btn-success'; } else { return 'btn-danger'; }
	});

  Template.leaderboard.helpers({
		games : function() {
			return Leaderboard.find({},{sort: {wins : -1}});
		}
  });

  Template.yourGames.helpers({
		userGames : function() {
			if (Session.get("hideConfirmed")) {
				return PoolGames.find({confirmed: {$ne: true}},{sort: {createdAt : -1}});
			} else {
				return PoolGames.find({},{sort: {createdAt : -1}});
			}
		}
  });

  Template.yourGames.events({
		"change .filter-confirmed": function (event) {
      Session.set("hideConfirmed", event.target.checked);
    }
	});

  Template.userGame.helpers({
		isGameOwner : function() {
			return this.owner === Meteor.user().username;
		},
		enableIfConfirmed : function() {
			if(this.confirmed) return "disabled";
		},
		enableIfWinnerSet : function() {
			if (this.winner === '') return "disabled";
		}
  });

  Template.userGame.events({
    "click .confirm-game" : function (e) {
      Meteor.call("confirmGame",this._id,function(err) {
					if (typeof err !== 'undefined') {
						e.target.checked = false;
						var formContainer = $(e.target).closest('.form-group');
						formContainer.addClass('has-error').addClass('has-feedback');;
						setTimeout(function() { formContainer.removeClass('has-error').removeClass('has-feedback'); },800);
					}
			});
		},
		"click .winner-btn" : function(e) {
			Meteor.call("setWinner",this._id,e.target.value);
		}
  });

  Template.addGameModal.events({
	  'submit .addGame' : function (e) {
	  console.log("Submit add game");
      e.preventDefault();
      var playerTwo = e.target.playerTwo.value;

			Meteor.call("addUnconfirmedGame", playerTwo,function(err) {
					if (typeof err !== 'undefined') {
						var formContainer = $(e.target).closest('.form-group');
						formContainer.addClass('has-error').addClass('has-feedback');
						setTimeout(function() { formContainer.removeClass('has-error').removeClass('has-feedback'); },800);
					} else {
						// Clear form
						event.target.playerTwo.value = "";
					}
			});
	$('#add-game-modal').modal('hide');
    },
    'blur .player-two' : function (e) {
			var typedUser = e.target.value;

			if (Session.get('typedUser') === typedUser) { return; }

			var check = Meteor.call("findUser",typedUser, function(err,res){
				Session.set('userFound',res);
				Session.set('typedUser',typedUser);
				var formContainer = $(e.target).closest('.form-group');
				if (res) {
						formContainer.addClass('has-success').addClass('has-feedback');
						setTimeout(function() { formContainer.removeClass('has-success').removeClass('has-feedback'); },800);
				} else {
						formContainer.addClass('has-error').addClass('has-feedback');
						setTimeout(function() { formContainer.removeClass('has-error').removeClass('has-feedback'); },800);
				}
			});
		}
  });

  Template.addGame.helpers({
		isDisabled : function() {
				if (Session.get('userFound') !== true) return "disabled";
		}
	});
	
  Template.heading.events({
		'click button.js-add-game-modal' : function(e) { 
			console.log($('#add-game-modal').modal());
			$('#add-game-modal').modal('show');
		}
	  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
  });

  Meteor.publish("poolgames", function () {
		var user = Meteor.users.findOne({'_id':this.userId});
		if (typeof user.username === 'undefined') {
			throw new Meteor.Error('username not found');
		}
    return PoolGames.find({ 'players' : { $elemMatch : { 'player' : user.username } } });
  });

  Meteor.publish("leaderboard", function () {
		return Leaderboard.find();
  });
}

Meteor.methods({
	  addUnconfirmedGame: function (playerTwo) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

		check(playerTwo, String);

		var found = Meteor.users.findOne({'username' : playerTwo });

		if ( typeof found === 'undefined' ) {
			throw new Meteor.Error('player-not-found');
		}

		if ( Meteor.user().username === playerTwo ) {
			throw new Meteor.Error('play-with-self');
		}

		// Insert the game
		PoolGames.insert({
			'createdAt' : new Date(),
			'owner' :  Meteor.user().username,
			'players' : [
				{
					'player' : Meteor.user().username,
				},
				{
					'player' : playerTwo,
				}
			],
			'winner' : '',
			'confirmed' : false
		});
  },
  setWinner : function(gameId,winner) {
		check(gameId, String);
		check(winner, String);

		// Find a game with that ID and ensure it's not confirmed already
		var game = PoolGames.findOne(
		 { $and : [
				{'_id' : gameId},
				{'confirmed' : { $ne : true }}
			]
		 });

		if (typeof game._id === 'undefined') {
			throw new Meteor.Error('game-not-found-or-confirmed');
		}

		PoolGames.update(game._id, { $set : { 'winner' : winner}});

	},
  confirmGame: function (gameId) {
	  check(gameId, String);

		// Only the other player can confirm a game, not the owner
		// and the game must not have a winner already
		var game = PoolGames.findOne(
		{ $and : [
			{ '_id' : gameId },
			{ 'winner' :  { $ne : '', $exists: true }},
			{ 'owner' : { $ne : Meteor.user().username }},
			{ 'players' : { $elemMatch : { 'player' : Meteor.user().username } } }
			]
		});

		if ( typeof game === 'undefined' ) {
			throw new Meteor.Error('game-cannot be confirmed');
		}

		PoolGames.update(game._id, { $set: { 'confirmed': true} });

		Meteor.call('updateLeaderboard',game.winner);

  },
  updateLeaderboard : function (winner) {
		check(winner, String);

	  var found = Meteor.users.findOne({'username' : winner });

		if ( typeof found === 'undefined' ) {
			throw new Meteor.Error('player-not-found');
		}

		Leaderboard.update({"username" : winner},{$inc : {'wins' : 1 }}, { 'upsert' : true } );
	},
	findUser : function(user) {
		check(user, String);

		var found = Meteor.users.findOne({'username' : user });

		if (typeof found === 'undefined') {
			return false;
		} else {
			return true;
		}

	}
});
