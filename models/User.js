const bcrypt = require("bcryptjs");
const usersCollection = require("../db").db().collection("users");
const validator = require("validator");
const md5 = require("md5");
const { type } = require("os");

let User = function (data, getAvatar) {
  this.data = data;
  this.errors = [];
  if (getAvatar == undefined) {
    getAvatar = false;
  }
  if (getAvatar) {
    this.getAvatar();
  }
};

User.prototype.cleanUp = function () {
  let { username, password, email } = this.data;
  if (typeof username != "string") {
    username = "";
  }
  if (typeof email != "string") {
    email = "";
  }
  if (typeof password != "string") {
    password = "";
  }
  this.data = {
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    password,
  };
};

User.prototype.validate = function () {
  return new Promise(async (resolve, reject) => {
    let { username, password, email } = this.data;
    if (username == "") {
      this.errors.push("You must provide a username.");
    }
    if (username != "" && !validator.isAlphanumeric(username)) {
      this.errors.push("Username can only contain letters and numbers.");
    }
    if (!validator.isEmail(email)) {
      this.errors.push("You must provide a email.");
    }
    if (password == "") {
      this.errors.push("You must provide a password.");
    }
    if (password.length > 0 && password.length < 12) {
      this.errors.push("Password must be atleast 12 characters.");
    }
    if (password.length > 50) {
      this.errors.push("Password cannot exceed 100 characters.");
    }
    if (username.length > 0 && username.length < 3) {
      this.errors.push("Username must be atleast 3 characters.");
    }
    if (username.length > 30) {
      this.errors.push("Username cannot exceed 30 characters.");
    }

    // Only if username is valid then check if its unique
    if (
      username.length > 2 &&
      username.length < 31 &&
      validator.isAlphanumeric(username)
    ) {
      let usernameExists = await usersCollection.findOne({ username });
      if (usernameExists) {
        this.errors.push("That username is already taken");
      }
    }

    // Only if email is valid then check if its unique
    if (validator.isEmail(email)) {
      let emailExists = await usersCollection.findOne({ email });
      if (emailExists) {
        this.errors.push("That email is already been used");
      }
    }
    resolve();
  });
};

User.prototype.login = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    usersCollection
      .findOne({
        username: this.data.username,
      })
      .then((attemptedUser) => {
        if (
          attemptedUser &&
          bcrypt.compareSync(this.data.password, attemptedUser.password)
        ) {
          this.getAvatar();
          resolve();
        } else {
          reject("Invalid username/password");
        }
      })
      .catch(() => {
        reject("Try again later");
      });
  });
};

User.prototype.register = function () {
  return new Promise(async (resolve, reject) => {
    // Step #1: Validate user data
    this.cleanUp();
    await this.validate();

    //	Step #2: Only if there are no validation errors, then save the user data
    //	into the database
    if (!this.errors.length) {
      //	hash user password
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);
      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

User.prototype.getAvatar = function () {
  this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
};

User.findByUsername = function (username) {
  return new Promise(function (resolve, reject) {
    if (typeof username != "string") {
      reject();
      return;
    }
    usersCollection
      .findOne({ username: username})
      .then(function (userDoc) {
				console.log("- findByUsername -->", userDoc);
        if (userDoc) {
          userDoc = new User(userDoc, true);
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar,
          };
          console.log("-- userDoc--", userDoc);
          resolve(userDoc);
        } else {
          reject();
        }
      })
      .catch(function () {
        reject();
      });
  });
};

module.exports = User;
