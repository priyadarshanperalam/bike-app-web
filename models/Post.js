const postsCollection = require("../db").db().collection("posts");
const ObjectID = require("mongodb").ObjectId;
const User = require("./User");

let Post = function (data, userid) {
  this.data = data;
  this.errors = [];
  this.userid = userid;
};

Post.prototype.cleanUp = function () {
  let { title, body } = this.data;
  if (typeof title != "string") title = "";
  if (typeof body != "string") body = "";
	console.log('--in cleanup---', this.userid);
  //	get rid of any bogus properties
  this.data = {
    title: title.trim(),
    body: body.trim(),
    createdDate: new Date(),
    author: new ObjectID(this.userid),
  };
};

Post.prototype.validate = function () {
  let { title, body } = this.data;
  if (title == "") {
    this.errors.push("You must provide a title.");
  }

  if (body == "") {
    this.errors.push("You must provide post content.");
  }
};

Post.prototype.create = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();

    if (!this.errors.lenght) {
      // save post into db
      postsCollection
        .insertOne(this.data)
        .then(() => {
          resolve();
        })
        .catch(() => {
          this.errors.push("Please try again later.");
          reject(this.errors);
        });
    } else {
      reject(this.errors);
    }
  });
};

Post.reusablePostQuery = function (uniqueOperations, visitorId) {
  return new Promise(async function (resolve, reject) {
    let aggOperations = uniqueOperations.concat([
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorDocument",
        },
      },
      {
        $project: {
          title: 1,
          body: 1,
          createdDate: 1,
					authorId:"$author",
          author: {
            $arrayElemAt: ["$authorDocument", 0],
          },
        },
      },
    ]);
    let posts = await postsCollection.aggregate(aggOperations).toArray();
    //	cleanup author property in each post
    posts = posts.map((post) => {
			post.isVisitorOwner = post.authorId.equals(visitorId)
      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };
      return post;
    });
		console.log(posts);
    resolve(posts);
  });
};

Post.findSingleById = function (id) {
  return new Promise(async function (resolve, reject) {
    if (typeof id != "string" || !ObjectID.isValid(id)) {
      reject();
      return;
    }
    let posts = await Post.reusablePostQuery([
      { $match: { _id: new ObjectID(id) } },
    ], visitorId);
    if (posts.length) {
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};

Post.findByAuthorId = function (authorId) {
  return Post.reusablePostQuery([
    { $match: { author: authorId } },
    { $sort: { createdDate: -1 } },
  ]);
};

module.exports = Post;
