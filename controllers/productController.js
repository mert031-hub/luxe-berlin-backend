const Product = require('../models/Product');

// 1. Ürünleri Listele
exports.getProducts = async (req, res) => {
    try {
        // Frontend filtrelesin demişsin, o yüzden hepsini çekiyoruz.
        // Ama istersen: .find({ isDeleted: false }) diyerek sadece yayındakileri de çekebilirsin.
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Abrufen der Produkte: " + err.message });
    }
};

// 2. Ürün Oluştur (POST)
exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;
        // Resim yoksa boş string, varsa multer'dan gelen path
        const image = req.file ? req.file.path : '';

        const newProduct = new Product({
            name,
            price,
            stock,
            description,
            image,
            isDeleted: false // Yeni ürün varsayılan olarak silinmemiş gelir
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ message: "Produkt konnte nicht erstellt werden: " + err.message });
    }
};

// 3. Ürün Güncelle (PUT)
exports.updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };
        // Eğer yeni bir resim yüklendiyse path'i güncelle
        if (req.file) updateData.image = req.file.path;

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

// 4. Yumuşak Silme (DELETE)
exports.deleteProduct = async (req, res) => {
    try {
        // findByIdAndDelete yerine isDeleted bayrağını işaretle
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

// 5. Arşivden Geri Getirme (RESTORE)
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