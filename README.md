
# 🛡️ CyberWatch - SOC Dashboard & Surveillance System : 
CyberWatch is a centralized Security Operations Center (SOC) dashboard designed to simulate real-time security monitoring. It allows security analysts to track assets, view live logs, and manage incident tickets in a responsive, dark-themed interface.
## 🚀 Features :  
Real-Time Dashboard: View active security tickets with status indicators and severity levels.
Live Log Terminal: A "Matrix-style" scrolling log viewer that simulates incoming network traffic and security events in real-time.
Ticket Management: 
  Create: Open new incident tickets via a modal form.
  Update: Change ticket status (Open/Resolved) with a single click.
  Delete: Remove tickets from the database.
Asset Management: Automatically detects and registers new "assets" (machines) when logs are received from unknown IPs.
Python Log Agent: A dedicated Python script that generates realistic dummy logs (Info, Warning, Critical) to simulate network activity.
Responsive Design: Optimized for desktop and mobile (Card View on small screens).
## 🛠️ Tech Stack : 
  Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)
  Backend: Node.js, Express.js
  Database: SQLite3 (Lightweight, serverless)
  Simulation: Python 3 (Log Generation Agent)
## 📂 Project Structure:
cyberwatch/
├── public/             # Static frontend files (HTML, CSS, JS)
│   ├── index.html      # Login Page
│   ├── dashboard.html  # Main SOC Dashboard
│   ├── styles.css      # Custom Dark UI Styling
│   └── app.js          # Frontend Logic (Fetch API, DOM Manipulation)
├── static/
│   └── agent.py        # Python script to generate fake logs
├── server.js           # Node.js Express API Server
├── cyberwatch.db       # SQLite Database (Auto-created)
├── package.json        # Node dependencies
└── README.md           # Project Documentation
## ⚙️ Installation :
Clone the repositoryBashgit clone https://github.com/YOUR_USERNAME/cyberwatch.git
cd cyberwatch
Install Node.js Dependencies $ npm install 
Set up the Python Environment (Optional but recommended)
Ensure you have Python installed. You may need requests for the agent to work.
$ pip install requests
## 🖥️ Usage:
To run the full system, you need to start the Server (to host the dashboard) and the Agent (to create traffic).
1. Start the Backend ServerOpen a terminal in the project folder:Bashnode server.js
The server will run on http://localhost:3000.
Open your browser and login to the dashboard.
3. Start the Log Generator (Agent)
4. Open a second terminal window:Bashpython static/agent.py
This script acts as a "network sensor," sending random logs (System checks, Auth failures, Malware alerts) to your server every few seconds.
Go back to your Dashboard; you should see the Live Logs terminal updating automatically!
## 📡 API Endpoints:
The backend provides a RESTful API for the frontend and agents.

Method  Endpoint  Description  
GET    /incidents Retrieve all security tickets
POST  /incidents  Create a new incident ticket
PUT   /incidents/:id  Update ticket status or details
DELETE /incidents/:id  Delete a ticket permanently
GET   /logs         Fetch the latest system logs
POST  /logs        Receive new logs from the Python agent

## 📸 Screenshots:

<img width="1366" height="639" alt="image" src="https://github.com/user-attachments/assets/9e9cfc2a-6fe1-4c4c-bae2-dd4476c66394" />


<img width="1366" height="1291" alt="image" src="https://github.com/user-attachments/assets/160ed0e9-82db-46e9-9609-d1a945639630" />

<img width="1366" height="682" alt="image" src="https://github.com/user-attachments/assets/5c062b85-c478-4533-a750-78f5e7db2be2" />

<img width="1352" height="638" alt="image" src="https://github.com/user-attachments/assets/ef1f85f4-0278-4235-8748-9afeaa4f3a5d" />

<img width="1366" height="639" alt="image" src="https://github.com/user-attachments/assets/60b88386-4193-4170-a093-a188ef053cba" />








