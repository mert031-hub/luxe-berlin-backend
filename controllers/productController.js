const Product = require('../models/Product');

// --- 1. ÜRÜNLERİ LİSTELE ---
exports.getProducts = async (req, res) => {
    try {
        // Tüm ürünleri çekiyoruz. 
        // Not: Frontend tarafındaki filtreleme (isDeleted kontrolü) ile tam uyumlu.
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Abrufen der Produkte: " + err.message });
    }
};

// --- 2. ÜRÜN OLUŞTUR (POST) ---
exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, description, tag } = req.body;

        /**
         * Cloudinary Notu: req.file.path artık yerel bir yol değil, 
         * Cloudinary'den gelen tam URL'dir (https://res.cloudinary.com/...).
         */
        const image = req.file ? req.file.path : '';

        const newProduct = new Product({
            name,
            price,
            stock,
            description,
            image, // Cloudinary URL'si veritabanına kaydedilir
            tag: tag || "Neu",
            isDeleted: false
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ message: "Produkt konnte nicht erstellt werden: " + err.message });
    }
};

// --- 3. ÜRÜN GÜNCELLE (PUT) ---
exports.updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Eğer admin yeni bir resim seçtiyse, Cloudinary yeni bir URL verir ve biz onu güncelleriz.
        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedProduct) return res.status(404).json({ message: "Produkt nicht gefunden." });

        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ message: "Update fehlgeschlagen: " + err.message });
    }
};

// --- 4. YUMUŞAK SİLME (DELETE) ---
exports.deleteProduct = async (req, res) => {
    try {
        // Ürünü veritabanından tamamen silmiyoruz, arşivliyoruz.
        const deletedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );
        res.json({ message: "Produkt wurde ins Archiv verschoben. 🗑️", product: deletedProduct });
    } catch (err) {
        res.status(500).json({ message: "Löschen fehlgeschlagen: " + err.message });
    }
};

// --- 5. ARŞİVDEN GERİ GETİRME (RESTORE) ---
exports.restoreProduct = async (req, res) => {
    try {
        const restoredProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { isDeleted: false },
            { new: true }
        );
        res.json({ message: "Produkt wurde reaktiviert. ♻️", product: restoredProduct });
    } catch (err) {
        res.status(500).json({ message: "Wiederherstellung fehlgeschlagen: " + err.message });
    }
};