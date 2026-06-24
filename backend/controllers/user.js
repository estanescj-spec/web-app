const db = require('../models');
const User = db.User;
const CustomerProfile = db.CustomerProfile;
const StoreProfile = db.StoreProfile;
const Address = db.Address;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// Helper to get userId from request
const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Register User
exports.registerUser = async (req, res) => {    
    try {
        const { name, password, email, role } = req.body;
        const normalizedName = String(name || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(role || 'user').toLowerCase();
        const finalRole = normalizedRole === 'admin' ? 'admin' : 'user';

        if (!normalizedName || !password || !normalizedEmail) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: finalRole // Exactly 2 roles: 'admin' and 'user'
        });

        // Auto-create blank customer profiles for non-admin users
        if (user.role === 'user') {
            await CustomerProfile.create({ user_id: user.id });
        }

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Error registering user', details: error.message });
    }
};

// Login User
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({
            where: { email: normalizedEmail, deleted_at: null }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET);

        return res.status(200).json({
            success: true,
            message: 'Welcome back',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error logging in', details: error.message });
    }
};

// Get profile details (including customer and store profile)
exports.getProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId, {
            include: [
                { model: CustomerProfile },
                { model: StoreProfile },
                { model: Address }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                CustomerProfile: user.CustomerProfile,
                StoreProfile: user.StoreProfile,
                Addresses: user.Addresses
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching profile', details: error.message });
    }
};

// Update Customer Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { fname, lname, phone } = req.body;

        let imagePath = null;
        if (req.file) {
            imagePath = 'images/' + req.file.filename;
        }

        const [profile, created] = await CustomerProfile.findOrCreate({
            where: { user_id: userId }
        });

        await profile.update({
            fname: fname !== undefined ? fname : profile.fname,
            lname: lname !== undefined ? lname : profile.lname,
            phone: phone !== undefined ? phone : profile.phone,
            image_path: imagePath || profile.image_path
        });

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            profile
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating profile', details: error.message });
    }
};

// Create or update Store Profile
exports.createStoreProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { store_name, store_description } = req.body;

        if (!store_name) {
            return res.status(400).json({ error: 'Store name is required' });
        }

        const [store, created] = await StoreProfile.findOrCreate({
            where: { user_id: userId },
            defaults: { store_name, store_description }
        });

        if (!created) {
            await store.update({
                store_name,
                store_description
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Store profile saved successfully',
            store
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error saving store profile', details: error.message });
    }
};

// Address Management
exports.getAddresses = async (req, res) => {
    try {
        const userId = getUserId(req);
        const addresses = await Address.findAll({ where: { user_id: userId } });
        return res.status(200).json({ success: true, addresses });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching addresses' });
    }
};

exports.addAddress = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { address_line, zipcode, city, is_default } = req.body;

        if (!address_line || !zipcode || !city) {
            return res.status(400).json({ error: 'Missing address details' });
        }

        if (is_default) {
            await Address.update({ is_default: false }, { where: { user_id: userId } });
        }

        const address = await Address.create({
            user_id: userId,
            address_line,
            zipcode,
            city,
            is_default: !!is_default
        });

        return res.status(201).json({ success: true, address });
    } catch (error) {
        return res.status(500).json({ error: 'Error adding address' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        await Address.destroy({ where: { id, user_id: userId } });
        return res.status(200).json({ success: true, message: 'Address deleted' });
    } catch (error) {
        return res.status(500).json({ error: 'Error deleting address' });
    }
};

// Admin user controls
exports.adminGetUsers = async (req, res) => {
    try {
        // Only admins may list all users
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const users = await User.findAll({
            where: { deleted_at: null },
            attributes: ['id', 'name', 'email', 'role', 'created_at'],
            include: [{ model: StoreProfile }]
        });

        return res.status(200).json({ success: true, users });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching users' });
    }
};

exports.adminUpdateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Only admins may change roles
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        await User.update({ role }, { where: { id } });
        return res.status(200).json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Error updating user role' });
    }
};

exports.adminApproveStore = async (req, res) => {
    try {
        const { id } = req.params; // Store Profile ID
        const { is_verified } = req.body;

        // Only admins may approve stores
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        await StoreProfile.update({ is_verified }, { where: { id } });
        return res.status(200).json({ success: true, message: 'Store verification status updated' });
    } catch (error) {
        return res.status(500).json({ error: 'Error approving store' });
    }
};