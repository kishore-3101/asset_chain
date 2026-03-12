/* ===============================
   LOAD EQUIPMENT STATUS
================================*/

async function loadEquipmentStatus(){

const lab_id = localStorage.getItem("lab_id");

/* wait until lab id is ready */

if(!lab_id){

console.log("Waiting for lab_id...");
setTimeout(loadEquipmentStatus,500);
return;

}

try{

const res = await fetch(`/api/equipment/status/${lab_id}`);
const data = await res.json();

let rows = "";

data.forEach(e=>{

rows += `
<tr>
<td>${e.id}</td>
<td>${e.equipment_name}</td>
<td>${e.total_quantity}</td>
<td>${e.available_quantity}</td>
<td>${e.issued_quantity}</td>
<td class="text-warning">${e.light_damage}</td>
<td class="text-danger">${e.medium_damage}</td>
<td class="text-dark">${e.heavy_damage}</td>
</tr>
`;

});

document.getElementById("equipment_status").innerHTML = rows;

}catch(err){

console.error("Error loading equipment status:",err);

}

}


/* ===============================
   PAGE LOAD
================================*/

document.addEventListener("DOMContentLoaded", ()=>{

loadEquipmentStatus();

});