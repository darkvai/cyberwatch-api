const {z} = require("zod");
const {normalizePayload} = require('../services/logsIngestionService');


const logSchema = z.object({
    hostname: z.string().min(1, "Hostname is required"),
    // Accepts standard IPs, falls back to basic string length for internal network edge cases
    ip_address: z.string().ipv4("Invalid IP address format").or(z.string().min(7)), 
    event_type: z.string().min(1, "Event type is required"),
    message: z.string().default("No message provided"),
    // Enforce strict Enum mapping to prevent typos in the DB
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    command_line: z.string().nullable().optional()



})

exports.validateLog = (req,res,next)=>{
    try{
    const normalizedLog = normalizePayload(req.body);

    const validData = logSchema.parse(normalizedLog);

    req.cleanLog = validData;
    next();
    }
    catch(error){
        if (error.name === 'ZodError') {
            return res.status(400).json({ 
                error: 'Malformed log payload', 
                issues: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
            });
        }
        
        // Catch normalizer errors (e.g., "Unsupported log format")
        return res.status(400).json({ error: error.message });
    }
};