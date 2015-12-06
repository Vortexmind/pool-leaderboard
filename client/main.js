Meteor.subscribe("leaderboard");

Tracker.autorun(function() {
	Meteor.subscribe("poolgames",Meteor.userId());
});

Session.set('userFound',false);
Session.set('typedUser','');


/// App Routes
Router.route('/', function () {
	this.layout('ApplicationLayout');
	this.render('landingpage', {to: 'mainColumn'});
});

Router.route('/leaderboard', function () {
	this.layout('ApplicationLayout');
	this.render('leaderboard', {to: 'mainColumn'});
});

Router.route('/games', function () {
	this.layout('ApplicationLayout');
	this.render('yourGames', {to: 'mainColumn'});
});


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
			return PoolGames.find({confirmed: {$ne: true}},{sort: {gameDate : -1}});
		} else {
			return PoolGames.find({},{sort: {gameDate : -1}});
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
  var game_id = this._id;

  Meteor.call("confirmGame",game_id,function(err) {
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
  e.preventDefault();
  var playerTwo = e.target.playerTwo.value;
  var gameDate = e.target.gameDate.value;

		Meteor.call("addUnconfirmedGame", playerTwo,gameDate,function(err) {
				if (typeof err !== 'undefined') {
					var formContainer = $(e.target).closest('.form-group');
					formContainer.addClass('has-error').addClass('has-feedback');
					setTimeout(function() { formContainer.removeClass('has-error').removeClass('has-feedback'); },800);
				} else {
					// Clear form
					event.target.playerTwo.value = "";
					event.target.gameDate.value = "";
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
	'click a.js-add-game-modal' : function(e) { 
		$('#add-game-modal').modal('show');
	}
})
