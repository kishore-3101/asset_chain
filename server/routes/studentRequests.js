const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const QRCode = require("qrcode");

/* =====================================================
   SUBMIT EQUIPMENT REQUEST
===================================================== */

router.post("/submit-request", (req, res) => {

const { student_id, lab_id, items } = req.body;

const sql = `
INSERT INTO borrow_requests (student_id, lab_id)
VALUES (?,?)
`;

db.query(sql, [student_id, lab_id], async (err, result) => {

if (err) {
console.log(err);
return res.status(500).json({ success:false });
}

const requestId = result.insertId;

const itemSql = `
INSERT INTO request_items (request_id,equipment_id,quantity)
VALUES ?
`;

const values = items.map(item => [
requestId,
item.equipment_id,
item.quantity
]);

db.query(itemSql, [values], async (err2) => {

if (err2) {
console.log(err2);
return res.status(500).json({ success:false });
}

try {

const qrData = `http://localhost:3000/incharge/request/${requestId}`;

const qrImage = await QRCode.toDataURL(qrData);

db.query(
`UPDATE borrow_requests SET qr_code=? WHERE id=?`,
[qrImage, requestId]
);

res.json({
success:true,
request_id: requestId,
qr: qrImage
});

} catch (error) {

console.log(error);

res.status(500).json({
success:false,
message:"QR generation failed"
});

}

});

});

});


/* =====================================================
   GET PICKUP QR
===================================================== */

router.get("/request-qr/:id",(req,res)=>{

const requestId = req.params.id;

db.query(
`SELECT qr_code, status FROM borrow_requests WHERE id=?`,
[requestId],
(err,result)=>{

if(err) return res.status(500).json({success:false});

res.json({
success:true,
qr: result[0].qr_code,
status: result[0].status
});

});

});


/* =====================================================
   GET STUDENT REQUEST HISTORY
===================================================== */

router.get("/my-requests/:studentId",(req,res)=>{

const studentId = req.params.studentId;

const sql = `
SELECT 
borrow_requests.id,
borrow_requests.status,
borrow_requests.created_at,
labs.lab_name
FROM borrow_requests
JOIN labs ON borrow_requests.lab_id = labs.id
WHERE borrow_requests.student_id=?
ORDER BY borrow_requests.created_at DESC
`;

db.query(sql,[studentId],(err,result)=>{

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


/* =====================================================
   GET REQUEST DETAILS
===================================================== */

router.get("/request-details/:id",(req,res)=>{

const requestId = req.params.id;

const sql = `
SELECT equipment.equipment_name, request_items.quantity
FROM request_items
JOIN equipment
ON request_items.equipment_id = equipment.id
WHERE request_items.request_id=?
`;

db.query(sql,[requestId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
items: result
});

});

});


/* =====================================================
   GET BORROWED DETAILS
===================================================== */

router.get("/borrowed-details/:id",(req,res)=>{

const requestId = req.params.id;

const sql = `
SELECT equipment.equipment_name, request_items.issued_quantity
FROM request_items
JOIN equipment
ON request_items.equipment_id = equipment.id
WHERE request_items.request_id=? AND request_items.issued_quantity > 0
`;

db.query(sql,[requestId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
items: result
});

});

});


/* =====================================================
   GET RETURN QR
===================================================== */

router.get("/return-qr/:id",(req,res)=>{

const requestId = req.params.id;

db.query(
`SELECT return_qr,status FROM borrow_requests WHERE id=?`,
[requestId],
(err,result)=>{

if(err) return res.status(500).json({success:false});

if(result[0].status!=="approved"){
return res.json({
success:false,
message:"Return QR not available yet"
});
}

res.json({
success:true,
return_qr: result[0].return_qr
});

});

});

//penalty route

/*
========================================================
GET STUDENT PENALTIES
========================================================
*/

router.get("/penalties/:studentId",(req,res)=>{

const studentId = req.params.studentId;

const sql = `
SELECT 
penalties.id,
penalties.penalty_amount,
penalties.status,
equipment.equipment_name,
borrow_requests.id AS request_id

FROM penalties

JOIN equipment 
ON penalties.equipment_id = equipment.id

JOIN borrow_requests
ON penalties.request_id = borrow_requests.id

WHERE penalties.student_id = ?

ORDER BY penalties.id DESC
`;

db.query(sql,[studentId],(err,result)=>{

if(err){
console.log(err);
return res.status(500).json({success:false});
}

res.json({
success:true,
penalties: result
});

});

});

module.exports = router;