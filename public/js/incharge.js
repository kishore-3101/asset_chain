/* ===============================
   LOAD LAB INFORMATION
================================*/

async function loadLab(){

const userId = localStorage.getItem("user_id");

if(!userId){
window.location.href = "login.html";
return;
}

try{

const res = await fetch(`/api/incharge/lab/${userId}`);
const data = await res.json();

if(data.success && data.lab){

localStorage.setItem("lab_id", data.lab.lab_id);

const title = document.getElementById("lab_title");

if(title){
title.innerText = data.lab.lab_name + " Dashboard";
}

console.log("Lab ID:", data.lab.lab_id);

}else{

console.log("Lab not found");

}

}catch(err){

console.error("Error loading lab:", err);

}

}


/* ===============================
   NAVIGATION FUNCTIONS
================================*/

function openAddEquipment(){
window.location.href = "add_equipment.html";
}

function openViewEquipment(){
window.location.href = "view_equipment.html";
}

function openStudentRequests(){
window.location.href = "student_requests.html";
}

function openBorrowed(){
window.location.href = "borrowed_items.html";
}

function openPurchaseRequest(){
window.location.href = "equipment_request.html";
}

function openNotifications(){
window.location.href = "notifications.html";
}


/* ===============================
   LOGOUT
================================*/

function logout(){

const confirmLogout = confirm("Are you sure you want to logout?");

if(confirmLogout){

localStorage.clear();
window.location.href = "login.html";

}

}


/* ===============================
   NOTIFICATION COUNT
================================*/

async function loadNotificationCount(){

const user_id = localStorage.getItem("user_id");
const role = localStorage.getItem("role");

try{

const res = await fetch(`/api/notifications/count/${user_id}/${role}`);
const data = await res.json();

const badge = document.getElementById("notif_count");

if(!badge) return;

if(data.count > 0){

badge.innerText = data.count;
badge.style.display = "inline-block";

}else{

badge.style.display = "none";

}

}catch(err){

console.error("Notification count error:",err);

}

}


/* ===============================
   PAGE INITIALIZATION
================================*/

document.addEventListener("DOMContentLoaded", ()=>{

loadLab();
loadNotificationCount();

});