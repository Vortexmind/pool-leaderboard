PoolGames = new Mongo.Collection("poolgames");
Leaderboard = new Mongo.Collection("leaderboard");

if (Meteor.isClient) {	  
  Meteor.subscribe("poolgames");
  Meteor.subscribe("leaderboard");
  
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });
  
  Template.registerHelper('formatDate', function(date) {
	return moment(date).format('MM-DD-YYYY HH:SS');
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
  })
  
  Template.userGame.events({
    "click .toggle-confirmation": function () {	
      Meteor.call("toggleConfirm",this._id,this.playerTwoId,this.checked);
    }
	  
  });
  
  Template.addGame.events({
	  'submit .addGame' : function (e) {
      e.preventDefault();
      var playerOne = e.target.playerOne.value;
      var playerTwo = e.target.playerTwo.value;
 
	  Meteor.call("addUnconfirmedGame", playerOne, playerTwo);
 
      // Clear form
      event.target.playerOne.value = "";
      event.target.playerTwo.value = "";
    }
	  
  });
} 

if (Meteor.isServer) {
  Meteor.startup(function () {
  });
  
  Meteor.publish("poolgames", function () {
    return PoolGames.find({
	$or: [
        { 'owner' : this.userId },
        { 'playerTwoId' : this.userId }
      ]
    });
  });
  
  Meteor.publish("leaderboard", function () { 
	return Leaderboard.find();
  });
}

Meteor.methods({
  addUnconfirmedGame: function (playerOne,playerTwo) {
    //Ensure the user is logged in before being able to add a game
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
	
	var playerOneId = Meteor.call('getUserId', playerOne);
	var playerTwoId = Meteor.call('getUserId', playerTwo); 
	
	console.log('Players: ' + playerOneId + ' VS ' + playerTwoId);

	if ( playerOneId === '' || playerTwoId === '' ) { 
	  throw new Meteor.Error('player-not-found');
	}
	
	if ( playerOneId === playerTwoId ) { 
	  throw new Meteor.Error('play-with-self');
	}

	// Insert the game
    PoolGames.insert({
	  createdAt: new Date(),
      owner: Meteor.userId(),
      playerOne : playerOne, 
      playerTwo : playerTwo,
      playerTwoId : playerTwoId,
      winner : false,
      confirmed : false
    });
  },
  getUserId : function(username) { 
	var user = Meteor.users.findOne({'username' : username }) || '';
	if (user === '') { return ''; } else { return user._id; }
  },
  toggleConfirm: function (gameId, playerTwoId,setConfirmed) {
	 if(playerTwoId != Meteor.userId()) {
		console.log("Only other player can confirm game");
		throw new Meteor.Error('other-player-must-confirm');
	}
    PoolGames.update(gameId, { $set: { confirmed: !setConfirmed} });
  }
});

/*
 Template.taskstp.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }

  });
  
 Template.addtask.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;
 
      // Insert a task into the collection
	  Meteor.call("addTask", text);
 
      // Clear form
      event.target.text.value = "";
    },"change .hide-completed input": function (event) {
		Session.set("hideCompleted", event.target.checked);
	}
  });
  
  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked",this._id,this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteTask",this._id);
    }
  });
  
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
  
  Meteor.publish("tasks", function () {
    return Tasks.find();
  });
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
	if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { checked: !setChecked} });
  }
});

*/
