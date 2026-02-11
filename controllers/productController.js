const Product = require('../models/Product');

// 1. Ürünleri Listele (Sadece silinmemişleri değil, hepsini çekiyoruz ki frontend filtrelesin)
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Ürün Oluştur (POST)
exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;
        const image = req.file ? req.file.path : '';
        const newProduct = new Product({ name, price, stock, description, image });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. Ürün Güncelle (PUT)
exports.updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.path;
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. KRİTİK: Yumuşak Silme (DELETE - Gerçekten silmez!)
// controllers/productController.js içindeki deleteProduct fonksiyonu

exports.deleteProduct = async (req, res) => {
    try {
        // findByIdAndDelete KULLANMA! Bunun yerine güncelleme yap:
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.json({ message: "Produkt wurde ins Archiv verschoben. 🗑️" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// YENİ: Geri Getirme Fonksiyonu
exports.restoreProduct = async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: false });
        res.json({ message: "Produkt wurde wiederhergestellt. ♻️" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 5. YENİ: Arşivden Geri Getir (PUT)
exports.restoreProduct = async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: false });
        res.json({ message: "Produkt wurde reaktiviert. ♻️" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};