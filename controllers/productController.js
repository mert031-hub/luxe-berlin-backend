const Product = require('../models/Product');

/**
 * LUXE BERLIN - PRODUCT CONTROLLER (MASTER VERSION)
 * Tüm fonksiyonlar eksiksiz korunmuş, export hataları giderilmiştir.
 * Alman Standartları: Hata mesajları Almanca ve kullanıcı dostudur.
 */

// 1. TÜM ÜRÜNLERİ GETİR
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (err) {
        console.error("GetAllProducts Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Laden der Produkte: " + err.message });
    }
};

// 2. TEK ÜRÜN GETİR
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: "Ungültige Produkt-ID" });
    }
};

// 3. YENİ ÜRÜN OLUŞTUR (Cloudinary Destekli)
exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;

        // Cloudinary'den dönen URL'i alıyoruz
        const imageUrl = req.file ? req.file.path : null;

        if (!name || !price) {
            return res.status(400).json({ success: false, message: "Name und Preis sind erforderlich" });
        }

        const newProduct = new Product({
            name,
            price,
            stock: stock || 0,
            description,
            image: imageUrl
        });

        await newProduct.save();
        res.status(201).json({ success: true, product: newProduct });
    } catch (err) {
        console.error("CreateProduct Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Erstellen: " + err.message });
    }
};

// 4. ÜRÜN GÜNCELLE
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;
        const updateData = { name, price, stock, description };

        if (req.file) {
            updateData.image = req.file.path;
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt zum Aktualisieren nicht gefunden" });
        }

        res.status(200).json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, message: "Fehler beim Aktualisieren: " + err.message });
    }
};

// 5. ÜRÜN ARŞİVLE (Soft Delete - DSGVO Konform)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json({ success: true, message: "Produkt erfolgreich archiviert" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Fehler beim Archivieren" });
    }
};

// 6. ÜRÜN GERİ GETİR (Restore)
exports.restoreProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: false }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json({ success: true, message: "Produkt erfolgreich wiederhergestellt" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Wiederherstellung fehlgeschlagen" });
    }
};