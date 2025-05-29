//Creamos un server
//Se instala expressjs (npm i --save express) y se crea la constante
const express = require("express");
const app = express();
const path = require("path");
const sequelize = require("./util/database");
const session = require("express-session");
const Product = require("./models/productModel");
const User = require("./models/userModel");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");

const store = new SequelizeStore({
  db: sequelize,
});

//templates
app.set("view engine", "ejs");
//app.set('views', 'views'); solo se aplica si tenes la carpeta views con otro nombre

const errorController = require("./controllers/errorsController");
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const bodyParser = require("body-parser");
const Cart = require("./models/cartModel");
const CartItem = require("./models/cartItem");
const OrderModel = require("./models/orderModel");
const OrderItem = require("./models/orderItem");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
const csrfProtection = csrf();
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(csrfProtection);
app.use(flash());
store.sync();

app.use((req, res, next) => {
  console.log("session.user:", req.session.user);
  if (!req.session.user) {
    return next();
  }
  User.findByPk(req.session.user.id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.user;
  next();
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use("/500", errorController.get500);
app.use(errorController.pageNotFound);
app.use((error, req, res, next) => {
  if (res.headersSent) {
    console.log(error);
    return next(error);
  }
  console.log(error);
  res.status(500).redirect("/500");
});

Product.belongsTo(User, {
  constraints: true,
  onDelete: "CASCADE",
});
User.hasMany(Product);
User.hasOne(Cart);
Cart.belongsTo(User);
Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
OrderModel.belongsTo(User);
User.hasMany(OrderModel);
OrderModel.belongsToMany(Product, { through: OrderItem });

sequelize
  // .sync({force: true})
  .sync()
  .then((result) => {
    app.listen(process.env.MYSQL_PORT || 3000);
  })
  .catch((err) => console.log(err));
