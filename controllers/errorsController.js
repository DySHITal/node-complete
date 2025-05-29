exports.pageNotFound = (req, res, next) => {
  res.status(404).render("notfound", {
    docTitle: "404",
    path: "/404",
    isAuthenticated: req.session.isLoggedIn,
  });
};

exports.get500 = (req, res, next) => {
  res.status(500).render("500", {
    docTitle: "500",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
};
