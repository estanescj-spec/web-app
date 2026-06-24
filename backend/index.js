const app = require('./app');
const db = require('./models');
const bcrypt = require('bcrypt');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

async function seedDatabase() {
    try {
        // Sync database
        await db.sequelize.sync({ alter: true });
        console.log('Database synced successfully.');

        // Seed only if categories don't exist yet
        const catCount = await db.Category.count();

        if (catCount === 0) {
            console.log('Seeding default categories...');

            const categories = await db.Category.bulkCreate([
                { name: 'MacBook' },
                { name: 'iPhone' },
                { name: 'iPad' }
            ]);

            console.log('Seeding default accounts...');

            const adminPassword = await bcrypt.hash('admin123', 10);
            const userPassword = await bcrypt.hash('user123', 10);

            // Admin Account
            await db.User.create({
                name: 'System Admin',
                email: 'admin@macsphere.com',
                password: adminPassword,
                role: 'admin'
            });

            // Regular User Account
            const user = await db.User.create({
                name: 'Default User',
                email: 'user@macsphere.com',
                password: userPassword,
                role: 'user'
            });

            // Customer Profile
            await db.CustomerProfile.create({
                user_id: user.id,
                fname: 'Default',
                lname: 'User',
                phone: '09171234567'
            });

            // Address
            await db.Address.create({
                user_id: user.id,
                address_line: '123 Apple Orchard Street',
                zipcode: '1630',
                city: 'Taguig City',
                is_default: true
            });

            // Promo Codes
            await db.PromoCode.bulkCreate([
                {
                    code: 'MACSPHERE10',
                    discount_percentage: 10,
                    active: true
                },
                {
                    code: 'APPLELOVE20',
                    discount_percentage: 20,
                    active: true
                }
            ]);

            console.log('Seeding default products...');

            const macCat = categories.find(c => c.name === 'MacBook');
            const iphoneCat = categories.find(c => c.name === 'iPhone');
            const ipadCat = categories.find(c => c.name === 'iPad');

            await db.Product.bulkCreate([
                {
                    title: 'MacBook Air M3 (13-inch)',
                    description: 'The incredibly thin MacBook Air with M3 chip breezes through work and play.',
                    category_id: macCat.id,
                    seller_id: user.id,
                    cost_price: 55000.00,
                    sell_price: 59990.00,
                    stock_quantity: 15,
                    color: 'Space Gray',
                    storage: '256GB SSD',
                    warranty: '1 Year Apple Warranty',
                    status: 'approved',
                    is_featured: true,
                    img_path: 'images/macbook_air_m3.jpg'
                },
                {
                    title: 'MacBook Pro M3 Max (16-inch)',
                    description: 'The ultimate laptop for developers, creators, and professionals.',
                    category_id: macCat.id,
                    seller_id: user.id,
                    cost_price: 180000.00,
                    sell_price: 199990.00,
                    stock_quantity: 5,
                    color: 'Space Black',
                    storage: '1TB SSD',
                    warranty: '1 Year Apple Warranty',
                    status: 'approved',
                    is_featured: true,
                    img_path: 'images/macbook_pro_m3.jpg'
                },
                {
                    title: 'iPhone 15 Pro Max',
                    description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip.',
                    category_id: iphoneCat.id,
                    seller_id: user.id,
                    cost_price: 70000.00,
                    sell_price: 79990.00,
                    stock_quantity: 25,
                    color: 'Natural Titanium',
                    storage: '256GB',
                    warranty: '1 Year Apple Warranty',
                    status: 'approved',
                    is_featured: true,
                    img_path: 'images/iphone15_pro_max.jpg'
                },
                {
                    title: 'iPad Pro M4 (13-inch)',
                    description: 'Impossibly thin design with outrageous performance and the breakthrough Ultra Retina XDR display.',
                    category_id: ipadCat.id,
                    seller_id: user.id,
                    cost_price: 75000.00,
                    sell_price: 82990.00,
                    stock_quantity: 8,
                    color: 'Silver',
                    storage: '512GB',
                    warranty: '1 Year Apple Warranty',
                    status: 'approved',
                    is_featured: false,
                    img_path: 'images/ipad_pro_m4.jpg'
                }
            ]);

            console.log('Seeding completed.');
        }
    } catch (e) {
        console.error('Database Sync/Seed Error:', e);
    }
}

seedDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});