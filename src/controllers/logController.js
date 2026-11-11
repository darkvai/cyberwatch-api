const LogEvent = require('../models/logEvent');
const Asset = require('../models/asset'); // Make sure your Asset model is created!
const Incident = require('../models/incident');

const {normalizePayload , mapSeverity} = require('../services/logsIngestionService.js');




// @desc    Receive logs from the Python Agent
// @route   POST /api/logs
exports.receiveLog = async (req, res) => {
    try {
        // 1. Unpack the incoming JSON payload (The DTO extraction)
        const { hostname, ip_address, event_type, message, severity } = normalizePayload(req);

        // 2. ASSET DISCOVERY (Check if the machine already exists)
        let asset = await Asset.findOne({ hostname: hostname });

        if (!asset) {
            // If it's a new machine on the network, register it automatically
            asset = new Asset({
                hostname: hostname,
                ip_address: ip_address,
                criticality: 'Medium' // Default for auto-discovered assets
            });
            await asset.save();
            console.log(`🌐 New asset discovered and registered: ${hostname}`);
        } else if (asset.ip_address !== ip_address) {
            // Update IP if the hostname exists but IP changed (like DHCP)
            asset.ip_address = ip_address;
            await asset.save();
        }

        // 3. LOG STORAGE (Save the actual event)
        const newLog = new LogEvent({
            asset_id: asset._id, // Link to the MongoDB ObjectId
            event_type: event_type,
            message: message,
            severity: severity
        });

        const savedLog = await newLog.save();

        // 4. SOC AUTOMATION (The "War Room" Logic)
        // Automatically open a ticket if the agent sends a dangerous log


        // 5. Acknowledge Receipt back to the Python Agent
        res.status(201).json({ 
            message: 'Log received and processed successfully', 
            logId: savedLog._id 
        });

    } catch (error) {
        console.error("Error processing incoming log:", error);
        res.status(500).json({ error: "Internal Server Error while processing log." });
    }
};

// @desc    Get the latest logs for the frontend dashboard
// @route   GET /api/logs
exports.getLogs = async (req, res) => {
    try {
        // Fetch logs, populate the Asset data, sort by newest, and limit to 100 
        // to prevent crashing the browser if the agent has been running for days
        const logs = await LogEvent.find()
            .populate('asset_id', 'hostname ip_address')
            .sort({ createdAt: -1 })
            .limit(100); 

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: 'Server error retrieving logs.' });
    }
};