// ----------DECLARATION DES VARIABLE ET CONSTANTES -----------

const API_URL='http://localhost:3000/incidents';
const LOG_URL='http://localhost:3000/api/logs';

var array_lenght = 0;
var table_size = 10;
let alltickets = [];
let currentTickets = [];
var curent_index = 0;
var max_index = 0;
var user_id;





// -----------------FUCNTION POUR ACCEDER AUX TICKETS DANS LA BASE DE DONNEES------------------

async function get_tickets(){
    const response = await fetch(API_URL, {
        credentials: 'include' // <-- ADD THIS LINE TO EVERY FETCH CALL
    });
    const data = await response.json()
    let ticknum = document.querySelector(".number-tick");
    let tickopen = document.querySelector(".number-open");
    let tickres = document.querySelector(".number-res");
    alltickets = data;
    currentTickets = data;
    var count_res =0;
    var count_unres =0;
    array_lenght = data.length;
    data.forEach(element =>{

        if (element.status==='pending'||element.status==="Open"){
           count_unres = count_unres +1;
        }else{
            count_res = count_res +1;
        }
        tickopen.textContent = count_unres;
        tickres.textContent = count_res;
    })



    ticknum.textContent = data.length;
    curent_index = 1; 
    displayIndexButton(); 
   
    render_tickets();
}

//-------------------FONCTION POUR AFFICHER LES LOGS EN TEMPS REEL-------------------

async function get_logs(){
const response = await fetch(LOG_URL, {
        credentials: 'include' // <-- ADD THIS LINE TO EVERY FETCH CALL
    });    const data = await response.json()
    let terminal = document.getElementById('logs_display');

    terminal.textContent =JSON.stringify(data,null,2)
}

//-----------------FONCTION POUR AFFICHER LES BUTTONS DES PAGINATION---------------------


function displayIndexButton(){
    $(".index_buttons button").remove();
    $(".index_buttons").append('<button onclick="prev();">Previous</button>');

    for(var i=1 ;i<= (Math.ceil(array_lenght/table_size));i++){
        $(".index_buttons").append('<button index="'+i+'" class="page-btn">'+i+'</button>')
    }

    $(".index_buttons").append('<button onclick="next();">Next</button>');

    $(".page-btn").on("click", function(){
        
        var pageNum = $(this).attr("index");
        
        curent_index = parseInt(pageNum);
        render_tickets();
    });
    
}

//-----------------FONCTION QUI INDIQUE QUELLE BUTTON DE PAGINATION EST ACTIF------------------
function highlightIndexButton(){

    if(end_index> array_lenght){
        end_index = array_lenght;
    }
    $(".footer span").text('Showing '+(strt_index + 1)+'-'+(end_index)+" of "+array_lenght+" tickets")
    $(".index_buttons button").removeClass('active');
    $(".index_buttons button[index='"+curent_index+"']").addClass('active');

}

//---------------FONCTION POUR AFFICHER LES TICKETS DANS LE TABLEAU----------------
function render_tickets(){
    strt_index = (curent_index-1)*table_size;
    end_index = strt_index +table_size;
    const sliced_items = currentTickets.slice(strt_index,end_index);
    const tableBody = document.querySelector("table tbody");
    tableBody.innerHTML = "";
    sliced_items.forEach(element => {
    if (element.status === "pending"){
        const newRow = document.createElement("tr");

    newRow.innerHTML = `
        <td>#${element.id || "Pending"}</td>
        <td><a href="/profile">#${user_id}</a></td>
        <td>${element.title}</td>
        <td>${element.status || "Open"}</td>
        <td>${element.severity}</td>
        <td>#${element.asset_id}</td>
        <td>${element.created_at}</td>
        <td>${element.description}</td>
        <td class="action-cell">
            <button 
                class="action-btn btn-delete" 
                onclick="deleteTicket(${element.id})"
            >
                🗑️
            </button>
            <button
                class="action-btn btn-resolve"
                onclick="updateTicket(${element.id})">
                ✅
            </button>
        </td>
    `;
    tableBody.appendChild(newRow);

    } else{
    const newRow = document.createElement("tr");

    newRow.innerHTML = `
        <td>#${element.id || "Pending"}</td>
        <td><a href="/profile">#${user_id}</a></td>
        <td>${element.title}</td>
        <td>${element.status || "Open"}</td>
        <td>${element.severity}</td>
        <td>#${element.asset_id}</td>
        <td>${element.created_at}</td>
        <td>${element.description}</td>
        <td class="action-cell">
            <button 
                class="action-btn btn-delete" 
                onclick="deleteTicket(${element.id})"
            >
                🗑️
            </button>
        </td>
    `;
    tableBody.appendChild(newRow);};
    });
     highlightIndexButton();
}


