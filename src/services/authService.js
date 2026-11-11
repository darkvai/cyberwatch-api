const Analyst = require('../models/analyst');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Provisions a new Analyst account.
 * Typically restricted to L3 Lead Analysts via middleware.
 */
exports.registerAnalyst = async (username, rawPassword, role) => {

    const existingUser = await Analyst.findOne({ username });
    if (existingUser) {
        throw new Error('An analyst with this username already exists.');
    }

    // 2. Hash the password for secure storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // 3. Create and save the new analyst
    const newAnalyst = new Analyst({
        username: username,
        password: hashedPassword,
        role: role // Expected: 'L1', 'L2', or 'L3'
    });

    return await newAnalyst.save();
};

/**
 * Authenticates an Analyst and generates a signed JWT.
 */
exports.loginAnalyst = async (username, rawPassword) => {
    // 1. Locate the analyst in the database
    const analyst = await Analyst.findOne({ username });
    if (!analyst) {
        throw new Error('Invalid username or password.');
    }

    // 2. Compare the provided plaintext password against the stored hash
    const isMatch = await bcrypt.compare(rawPassword, analyst.password);
    if (!isMatch) {
        throw new Error('Invalid username or password.');
    }

    // 3. Construct the JWT payload containing identity and RBAC tier
    const payload = {
        id: analyst._id,
        username: analyst.username,
        role: analyst.role
    };

    // 4. Sign the token (Setting expiration to 8 hours for a standard SOC shift)
    const token = jwt.sign(
        payload, 
        process.env.JWT_SECRET || 'FALLBACK_SECRET_DO_NOT_USE_IN_PROD', 
        { expiresIn: '8h' }
    );

    return { analyst, token };
};