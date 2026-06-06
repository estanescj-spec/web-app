# web-app

CORE PRODUCT DATA MODEL (DATABASE FOUNDATION)

1 PRODUCTS TABLE (MAIN TABLE)

- Product listings
- Admin approval system (pending/approved/rejected)
- Featured products
- Seller ownership
- Categories

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,

    category VARCHAR(100) NOT NULL,

    warranty VARCHAR(100),

    seller_id INT NOT NULL,

    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',

    is_featured BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

2 PRODUCT IMAGES SYSTEM (MULTI-IMAGE SUPPORT)
  - One product → many images

Example:

iPhone 15 Pro (product_id = 1)

| image_id | product_id | image_url | image_type |
| -------- | ---------- | --------- | ---------- |
| 1        | 1          | front.jpg | main       |
| 2        | 1          | back.jpg  | gallery    |
| 3        | 1          | box.jpg   | gallery    |

  CREATE TABLE product_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,

    image_url VARCHAR(255) NOT NULL,
    image_type ENUM('main', 'gallery') DEFAULT 'gallery',

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE CASCADE
);

3 PRODUCT VARIANTS SYSTEM

- Storage options
- Colors
- Stock per combination
- Price differences per variant

| variant_id | storage | color    | price | stock |
| ---------- | ------- | -------- | ----- | ----- |
| 1          | 128GB   | Black    | 69999 | 10    |
| 2          | 256GB   | Blue     | 75999 | 5     |
| 3          | 512GB   | Titanium | 89999 | 2     |


CREATE TABLE product_variants (
    variant_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,

    storage VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,

    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,

    sku VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE CASCADE
);

NEW UPDATE:

Categories Table:

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Products Table:

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,

    category_id INT NOT NULL,
    warranty VARCHAR(100),

    seller_id INT NOT NULL,

    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    is_featured BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

Product Image Table:

CREATE TABLE IF NOT EXISTS product_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    image_type ENUM('main', 'gallery') DEFAULT 'gallery',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE CASCADE
);

Product Variant Table:

CREATE TABLE IF NOT EXISTS product_variants (
    variant_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,

    storage VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,

    sku VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE CASCADE
);