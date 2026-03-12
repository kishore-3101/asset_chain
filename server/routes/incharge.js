/*
========================================================
INCHARGE ROUTES
========================================================
*/

const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const QRCode = require("qrcode");


/*
========================================================
1️⃣ GET LAB ASSIGNED TO INCHARGE
========================================================
*/

router.get("/lab/:userId",(req,res)=>{

const userId = req.params.userId;

const sql = `
SELECT labs.id AS lab_id, labs.lab_name
FROM labs
JOIN lab_incharges
ON labs.id = lab_incharges.lab_id
WHERE lab_incharges.user_id = ?
`;

db.query(sql,[userId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

if(result.length === 0){
return res.json({success:false});
}

res.json({
success:true,
lab:result[0]
});

});

});


/*
========================================================
2️⃣ GET REQUESTS FOR INCHARGE
========================================================
*/

router.get("/requests/:inchargeId",(req,res)=>{

const inchargeId = req.params.inchargeId;

const sql = `
SELECT 
borrow_requests.id,
borrow_requests.status,
borrow_requests.created_at,
students.name AS student_name,
labs.lab_name

FROM borrow_requests
JOIN students ON borrow_requests.student_id = students.id
JOIN labs ON borrow_requests.lab_id = labs.id
JOIN lab_incharges ON labs.id = lab_incharges.lab_id

WHERE lab_incharges.user_id = ?
ORDER BY borrow_requests.created_at DESC
`;

db.query(sql,[inchargeId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
requests: result
});

});

});


/*
========================================================
3️⃣ GET SINGLE REQUEST DETAILS
========================================================
*/

router.get("/request/:id",(req,res)=>{

const requestId = req.params.id;

const sql = `
SELECT 
borrow_requests.id,
borrow_requests.status,
students.name,
students.email,
students.department,
students.contact_number
FROM borrow_requests
JOIN students
ON borrow_requests.student_id = students.id
WHERE borrow_requests.id = ?
`;

db.query(sql,[requestId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

if(result.length===0){
return res.json({success:false});
}

const student = result[0];

const itemSql = `
SELECT 
request_items.equipment_id,
request_items.quantity,
request_items.issued_quantity,
equipment.equipment_name
FROM request_items
JOIN equipment
ON request_items.equipment_id = equipment.id
WHERE request_items.request_id = ?
`;

db.query(itemSql,[requestId],(err2,items)=>{

if(err2){
console.log(err2);
return res.status(500).json({success:false});
}

res.json({
success:true,
student,
items
});

});

});

});


/*
========================================================
4️⃣ ISSUE EQUIPMENT
========================================================
*/

router.post("/issue",(req,res)=>{

const {request_id, items} = req.body;

items.forEach(item=>{

if(item.issued_quantity > 0){

db.query(
`UPDATE request_items 
SET issued_quantity=? 
WHERE request_id=? AND equipment_id=?`,
[item.issued_quantity, request_id, item.equipment_id]
);

db.query(
`UPDATE equipment 
SET available_quantity = available_quantity - ?
WHERE id=?`,
[item.issued_quantity, item.equipment_id]
);

}

});

db.query(
`UPDATE borrow_requests SET status='approved' WHERE id=?`,
[request_id]
);


/* Generate return QR */

const returnLink = `http://localhost:3000/return_request.html?id=${request_id}`;

QRCode.toDataURL(returnLink,(err,qr)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

db.query(
`UPDATE borrow_requests SET return_qr=? WHERE id=?`,
[qr, request_id]
);

res.json({
success:true,
return_qr: qr
});

});

});


/*
========================================================
5️⃣ GET RETURN DETAILS
========================================================
*/

router.get("/return-details/:id",(req,res)=>{

const requestId=req.params.id;

db.query(
`SELECT status FROM borrow_requests WHERE id=?`,
[requestId],
(err,status)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

if(!status.length){
return res.json({success:false});
}

if(status[0].status==="returned"){
return res.json({
success:false,
message:"Items already returned"
});
}

const studentSql=`
SELECT students.name,students.email
FROM borrow_requests
JOIN students
ON borrow_requests.student_id=students.id
WHERE borrow_requests.id=?`;

db.query(studentSql,[requestId],(err2,result)=>{

const student=result[0];

const itemSql=`
SELECT request_items.equipment_id,
request_items.issued_quantity,
equipment.equipment_name
FROM request_items
JOIN equipment
ON request_items.equipment_id=equipment.id
WHERE request_items.request_id=?
AND request_items.issued_quantity>0`;

db.query(itemSql,[requestId],(err3,items)=>{

res.json({
success:true,
student,
items
});

});

});

});

});


/*
========================================================
6️⃣ CONFIRM RETURN
========================================================
*/

