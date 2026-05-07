const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import your models 
const Asset = require('./src/models/asset');
const Analyst = require('./src/models/analyst');
const Incident = require('./src/models/incident');

async function seedDatabase() {
    try {
        // 1. Connect directly to your local database
        await mongoose.connect('mongodb://localhost:27017/cyberwatch');
        console.log('Connected to MongoDB for seeding...');

        // 2. Clear out any old test data to start fresh
        await Asset.deleteMany({});
        await Analyst.deleteMany({});
        await Incident.deleteMany({});
        console.log('Cleaned up old database collections...');

        // 3. Create a Test Analyst (Hashing the password!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const testAnalyst = await Analyst.create({
            username: 'admin',
            password: hashedPassword,
            name: 'Reda', // Customizing it for your dashboard!
            role: 'Lead SOC Analyst'
        });
        console.log('✅ Analyst created -> Username: admin | Password: password123');

        // 4. Create Mock Assets for your dropdown
        const assets = await Asset.insertMany([
            { hostname: 'web-server-01', ip_address: '192.168.1.50', criticality: 'High' },
            { hostname: 'db-primary', ip_address: '10.0.0.5', criticality: 'Critical' },
            { hostname: 'firewall-ext', ip_address: '172.16.254.1', criticality: 'High' },
            { hostname: 'workstation-ab', ip_address: '192.168.100.22', criticality: 'Low' }
        ]);
        console.log('✅ Mock Assets injected...');

        // 5. Create one initial Incident Ticket
        await Incident.create({
            title: 'Multiple Failed Root Logins',
            description: 'Detected 50+ failed SSH attempts targeting the primary database from an external IP.',
            severity: 'High',
            status: 'Open',
            analyst_id: testAnalyst._id,
            asset_id: assets[1]._id // Links to db-primary
        });
        console.log('✅ Initial Incident Ticket created...');

        console.log('\n🚀 Seeding Complete! You can now start your server.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Execute the function
seedDatabase();