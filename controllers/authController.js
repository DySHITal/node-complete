const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport(
  sendGridTransport({
    auth: {
      api_key: process.env.MAILER_KEY,
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    docTitle: "Login",
    errorMessage: message,
    oldInput: { email: "", password: "" },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      docTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ where: { email } })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          docTitle: "Login",
          errorMessage: "Invalid email or password.",
          oldInput: { email: email, password: password },
          validationErrors: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((result) => {
          if (result) {
            req.session.isLoggedIn = true;
            req.session.user = { id: user.id };
            return req.session.save((err) => {
              if (err) console.log(err);
              res.redirect("/");
            });
          }
          return res.status(422).render("auth/login", {
            path: "/login",
            docTitle: "Login",
            errorMessage: "Invalid email or password.",
            oldInput: { email: email, password: password },
            validationErrors: [],
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    docTitle: "Sign-up",
    errorMessage: message,
    oldInput: { email: "", password: "", cpassword: "" },
    validationErrors: [],
  });
};

exports.postSignup = (req, res, next) => {
  const { email, password, cpassword } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("errores lista: ", errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      docTitle: "Sign-up",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, cpassword },
      validationErrors: errors.array(),
    });
  }

  if (!password || !cpassword) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      docTitle: "Sign-up",
      errorMessage: "Password and confirmation are required.",
      oldInput: { email, password, cpassword },
      validationErrors: errors.array(),
    });
  }

  if (password !== cpassword) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      docTitle: "Sign-up",
      errorMessage: "Passwords have to match!",
      oldInput: { email, password, cpassword },
      validationErrors: errors.array(),
    });
  }

  User.findOne({ where: { email } })
    .then((userDoc) => {
      if (userDoc) {
        return res.status(422).render("auth/signup", {
          path: "/signup",
          docTitle: "Sign-up",
          errorMessage: "Email already in use.",
          oldInput: { email, password, cpassword },
          validationErrors: errors.array(),
        });
      }
      return bcrypt.hash(password, 12);
    })
    .then((hashedPwd) => {
      return User.create({
        email,
        password: hashedPwd,
      });
    })
    .then((result) => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "5mindk@gmail.com",
        subject: "Signup succeeded!",
        html: "<h1>Registro exitoso!</h1>",
      });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
