import express from "express";
import bodyParser from "body-parser";
import {dirname} from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import db from './db.js';
import ejs from "ejs";
import session from "express-session";

const port=3000;
const app = express();
const __dirname =   dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());

app.use(express.static(__dirname));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie:{
    maxAge:1000*60*10,
  }
}));

const checkLoggedIn = (req, res, next) => {
  if (req.session.username) {
      next();
  } else {
    res.render(__dirname+"/login.ejs",{message :"session timed out, kindly login again"});
  }
};

app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/welcome.html");
});

app.get("/login", (req,res)=>{
    res.render(__dirname+"/login.ejs",{message :""});
});

app.post("/login",async(req,res)=>{

    const {username,password} = req.body;

    try
    {
      const user = await db.query('SELECT * FROM users WHERE username = $1',[username]);

      if(user.rows.length === 0)
      {
          console.log("no user found"); 
          res.render(__dirname +"/login.ejs",{message: "No user found"});
      }
      else
      { 

          const passwordMatch = await bcrypt.compare(password, user.rows[0].password);
          
          if(passwordMatch)
          {  
              req.session.username = username;
              res.render(__dirname+"/afterlogin.ejs",{message:""});
          }
          else
          {
              console.log("invalid login");
              res.render(__dirname +"/login.ejs",{message: "Invalid username or password"});
          }
      }
    }
    catch(error)
    {
      res.render(__dirname +"/login.ejs",{message: "an error occured"});
      console.error(error);
    }
});

app.get("/signup", (req,res)=>{
  res.render(__dirname+"/signup.ejs",{message :""});
});


app.post("/signup",async (req,res)=>
{

    const {username,password,cpassword} = req.body;

    const passwordRegex = /^.{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.render(__dirname + "/signup.ejs", {
            message: "Password must be at least 8 characters long."
        });
    }


    try
    {

      const existingUser = await db.query('SELECT * FROM users WHERE username = $1',[username] );

      if(existingUser.rows.length>0)
      {
          console.log("username taken !")
          res.render(__dirname+"/signup.ejs",{message:"Username already taken !"})
      }
      else
      {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
          'INSERT INTO users (username,password) VALUES ($1,$2) RETURNING *',
          [username,hashedPassword]
        );
        res.render(__dirname+"/login.ejs",{message:"Successfully signed up. Kindly login again"});
      }
    }
    catch(error)
    {
      res.render(__dirname+'/login.ejs',{message:"an error occured, Please try again."})
      console.error('error',error);
    }
});

app.get("/new_complaint",(req,res)=>
{
  res.render(__dirname+"/new.ejs",{message:""});
})


app.post("/new_complaint",checkLoggedIn,async(req,res)=>
{   

    const {name,regno,email,phone,room,nature,desp} = req.body;

    try{

      const uname=req.session.username;
      const complaint = await db.query(
        'INSERT INTO complaints (name,uname,regno,email,phone,room,nature,desp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [name,uname,regno,email,phone,room,nature,desp] );
        console.log(complaint.rows[0]);
        res.render(__dirname+"/afterlogin.ejs",{message:"Complaint registered."});
    }
    catch(error)
    {
      if(error.code==='23503' && error.constraint==="complaints_uname_fkey")
      {
        res.render(__dirname+"/new.ejs",{message:"Incorrect Username. Please try again"})
      }
      else
      {
        console.log(error);
        res.render(__dirname+"/new.ejs",{message:"An error occured. Please try again"})
      }  
    }
});

app.get("/view_complaint",checkLoggedIn,async(req,res)=>
{
    try
    {
        const view = await db.query('SELECT * FROM complaints WHERE uname = $1',[req.session.username]);
        console.log(view.rows);
    }
    catch(error)
    {
      console.log(error);
    }
});


app.listen(port,()=>
{
    console.log("running on port 3000");
});


