Meteor.methods({
	addUnconfirmedGame: function (playerTwo, gameDate) {
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
			'gameDate' : gameDate,
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
