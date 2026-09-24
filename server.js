const express = require("express");
require("dotenv").config();

const app = express();
const path = require("path");
const initDb = require("./BackEnd/BancoDedados.js");
const { router } = require("./BackEnd/Autenticar.js");
const cookieParser = require("cookie-parser");
const ClienteRouter = require("./BackEnd/router/ClienteRouter.js");
const CozinhaRouter = require("./BackEnd/router/CozinhaRouter.js");
const AdminstrcaoRouter = require("./BackEnd/router/AdminstrcaoRouter.js");
const rateLimitd = require("express-rate-limit")

console.log(process.env.senha_padrao);

const limitGeral = rateLimitd({windowMs: 15*60*1000,max:100,message:{status:429,message:"Bloqueado por span!"}})
const limitAuth = rateLimitd({windowMs: 1*60*1000,max:5,message:{status:429,message:"Bloqueado por span!"}})

let BancoDedados;
console.log(path.join(__dirname, ""));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "")));
async function Inciar(params) {
  BancoDedados = await initDb;
}
Inciar();
app.use("/autenticar", limitAuth,router);
app.use("/", limitGeral,ClienteRouter);
app.use("/", limitGeral,CozinhaRouter);
app.use("/", limitGeral,AdminstrcaoRouter);

app.listen(5501, (err) => {
  if (!err) {
    console.log("Servidor inciado com sucesso!");
  } else {
    console.error(err);
  }
});
