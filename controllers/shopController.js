const Product = require("../models/productModel");
const fs = require("fs");
const path = require("path");
const Order = require("../models/orderModel");
const pdfDocument = require("pdfkit");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  Product.findAndCountAll({
    offset: (page - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
  })
    .then((result) => {
      res.render("shop/product-list", {
        prods: result.rows,
        docTitle: "Products",
        path: "/products",
        csrfToken: req.csrfToken(),
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < result.count,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(result.count / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed");
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findByPk(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        prods: product,
        docTitle: "Details",
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  Product.findAndCountAll({
    offset: (page - 1) * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
  })
    .then((result) => {
      res.render("shop/index", {
        prods: result.rows,
        docTitle: "Shop",
        path: "/",
        csrfToken: req.csrfToken(),
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < result.count,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(result.count / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed");
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = async (req, res, next) => {
  try {
    let cart = await req.user.getCart();
    if (!cart) {
      cart = await req.user.createCart();
    }
    const products = await cart.getProducts();
    return res.render("shop/cart", {
      path: "/cart",
      docTitle: "Your Cart",
      products,
      isAuthenticated: req.session.isLoggedIn,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  let fetchedCart;
  let newQuantity = 1;
  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      let product;
      if (products.length > 0) {
        product = products[0];
      }
      if (product) {
        const oldQuantity = product.cartItem.quantity;
        newQuantity = oldQuantity + 1;
        return fetchedCart.addProduct(product, {
          through: { quantity: newQuantity },
        });
      }
      return Product.findByPk(prodId)
        .then((product) => {
          return fetchedCart.addProduct(product, {
            through: { quantity: newQuantity },
          });
        })
        .catch((err) => {
          const error = new Error("Creating a product Failed", err);
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteItem = (req, res, next) => {
  const proId = req.body.productId;
  req.user
    .getCart()
    .then((cart) => {
      return cart.getProducts({ where: { id: proId } });
    })
    .then((products) => {
      const product = products[0];
      return product.cartItem.destroy();
    })
    .then((result) => {
      res.redirect("cart");
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = async (req, res, next) => {
  let products;
  let total = 0;
  try {
    let cart = await req.user.getCart();
    if (!cart) {
      cart = await req.user.createCart();
    }
    products = await cart.getProducts();
    total = 0;
    products.forEach((p) => {
      total += p.cartItem.quantity * p.price;
    });
    return stripe.checkout.sessions
      .create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: p.title,
                description: p.description,
              },
              unit_amount: p.price * 100, // en centavos
            },
            quantity: p.cartItem.quantity,
          };
        }),
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      })
      .then((session) => {
        return res.render("shop/checkout", {
          path: "/checkout",
          docTitle: "Checkout",
          products: products,
          totalSum: total,
          sessionId: session.id,
        });
      });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.postOrder = (req, res, next) => {
  let fetchedCart;
  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts();
    })
    .then((products) => {
      return req.user
        .createOrder()
        .then((order) => {
          return order.addProducts(
            products.map((product) => {
              product.orderItem = { quantity: product.cartItem.quantity };
              return product;
            })
          );
        })
        .catch((err) => {
          const error = new Error("Creating a product Failed", err);
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .then((result) => {
      return fetchedCart.setProducts(null);
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  req.user
    .getOrders({ include: ["products"] })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        docTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error("Creating a product Failed", err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findByPk(orderId, { include: ["products"] })
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.userId.toString() !== req.user.id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new pdfDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);
      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("------------------------------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.orderItem.quantity * prod.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.title +
              " - " +
              prod.orderItem.quantity +
              " x " +
              "$" +
              prod.price
          );
      });
      pdfDoc.text("------------------------------------------");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);
      pdfDoc.end();
      // fs.readFile(invoicePath, (err, data) => {     //lee todo el documento para archivos pequeños
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     'attachment; filename="' + invoiceName + '"'
      //   );
      //   res.send(data);
      // });
    })
    .catch((err) => next(err));
};
