PoolGames = new Mongo.Collection("poolgames");
Leaderboard = new Mongo.Collection("leaderboard");

if (Meteor.isClient) {
  Meteor.subscribe("poolgames");
  Meteor.subscribe("leaderboard");

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });

  Template.registerHelper('formatDate', function(date) {
		return moment(date).format('MM-DD-YYYY HH:mm');
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
			return PoolGames.find({},{sort: {createdAt : 1}});
		}
  });

  Template.userGame.helpers({
		isGameOwner : function() {
			return this.owner === Meteor.user().username;
		},
		isDisabled : function() {
			if(this.confirmed) return "disabled";
		}
  });

  Template.userGame.events({
    "click .confirm-game" : function () {
      Meteor.call("confirmGame",this._id);
		},
		"click .winner-btn" : function(e) {
			Meteor.call("setWinner",this._id,e.target.value);
		}
  });

  Template.addGame.events({
	  'submit .addGame' : function (e) {
      e.preventDefault();
      var playerTwo = e.target.playerTwo.value;

			Meteor.call("addUnconfirmedGame", playerTwo);

      // Clear form
      event.target.playerTwo.value = "";
    }

  });
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

  }, updateLeaderboard : function (winner) {
		check(winner, String);

	  var found = Meteor.users.findOne({'username' : winner });

		if ( typeof found === 'undefined' ) {
			throw new Meteor.Error('player-not-found');
		}

		Leaderboard.update({"username" : winner},{$inc : {'wins' : 1 }}, { 'upsert' : true } );
	}
});