//------------------FONCTION POUR AFFICHER LA PAGE SUIVANTE DANS LE TABLEAU--------------------

function next(){
    if(curent_index<Math.ceil(array_lenght/table_size)){
        curent_index ++;
        render_tickets();
    }
}
//------------------FONCTION POUR AFFICHER LA PAGE PRECEDENTE DANS LE TABLEAU--------------------

function prev(){
    if(curent_index> 1){
        curent_index --;
        render_tickets();

    }
}

//-------------------FONCTION DU FILTRAGE DANS LE TABLEAU-------------------
function applyTicketFilter() {
    const filterValue = document.getElementById('ticketFilter').value;
    
    if (filterValue === 'all') {
        currentTickets = [...alltickets]; 
    } else {
        currentTickets = alltickets.filter(ticket => 
            ticket.severity && ticket.severity.toLowerCase() === filterValue
        );
    }
    array_lenght = currentTickets.length;
    curent_index = 1;
    displayIndexButton(); 
    render_tickets();
    
}

//------------FONCTION POUR SUPPRIMER UN TICKET-----------------

async function deleteTicket(id) {
    // 1. Safety Check
    if (!confirm("Are you sure you want to delete this ticket? This cannot be undone.")) {
        return;
    }

    try {
        // 2. Send DELETE request
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            credentials:'include'
        });

        if (response.ok) {
            // 3. Refresh the table
            get_tickets();
        } else {
            alert("Error deleting ticket");
            render_tickets();
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}
//---------------FONCTION POUR MISE A JOUR DU STATUS DU TICKET----------------

async function updateTicket(id) {
    // 1. Safety Check
    if (!confirm("Is this Ticket resolved ?")) {
        return;
    }

    try {
        // 2. Send DELETE request
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            credentials:'include'
        });

        if (response.ok) {
            // 3. Refresh the table
            get_tickets();
        } else {
            alert("Error updating ticket");
            render_tickets();
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}
async function populateAssetDropdown() {
    try {
        const response = await fetch('http://localhost:3000/api/assets', {
        credentials: 'include' // <-- ADD THIS LINE TO EVERY FETCH CALL
    });
        const assets = await response.json();
        
        const assetSelect = document.getElementById('asset');
        
        // 1. Reset the dropdown and add a default placeholder
        assetSelect.innerHTML = '<option value="" disabled selected>Select an affected asset...</option>';

        // 2. Loop through the database results and create HTML options
        assets.forEach(asset => {
            const option = document.createElement('option');
            // The hidden value sent to the backend
            option.value = asset._id; 
            // The friendly text shown to the analyst
            option.textContent = `${asset.hostname} (${asset.ip_address})`; 
            
            assetSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading assets:", error);
    }
}

// Call this function right after userprofile() and get_tickets() at the bottom of app.js


// === LOGIN FORM HANDLER ===
const loginForm = document.getElementById('loginForm');

// The 'if' statement ensures this code only runs if we are actually on the login page
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the browser from doing a classic white-screen reload

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // Send the login request to the server
            const response = await fetch('/', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Tell the browser to save the JWT cookie
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                // SUCCESS: Manually redirect the user to the dashboard
                window.location.href = '/dashboard'; 
            } else {
                // FAIL: Show an error without leaving the page
                alert("Invalid username or password. Please try again.");
            }
        } catch (error) {
            console.error("Login request failed:", error);
        }
    });
}







get_logs();
userprofile();
get_tickets()
populateAssetDropdown();
setInterval(get_logs,500);
  
//--------CREATION DES TICKETS--------

        const modal = document.getElementById("ticketModal");
        const btn = document.getElementById("Create-tick");
        const span = document.getElementsByClassName("close-btn")[0];
        const formel = document.querySelector('.form');

        btn.onclick = function(event) {
            event.preventDefault();
            modal.style.display = "block";
        }

        span.onclick = function() {
            modal.style.display = "none";
            window.location.reload();
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
                window.location.reload();
            }
        }

        formel.addEventListener("submit", (event)=>{
            event.preventDefault();

            if (modal) modal.style.display = "none"; 
            const formData = new FormData(formel);
            const data = Object.fromEntries(formData);
            fetch('http://localhost:3000/incidents/',{
                method: 'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body: JSON.stringify(data),
                credentials:'include'
            }).then(response => {
            if (response) {
                formel.reset(); 
                modal.style.display = "none";
                window.location.reload();
                console.log("Success!");
             
            } else {
                console.error("Server Error:", response.statusText);
            }
        })
        .catch(error => console.error("Network Error:", error));
    });


      










