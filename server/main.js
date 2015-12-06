Meteor.startup(function () {
});

Meteor.publish("poolgames", function () {
	var user = Meteor.users.findOne({'_id':this.userId});
	if(!user){
		throw new Meteor.Error('username not found');
	}
return PoolGames.find({ 'players' : { $elemMatch : { 'player' : user.username } } });
});

Meteor.publish("leaderboard", function () {
	return Leaderboard.find();
});
