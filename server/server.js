const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

/* ===============================
   MIDDLEWARE
================================*/

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


/* ===============================
   STATIC FILES
================================*/

/* frontend */

app.use(express.static(path.join(__dirname, "../public")));

/* uploaded invoices */

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


/* ===============================
   ROUTES IMPORT
================================*/

const authRoutes = require("./routes/auth");

const labRoutes = require("./routes/labs");

const inchargeRoutes = require("./routes/incharge");

const equipmentRoutes = require("./routes/equipment");

const requestRoutes = require("./routes/requests");


/* ===============================
   API ROUTES
================================*/

app.use("/api/auth", authRoutes);

app.use("/api/labs", labRoutes);

app.use("/api/incharge", inchargeRoutes);

app.use("/api/equipment", equipmentRoutes);

app.use("/api/requests", requestRoutes);


/* ===============================
   DEFAULT ROUTE
================================*/

app.get("/", (req, res) => {

res.sendFile(path.join(__dirname, "../public/login.html"));

});


/*==============================
      NOTIFICATION ROUTE
===============================*/
const notificationRoutes = require("./routes/notifications");

app.use("/api/notifications",notificationRoutes);
//remainder route
require("./utils/remainder");

//for incharge

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server,{
cors:{
origin:"*"
}
});

global.io = io;

io.on("connection",(socket)=>{

console.log("User connected:",socket.id);

socket.on("disconnect",()=>{
console.log("User disconnected");
});

});


/* ===============================
   SERVER START
================================*/

const PORT = 3000;

app.listen(PORT, () => {

console.log(`🚀 Server running at http://localhost:${PORT}`);

});