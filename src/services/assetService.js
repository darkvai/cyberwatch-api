const Asset = require('../models/asset');


exports.discoverAndRegisterAsset = async (hostname, ip_address) => {
    // Standardize hostname to lowercase to prevent duplicates (e.g., DESKTOP vs desktop)
    const normalizedHostname = hostname.toLowerCase();

    return await Asset.findOneAndUpdate(
        { hostname: normalizedHostname },
        { 
            $set: { ip_address: ip_address },
            $setOnInsert: { criticality: 'Medium' } // Only sets on brand new assets
        },
        { 
            upsert: true, // Creates the document if it doesn't exist
            new: true,    // Returns the updated document to the controller
            setDefaultsOnInsert: true 
        }
    );

    
};

exports.getAllAssets = async ()=>{
    return await Asset.find().sort({ createdAt: -1 });
}