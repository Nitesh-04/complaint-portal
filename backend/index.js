import express from "express";
import bodyParser from "body-parser";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import db from './db.js';
import session from "express-session";

const port = 3000;
const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, '../frontend'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(join(__dirname, '../frontend')));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 *24  ,
  }
}));

const checkLoggedIn = (req, res, next) => {
  if (req.session.username) {
    next();
  } else {
    res.render('login', { message: "Session timed out, kindly login again" });
  }
};

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, '../frontend', 'welcome.html'));
});

app.get("/login", (req, res) => {
  res.render('login', { message: "" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      console.log("no user found");
      res.render('login', { message: "No user found" });
    } else {
      const passwordMatch = await bcrypt.compare(password, user.rows[0].password);

      if (passwordMatch) {
        req.session.username = username;
        res.render('afterlogin', { message: "" });
      } else {
        console.log("invalid login");
        res.render('login', { message: "Invalid username or password" });
      }
    }
  } catch (error) {
    res.render('login', { message: "An error occurred" });
    console.error(error);
  }
});

app.get("/signup", (req, res) => {
  res.render('signup', { message: "" });
});

app.post("/signup", async (req, res) => {
  const { username, password, cpassword } = req.body;

  const passwordRegex = /^.{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.render('signup', {
      message: "Password must be at least 8 characters long."
    });
  }

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (existingUser.rows.length > 0) {
      console.log("username taken!");
      res.render('signup', { message: "Username already taken!" });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
        [username, hashedPassword]
      );
      res.render('login', { message: "Successfully signed up. Kindly login again" });
    }
  } catch (error) {
    res.render('signup', { message: "An error occurred, Please try again." });
    console.error('error', error);
  }
});

app.get("/new_complaint", checkLoggedIn, (req, res) => {
  res.render('new', { message: "" });
});

app.post("/new_complaint", checkLoggedIn, async (req, res) => {
  const { name, regno, email, phone, room, nature, desp } = req.body;

  try {
    const uname = req.session.username;
    const complaint = await db.query(
      'INSERT INTO complaints (name, uname, regno, email, phone, room, nature, desp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, uname, regno, email, phone, room, nature, desp]
    );
    console.log(complaint.rows[0]);
    res.render('afterlogin', { message: "Complaint registered." });
  } catch (error) {
    if (error.code === '23503' && error.constraint === "complaints_uname_fkey") {
      res.render('new', { message: "Incorrect Username. Please try again" });
    } else {
      console.log(error);
      res.render('new', { message: "An error occurred. Please try again" });
    }
  }
});

app.get("/view_complaint", checkLoggedIn, async (req, res) => {
  try {
    const view = await db.query('SELECT * FROM complaints WHERE uname = $1', [req.session.username]);
    res.render('complaint',{complaints : view.rows});
  } catch (error) {
    console.log(error);
    res.render('complaint', { complaints: [] })
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
