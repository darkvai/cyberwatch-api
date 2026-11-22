

const {normalizePayload , mapSeverity , saveLog , searchLog} = require('../services/logsIngestionService.js');
const {discoverAndRegisterAsset} = require('../services/assetService.js')




// @desc    Receive logs from the Python Agent
// @route   POST /api/logs
exports.receiveLog = async (req, res) => {
    try {
        // 1. Unpack the clean validated log from req
        const Log = req.cleanLog;

        // 2. ASSET DISCOVERY (Check if the machine already exists)
        const asset = discoverAndRegisterAsset(Log.hostname,Log.ip_address);

        // 3. LOG STORAGE (Save the actual event)
 
        const savedLog = await saveLog(asset,Log);



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
        const logs = await searchLog();

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: 'Server error retrieving logs.' });
    }
};