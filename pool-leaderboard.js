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
			return Leaderboard.find({});
		}
  });

  Template.yourGames.helpers({
		userGames : function() {
			return PoolGames.find({});
		}
  });
  
  /*
  Template.userGames.helpers({
		isGameOwner : function(owner) { 
			var user = Meteor.users.findOne({'_id':this.userId});
			return owner === user.username;		
		}
  });
  */

  Template.userGame.events({
    "click .confirm-game" : function () {
      Meteor.call("confirmGame",this._id);
		},
		"click .winner-btn" : function(e) { 
			$('div.game-'+this._id+' button').removeClass('btn-warning').addClass('btn-danger');
				
			Meteor.call("setWinner",this._id,e.target.value);
			
			$(e.target).removeClass('btn-danger').addClass('btn-success');
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
    return PoolGames.find({ 'players' : { $elemMatch : { 'player' : user.username } } });
  });

  Meteor.publish("leaderboard", function () {
		return Leaderboard.find();
  });
}

Meteor.methods({
  addUnconfirmedGame: function (playerTwo) {
    //Ensure the user is logged in before being able to add a game
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
		
		check(playerTwo, String);
		
		var found = Meteor.users.findOne({'username' : playerTwo });
		
		if ( typeof found == 'undefined' ) {
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
	
		var game = PoolGames.findOne(
		 { $and : [
				{'_id' : gameId},
				{'confirmed' : { $ne : true }}
			]
		 });		 
 
		 PoolGames.update(game._id, { $set : { 'winner' : winner}});
		
	},
  confirmGame: function (gameId) {
	 check(gameId, String);
	 
	 console.log("Attempting confirmation of " + gameId);
	 var game = PoolGames.findOne(
	 { $and : [
			{'_id' : gameId},
			{'winner' :  { $ne : '', $exists: true }},
			{'owner' : { $ne : Meteor.user().username }}
		]
	 });
	 
	 if ( typeof game == 'undefined' ) {
			console.log("Game not found or not ready for confirmation");
			throw new Meteor.Error('game-not-ready');
	 }

   PoolGames.update(game._id, { $set: { 'confirmed': true} });
  }
});

