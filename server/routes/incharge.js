const express = require("express");
const router = express.Router();
const db = require("../db/connection");

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
return res.status(500).json(err);
}

if(result.length === 0){
return res.json({ lab_name:"Unknown Lab" });
}

res.json(result[0]);

});

});

module.exports = router;