router.post("/return",(req,res)=>{

const {request_id,items}=req.body;

db.query(
`SELECT status,student_id FROM borrow_requests WHERE id=?`,
[request_id],
(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

if(!result.length){
return res.json({success:false});
}

if(result[0].status==="returned"){
return res.json({
success:false,
message:"Items already returned"
});
}

const student_id=result[0].student_id;

items.forEach(item=>{

const totalReturned =
item.no_damage +
item.light +
item.medium +
item.heavy;


/* restore inventory */

if(totalReturned > 0){

db.query(
`UPDATE equipment
SET available_quantity = available_quantity + ?
WHERE id=?`,
[totalReturned,item.equipment_id]
);

}

/* DAMAGE TRACKING */

if(item.light > 0){

db.query(
`INSERT INTO equipment_damage (equipment_id, light_damage)
VALUES (?,?)
ON DUPLICATE KEY UPDATE light_damage = light_damage + ?`,
[item.equipment_id, item.light, item.light]
);

}

if(item.medium > 0){

db.query(
`INSERT INTO equipment_damage (equipment_id, medium_damage)
VALUES (?,?)
ON DUPLICATE KEY UPDATE medium_damage = medium_damage + ?`,
[item.equipment_id, item.medium, item.medium]
);

}

if(item.heavy > 0){

db.query(
`INSERT INTO equipment_damage (equipment_id, heavy_damage)
VALUES (?,?)
ON DUPLICATE KEY UPDATE heavy_damage = heavy_damage + ?`,
[item.equipment_id, item.heavy, item.heavy]
);

}


/* store penalty */

if(item.penalty > 0){

db.query(
`INSERT INTO penalties
(request_id,student_id,equipment_id,penalty_amount,status)
VALUES (?,?,?,?, 'pending')`,
[
request_id,
student_id,
item.equipment_id,
item.penalty
],
(err)=>{

if(!err){

/* CREATE STUDENT NOTIFICATION */

db.query(
`INSERT INTO notifications
(receiver_id, receiver_role, message, link)
VALUES (?,?,?,?)`,
[
student_id,
"student",
`Penalty of ₹${item.penalty} added`,
"penalties.html"
]
);

}

});

}

});


db.query(
`UPDATE borrow_requests SET status='returned' WHERE id=?`,
[request_id]
);

res.json({
success:true,
message:"Return processed successfully"
});

});

});


/*
========================================================
GET ALL PENALTIES
========================================================
*/

/*
========================================================
GET PENALTIES FOR INCHARGE LAB
========================================================
*/

router.get("/penalties/:inchargeId",(req,res)=>{

const inchargeId = req.params.inchargeId;

const sql = `
SELECT 
p.id,
p.penalty_amount,
p.status,
s.name AS student_name,
e.equipment_name,
l.lab_name

FROM penalties p

JOIN equipment e
ON p.equipment_id = e.id

JOIN labs l
ON e.lab_id = l.id

JOIN lab_incharges li
ON li.lab_id = l.id

JOIN students s
ON p.student_id = s.id

WHERE li.user_id = ?

ORDER BY p.created_at DESC
`;

db.query(sql,[inchargeId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
penalties:result
});

});

});


/*
========================================================
MARK PENALTY AS PAID
========================================================
*/

router.post("/penalty-paid",(req,res)=>{

const { penalty_id } = req.body;

db.query(
`SELECT student_id, penalty_amount FROM penalties WHERE id=?`,
[penalty_id],
(err,result)=>{

if(err || !result.length){
return res.status(500).json({success:false});
}

const student_id = result[0].student_id;
const amount = result[0].penalty_amount;

db.query(
`UPDATE penalties SET status='paid' WHERE id=?`,
[penalty_id],
(err2)=>{

if(err2){
console.log(err2);
return res.status(500).json({success:false});
}

/* CREATE STUDENT NOTIFICATION */

db.query(
`INSERT INTO notifications
(receiver_id, receiver_role, message, link)
VALUES (?,?,?,?)`,
[
student_id,
"student",
`Penalty payment of ₹${amount} received`,
"penalties.html"
]
);

res.json({success:true});

});

});

});


/*
========================================================
GET BORROWED STUDENTS
========================================================
*/

router.get("/borrowed-students/:inchargeId",(req,res)=>{

const inchargeId = req.params.inchargeId;

const sql = `
SELECT 
borrow_requests.id AS request_id,
students.name AS student_name,
borrow_requests.created_at

FROM borrow_requests

JOIN students
ON borrow_requests.student_id = students.id

JOIN labs
ON borrow_requests.lab_id = labs.id

JOIN lab_incharges
ON labs.id = lab_incharges.lab_id

WHERE lab_incharges.user_id = ?
AND borrow_requests.status = 'approved'

ORDER BY borrow_requests.created_at DESC
`;

db.query(sql,[inchargeId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
students:result
});

});

});

/*
========================================================
GET BORROWED DETAILS
========================================================
*/

router.get("/borrowed-details/:requestId",(req,res)=>{

const requestId = req.params.requestId;

const studentSql = `
SELECT students.name,
students.email,
students.department,
students.contact_number
FROM borrow_requests
JOIN students
ON borrow_requests.student_id = students.id
WHERE borrow_requests.id = ?
`;

db.query(studentSql,[requestId],(err,result)=>{

if(err){
return res.status(500).json({success:false});
}

const student = result[0];

const itemSql = `
SELECT equipment.equipment_name,
request_items.issued_quantity
FROM request_items
JOIN equipment
ON request_items.equipment_id = equipment.id
WHERE request_items.request_id = ?
AND request_items.issued_quantity > 0
`;

db.query(itemSql,[requestId],(err2,items)=>{

res.json({
success:true,
student,
items
});

});

});

});
module.exports = router;