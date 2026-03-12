const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

/*
========================================
GET LAB REPORT DATA
========================================
*/

router.post("/lab-report", (req, res) => {

const { labs } = req.body;

if (!labs || labs.length === 0) {
return res.json({ success: false });
}

const labSql = `
SELECT id, lab_name
FROM labs
WHERE id IN (?)
`;

db.query(labSql, [labs], (err, labsResult) => {

if (err) {
console.log(err);
return res.status(500).json({ success: false });
}

let report = [];
let pending = labsResult.length;

labsResult.forEach(lab => {

/* GET INCHARGES */

const inchargeSql = `
SELECT users.name, users.email
FROM lab_incharges
JOIN users
ON lab_incharges.user_id = users.id
WHERE lab_incharges.lab_id = ?
`;

db.query(inchargeSql, [lab.id], (err2, incharges) => {

/* GET EQUIPMENT STATUS */

const equipmentSql = `
SELECT

e.equipment_name,

e.total_quantity AS total,

e.available_quantity AS available,

(e.total_quantity - e.available_quantity) AS issued,

IFNULL(ed.light_damage,0) AS light,

IFNULL(ed.medium_damage,0) AS medium,

IFNULL(ed.heavy_damage,0) AS heavy

FROM equipment e

LEFT JOIN equipment_damage ed
ON ed.equipment_id = e.id

WHERE e.lab_id = ?
`;

db.query(equipmentSql, [lab.id], (err3, equipment) => {

report.push({
lab_name: lab.lab_name,
incharges: incharges || [],
equipment: equipment || []
});

pending--;

if (pending === 0) {
res.json({
success: true,
report
});
}

});

});

});

});

});


/*
========================================
EXPORT EXCEL
========================================
*/

router.post("/export-excel", async (req, res) => {

const { data } = req.body;

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Lab Report");

sheet.columns = [
{ header: "Equipment", key: "equipment", width: 25 },
{ header: "Total", key: "total", width: 10 },
{ header: "Available", key: "available", width: 12 },
{ header: "Issued", key: "issued", width: 10 },
{ header: "Light", key: "light", width: 10 },
{ header: "Medium", key: "medium", width: 10 },
{ header: "Heavy", key: "heavy", width: 10 }
];

data.forEach(lab => {

/* Lab Name */

sheet.addRow({});
sheet.addRow({ equipment: `Lab: ${lab.lab_name}` });

/* Incharges */

sheet.addRow({ equipment: "Lab Incharges:" });

lab.incharges.forEach(i => {
sheet.addRow({ equipment: `${i.name} (${i.email})` });
});

sheet.addRow({});

/* Equipment Header */

sheet.addRow({
equipment: "Equipment",
total: "Total",
available: "Available",
issued: "Issued",
light: "Light",
medium: "Medium",
heavy: "Heavy"
});

/* Equipment rows */

lab.equipment.forEach(e => {

sheet.addRow({
equipment: e.equipment_name,
total: e.total,
available: e.available,
issued: e.issued,
light: e.light,
medium: e.medium,
heavy: e.heavy
});

});

sheet.addRow({});
sheet.addRow({});

});

sheet.getRow(1).font = { bold: true };

res.setHeader(
"Content-Type",
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);

res.setHeader(
"Content-Disposition",
"attachment; filename=lab_report.xlsx"
);

await workbook.xlsx.write(res);
res.end();

});


/*
========================================
EXPORT PDF
========================================
*/

router.post("/export-pdf", (req, res) => {

const { data } = req.body;

const doc = new PDFDocument({ margin: 40 });

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", "attachment; filename=lab_report.pdf");

doc.pipe(res);

/* Title */

doc.fontSize(20).text("Lab Equipment Report", { align: "center" });
doc.moveDown(2);

data.forEach(lab => {

doc.fontSize(16).text(`Lab: ${lab.lab_name}`);

doc.moveDown();

/* Incharges */

doc.fontSize(13).text("Lab Incharges:");

lab.incharges.forEach(i => {
doc.text(`${i.name} (${i.email})`);
});

doc.moveDown();

/* Equipment Table */

doc.text("Equipment Status");
doc.moveDown();

lab.equipment.forEach(e => {

doc.text(
`${e.equipment_name} | Total: ${e.total} | Available: ${e.available} | Issued: ${e.issued} | Light: ${e.light} | Medium: ${e.medium} | Heavy: ${e.heavy}`
);

});

doc.moveDown();
doc.text("-------------------------------------------");
doc.moveDown();

});

doc.end();

});

module.exports = router;