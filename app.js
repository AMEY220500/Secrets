//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
// const encrypt=require("mongoose-encryption");
// const md5=require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds= 10;
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate=require("mongoose-findorcreate");

const app = express();

console.log(process.env.API_KEY);

app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(session({
  secret:"Our little secret.",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);//to remove deprecation warning
//changing normal schema to mongoose schema to use encryption
//now its not a simple javascript object but a object that is
//created from mongoose.Schema class
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String
});

userSchema.plugin(passportLocalMongoose);//hash and salt our passwords and save in mongodb database
userSchema.plugin(findOrCreate);

const secret=process.env.SECRET;
// userSchema.plugin(encrypt,{secret:secret,encryptedFields:["password"]});
//mongoose automatically encrypy when save method is called
//and automatically decrypt when find method is called

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user,done){
  done(null,user.id);
});

passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
  done(err,user);
  });
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"http://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'profile' ] }
));

app.get( "/auth/google/secrets",
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){///this keeps authenticated until on same localhost as a cokkie and after chrome exit all is gone you have to login again
    res.render("secrets");
  }else{
    res.redirect("/login");
  }
});

//whenever we restart our server the cookie gets destroyed and we get logout and are no longer authenticated
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){

  User.register({username:req.body.username},req.body.password,function(err,user){/////this is the method so you cant use email:req.body.username instead of username:req.body.username
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });//comes from passport-local-mongoose


  // const email=req.body.username;
  // const password=req.body.password;
  //
  // bcrypt.hash(password,saltRounds,function(err,hash){
  //   const newUser=new User({
  //     email:email,
  //     password:hash
  //   });
  //   newUser.save(function(err){
  //     if(err){
  //       console.log(err);
  //     }else{
  //       res.render("secrets");
  //     }
  //   });
  //});


});

app.post("/login",function(req,res){

  const user= new User({
    username:req.body.username, //using username is compulsory
    password:req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });





  // const email=req.body.username;
  // const password=req.body.password;
  //
  // User.findOne({email:email},function(err,foundUser){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     if(foundUser){
  //       bcrypt.compare(password,foundUser.password,function(err,result){
  //         if(result===true){
  //             res.render("secrets");
  //         }
  //       });
  //     }
  //   }
  // });
});

app.listen(3000,function(){
  console.log("server started on port 3000");
});
