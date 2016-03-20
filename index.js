userGroups = new Mongo.Collection('userGroups');
userImages = new Mongo.Collection('userImages');
dayEvents = new Mongo.Collection('dayEvents');
supplies = new Mongo.Collection('supplies');


var imageStore = new FS.Store.GridFS("images");

Images = new FS.Collection("images", {
 stores: [imageStore]
});

 
if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  angular.module('fd', ['angular-meteor', 'ui.router', 'ngAnimate', 'accounts.ui']);
 
  angular.module('fd').config(function($stateProvider, $urlRouterProvider) {



    $urlRouterProvider.when('/dashboard', '/dashboard/overview');
    $urlRouterProvider.otherwise('/login');

    $stateProvider
    	.state('base', {
        abstract: true,
        url: '',
        templateUrl: 'views/base.html'
      })
        .state('login', {
          url: '/login',
          templateUrl: 'client/views/login.ng.html',
          controller: 'LoginCtrl'
        })
        .state('signup', {
          url: '/signup',
          templateUrl: 'client/views/signup.ng.html',
          controller: 'LoginCtrl'
        })
        .state('dashboard', {
          url: '/dashboard',
          templateUrl: 'client/views/dashboard.ng.html',
          controller: 'DashboardCtrl',
          resolve: {
            "currentUser": ["$meteor", function($meteor){
              return $meteor.requireUser();
            }]
          }
        })
          .state('overview', {
            url: '/overview',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/overview.ng.html',
            controller: 'OverviewCtrl'
          })
          .state('settings', {
            url: '/settings',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/settings.ng.html'
          })
          .state('usergroup', {
            url: '/usergroup/:groupName',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/usergroup.ng.html',
            controller: 'userGroupCtrl'
          })
          .state('newgroup', {
            url: '/newgroup',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/newgroup.ng.html',
            controller: 'OverviewCtrl'
          })
          .state('dayevent', {
            url: '/dayevent/:evenTitle',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/dayevent.ng.html',
            controller: 'dayEventCtrl'
          })
          .state('newevent', {
            url: '/newevent',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/newevent.ng.html',
            controller: 'userGroupCtrl'
          })
          .state('supply', {
            url: '/supply/:supplyName',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/supply.ng.html',
            controller: 'supplyCtrl'
          })
          .state('newsupply', {
            url: '/newsupply',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/newsupply.ng.html',
            controller: 'dayEventCtrl'
          })
          .state('supplieslist', {
            url: '/supplieslist',
            parent: 'dashboard',
            templateUrl: 'client/views/dashboard/supplieslist.ng.html',
            controller: 'supplyCtrl'
          });
    
  });

  sessionStorage.currentGroup = new String();
  sessionStorage.currentDayEvent = new String();
  sessionStorage.currentSupply = new String();

  angular.module('fd').run(["$rootScope", "$state", function($rootScope, $state) {
    $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
      if (error === "AUTH_REQUIRED") {
        $state.go('login');
      }
    });
  }]);

  angular.module('fd').controller('BaseCtrl', ['$scope', '$meteor', '$location',
    function ($scope, $meteor) {
    }
  ]);

  angular.module('fd').controller('DashboardCtrl', function($scope, $state, $location) {
    var userAvatar = 'user-avatar.png';

    $scope.$state = $state;
    
    $scope.user = Meteor.user().username;
    $scope.avatar = Meteor.user().profile.avatar ? Meteor.user().profile.avatar : '/'+userAvatar;

    $scope.logout = function(){
      Meteor.logout();
    }
  });

  angular.module('fd').controller('LoginCtrl', function($scope, $location) {
      $scope.loginFailed = false;

      $scope.submit = function(email, passwd) {
        if(email==null || typeof(email)=='undefined' || email=='')
          alert('Please enter email');
        else if(passwd==null || typeof(passwd)=='undefined' || passwd=='')
          alert('Please enter password');
        else{
          Meteor.loginWithPassword(email, passwd);

          Accounts.onLoginFailure(function(){
            $scope.loginFailed = true;
          });

          Accounts.onLogin(function(){
            $scope.loginFailed = false;
            $location.path('/dashboard');
          });

        }
        return false;
      }

      $scope.createuser = function(username, email, passwd, passwd1){
        if(passwd == passwd1){
          Accounts.createUser({
              username: username,
              email: email,
              password: passwd,
              profile: {
                  groups: [],
                  avatar: ''
              }
          });

          Meteor.loginWithPassword(email, passwd);

          Accounts.onLoginFailure(function(){
            $location.path('/login');
          });

          Accounts.onLogin(function(){
            $location.path('/dashboard');
          });

        }
        else
          alert("passwords donot match");
      }

  });

  angular.module('fd').controller('OverviewCtrl', ['$scope', '$location', '$state', '$meteor',
    function ($scope, $location, $state, $meteor) {
 
      var usrGrps = _.filter(userGroups.find().fetch(), function(gr) {
            var currentUser = Meteor.user().username;
            return (gr.creator == currentUser || _.contains(gr.members, currentUser));
          });

      $scope.$watch('groupSearchInput', function() {
        if ($scope.groupSearchInput) {
          $scope.groupsData = _.filter(userGroups.find().fetch(), function(gr) {
            return (gr.name.toLowerCase().indexOf($scope.groupSearchInput.toLowerCase()) == 0);
          });
        }
        else
          $scope.groupsData = _.map(usrGrps, function(gr) {
            return {
              name: gr.name,
              link: gr.link,
              members: gr.members,
              membersCount: gr.members ? gr.members.length : 1,
              creator: gr.creator
            }
          })
      });

      $scope.isAllowGroupView = function(groupCreator, groupMembers) {
        var user = Meteor.user().username;
        return (groupCreator == user || _.contains(groupMembers, user));
      }

      $scope.participate = function(groupname){
        var group = userGroups.findOne( {name: groupname} ),
            groupId = group._id,
            awaiting = group.awaiting,
            user = Meteor.user().username;

        if(!_.contains(group.members, user) || !_.contains(awaiting, user)) {
          awaiting.push(user);
          alert('Your request has been accepted');
          userGroups.update(groupId, {$set: {awaiting: awaiting}}, function(error) {
            if (error) {
              // display the error to the user
              alert(error.reason);
            } else {
              //
            }
          });
        }
      }

      $scope.createusergroup = function(groupname, description){
        var members = [],
            groupAddr;

        if(groupname)
          groupAddr = groupname.replace(/\s/g,'_');
        else
          return;

        var currentUser = Meteor.user(),
            currentUserProfile = currentUser.profile,
            currentUserId = currentUser._id,
            currentUserGroups = currentUserProfile.groups;


        if(!_.contains(currentUserGroups, groupname)) {
          currentUserGroups.push(groupname);
          currentUserProfile.groups = currentUserGroups;

          Meteor.users.update(currentUserId, { $set:{profile: currentUserProfile}} );

        }
        else {
          alert("group already exists, try create another one");
          return;
        }

        members.push(Meteor.user().username);
        
        userGroups.insert({
            name: groupname,
            link: groupAddr,
            description: description,
            members: members,
            awaiting: [],
            dayevents: [],
            creator: Meteor.user().username
        });
        
        $location.url('/dashboard/usergroup/'+groupAddr);
        
      }

      $scope.isAllow = function(groupname) {
        var gr = userGroups.findOne({ name: groupname });

        //console.log('*********************************************');
        //console.log('user:', Meteor.user().username);
        //console.log('group name:', gr.grpoupname);
        //console.log('group creator:', gr.creator);
        //console.log('group members:', gr.members);


        if(gr.creator == Meteor.user().username)
          return false;

        if(_.contains(gr.members, Meteor.user().username))
          return false;

        //console.log('return asking for participation!');
        return true;
      }
      
    }]);

  angular.module('fd').controller('userGroupCtrl', ['$scope', '$location', '$state', '$meteor',
    function ($scope, $location, $state, $meteor) {
      if(!sessionStorage.currentGroup.length)
        sessionStorage.currentGroup = $state.params.groupName;

      var grName = $state.params.groupName || sessionStorage.currentGroup,
          dayevents = dayEvents.find().fetch();
      
      $scope.customGroup = userGroups.findOne({ link: grName });

      var customGroupId = $scope.customGroup._id;

      $scope.customGroupEvents = dayEvents.find({
          parentgroup: grName
      });

      if($scope.customGroup) {

        $scope.customGroupMembers = _.map($scope.customGroup.members, function(member) {
          return Meteor.users.findOne({username: member})
        });

        $scope.customGroupAwaits = _.map($scope.customGroup.awaiting, function(awaiting) {
          return Meteor.users.findOne({username: awaiting})
        });

      }

      $scope.customGroupDayevents = _.map(dayevents, function(de) {
          return {
            title: de.title,
            link: de.link,
            status: de.status,
            paticipantsCount: de.participants ? de.participants.length : 1
          }
      });

      $scope.isCreator = function() {
        return $scope.customGroup.creator == Meteor.user().username;
      }

      $scope.isEventsAvailability = function() {
        return dayEvents.find().count() == 0;
      }

      $scope.isAwaitingUsers = function() {
        return $scope.customGroupAwaits.length == 0;
      }

      $scope.removeUser = function (userToRemove) {
        var group = userGroups.findOne({ link: grName }),
            groupId = group._id,
            groupMembers = group.members;

        if(_.contains(groupMembers, userToRemove))
          groupMembers = _.without(groupMembers, userToRemove);

        userGroups.update(groupId, {$set: {members: groupMembers}}, function(error) {
          if (error) {
            // display the error to the user
            alert(error.reason);
          } else {
            //
          }
        });
      }

      $scope.allowAwaitingUser = function (userToAdd) {
        var group = userGroups.findOne({ link: grName }),
            groupId = group._id ? group._id : '',
            groupMembers = group.members ? group.members : [],
            groupAwaits = group.awaiting ? group.awaiting : [];

        try{

          groupMembers.push(userToAdd);
          groupAwaits = _.without(groupAwaits, userToAdd);

          userGroups.update(groupId, {$set: {members: groupMembers, awaiting: groupAwaits}}, function(error) {
            if (error) {
              // display the error to the user
              alert(error.reason);
            } else {
              //
            }
          });

        }catch(e){}

        alert('user request accepted');
      }

      $scope.denyAwaitingUser = function (userToRemove) {
        var group = userGroups.findOne({ link: grName }),
            groupId = group._id ? group._id : '',
            groupAwaits = group.awaiting ? group.awaiting : [];

        try{
          groupAwaits = _.without(groupAwaits, userToRemove);

          userGroups.update(groupId, {$set: {awaiting: groupAwaits}}, function(error) {
            if (error) {
              // display the error to the user
              alert(error.reason);
            } else {
              //
            }
          });

        }catch(e){}

        alert('user request cancelled');
      }

      $scope.createDayEvent = function(title, description){
        var members = userGroups.findOne({ link: grName }).members,
            user = Meteor.user().username,
            titleAddr;

        if(title)
          titleAddr = title.replace(/\s/g,'_');
        else
          return;

        var groupEvents = $scope.customGroup.dayevents;

        if(!_.contains(groupEvents, title)) {
          groupEvents.push(title);

          userGroups.update(customGroupId, {$set: {dayevents: groupEvents}}, function(error) {
            if (error) {
              // display the error the user
              alert(error.reason);
            } else {
              //
            }
          });

        }
        else {
          alert("event with such title already exists in your group");
          return;
        }

        dayEvents.insert({
            title: title,
            link: titleAddr,
            description: description,
            participants: members,
            supplies: [],
            parentgroup: $scope.customGroup.name,
            status: 'initiated',
            creator: user
        });

        //sessionStorage.currentGroup = '';
        $location.url('/dashboard/dayevent/'+titleAddr);
        
      }
    
      
    }]);

    angular.module('fd').controller('dayEventCtrl', ['$scope', '$location', '$state', '$meteor',
    function ($scope, $location, $state, $meteor) {
      if(!sessionStorage.currentDayEvent.length)
        sessionStorage.currentDayEvent = $state.params.evenTitle;

      var dayEventTitle = $state.params.evenTitle || sessionStorage.currentDayEvent,
          eventSupplies = supplies.find().fetch();
      
      $scope.customEvent = dayEvents.findOne({
        link: dayEventTitle
      });

      var customEventId = $scope.customEvent._id;

      $scope.customEventParticipants = _.map($scope.customEvent.participants, function(member) {
        return Meteor.users.findOne({username: member})
      });

      $scope.customEventSupplies = _.filter(eventSupplies, function(es) {
        return _.contains($scope.customEvent.supplies, es.name);
      });

      $scope.isSuppliesChosen = function() {
        return supplies.find().count() == 0;
      }

      $scope.createsupply = function(name, description, price){

        if(name)
          nameAddr = name.replace(/\s/g, "_");
        else
          return;

        var eventSupplies = $scope.customEvent.supplies;

        if(!_.contains(eventSupplies, name)) {
          eventSupplies.push(name);

          dayEvents.update(customEventId, {$set: {supplies: eventSupplies}}, function(error) {
            if (error) {
              // display the error to user
              alert(error.reason);
            } else {
              //
            }
          });
        }
        else {
          alert("this supply already created, try to edit");
          return;
        }
        
        supplies.insert({
            name: name,
            link: nameAddr,
            description: description,
            price: price,
            parentgroup: $scope.customEvent.parentgroup,
            creator: Meteor.user().username
        });
        
        //sessionStorage.currentDayEvent = '';
        $location.url('/dashboard/supply/'+nameAddr);
        
      }
      
    }]);

    angular.module('fd').controller('supplyCtrl', ['$scope', '$state', '$meteor',
    function ($scope, $state, $meteor) {
      if(!sessionStorage.currentSupply.length)
        sessionStorage.currentSupply = $state.params.supplyName;

      var suppliesList = supplies.find().fetch();

      $scope.currentGroup = sessionStorage.currentGroup;

      $scope.parentEvent = sessionStorage.currentDayEvent;

      $scope.currentGroupSupplies = _.filter(suppliesList, function(supply) {
        return $scope.currentGroup == supply.parentgroup;
      });

      var supplyName = $state.params.supplyName || sessionStorage.currentSupply;

      $scope.currentSupply = supplies.findOne({
        link: supplyName
      });

      $scope.addSupplyToCurrentEvent = function(supplyName) {
        var currentEventSupplies = DayEvents.findOne({link: $scope.parentEvent}).supplies;

        if(!_.contains(currentEventSupplies, supplyName)) {
          currentEventSupplies.push(supplyName);

          dayEvents.update($scope.parentEvent._id, {$set: {supplies: currentEventSupplies}}, function(error) {
            if (error) {
              // display the error to user
              alert(error.reason);
            } else {
              alert('supply successfully added');
            }
          });
        }
        else
          alert("can't accept, this supply already added");
      }
      
    }]);

    angular.module('fd').controller('uploadCtrl', ['$scope', '$location', '$meteor',
    function ($scope, $location, $meteor) {

      $scope.changeAvatar = function() {
        var newAvatar = _lastUploadedFile;   //global

        var file = $('#file').get(0).files[0];
        
        if(!newAvatar || !file)
          return;

        var fileObj = Images.insert(file),
            fileurl = fileObj.url();

        //console.log('Upload result: ', fileObj);

        userImages.insert({
            name: newAvatar,
            type: 'avatar',
            file: fileObj,
            url: fileObj.url() || fileurl,
            uploadedBy: Meteor.user().username
        });

        var currentUserId = Meteor.userId(),
            currentUserAvatar = fileObj.url() || fileurl;

        Meteor.users.update(currentUserId, { $set: {profile: {avatar: currentUserAvatar, groups: Meteor.user().profile.groups}} });

        alert('image was uploaded, relogin to view changes');
      }

    }]);

}

if (Meteor.isServer) {
  Images.allow({
    insert: function () {
      return true;
    },
    remove: function () {
      return false;
    },
    download: function () {
      return true;
    },
    update: function () {
      return false;
    }
  });
}