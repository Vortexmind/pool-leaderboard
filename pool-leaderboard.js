PoolGames = new Mongo.Collection("poolgames");
Leaderboard = new Mongo.Collection("leaderboard");

if (Meteor.isClient) {	  
  Meteor.subscribe("poolgames");
  Meteor.subscribe("leaderboard");
  
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
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
  
  Template.addGame.events({
	  'submit .addGame' : function (e) {
      e.preventDefault();
      var winner = e.target.winner.value;
      var loser = e.target.loser.value;
 
	  Meteor.call("addUnconfirmedGame", winner, loser);
 
      // Clear form
      event.target.winner.value = "";
      event.target.loser.value = "";
    }
	  
  });
} 

if (Meteor.isServer) {
  Meteor.startup(function () {
  });
  
  Meteor.publish("poolgames", function () {
    return PoolGames.find({ 'owner' : this.userId});
  });
  
  Meteor.publish("leaderboard", function () { 
	return Leaderboard.find();
  });
}

Meteor.methods({
  addUnconfirmedGame: function (winner,loser) {
    //Ensure the user is logged in before being able to add a game
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    // Ensure both players are in the db
    if ( ! Meteor.users.findOne({ 'username' : winner }) ) { 
	  throw new Meteor.Error("winner-not-found");
	}

	if ( ! Meteor.users.findOne({ 'username' : loser }) ) { 
	  throw new Meteor.Error("loser-not-found");
	}
	
	if ( winner == loser ) { 
	  throw new Meteor.Error("play-with-self");
	}

	// Insert the game
    PoolGames.insert({
	  createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username,
      winner: winner,
      loser: loser,
      confirmed : false
    });
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
