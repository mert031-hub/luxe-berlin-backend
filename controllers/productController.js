const Product = require('../models/Product');


// --- 1. ÜRÜNLERİ LİSTELE ---
exports.getProducts = async (req, res) => {
    try {
        // Sadece silinmemiş ürünleri getiriyoruz
        const products = await Product.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error("GET PRODUCTS ERROR:", err);
        res.status(500).json({ message: "Fehler beim Abrufen der Produkte." });
    }
};


// --- 2. ÜRÜN OLUŞTUR (POST) ---
exports.createProduct = async (req, res) => {
    try {

        // 🔒 IMAGE ZORUNLU
        if (!req.file) {
            return res.status(400).json({ message: "Produktbild ist erforderlich." });
        }

        const { name, price, stock, description, tag } = req.body;

        // 🔒 Basit alan kontrolü
        if (!name || !price || !stock || !description) {
            return res.status(400).json({ message: "Alle Felder müssen ausgefüllt werden." });
        }

        const newProduct = new Product({
            name,
            price,
            stock,
            description,
            image: req.file.path, // Cloudinary URL
            tag: tag || "Neu",
            isDeleted: false
        });

        await newProduct.save();

        res.status(201).json(newProduct);

    } catch (err) {
        console.error("CREATE PRODUCT ERROR:", err);
        res.status(500).json({ message: "Produkt konnte nicht erstellt werden." });
    }
};


// --- 3. ÜRÜN GÜNCELLE (PUT) ---
exports.updateProduct = async (req, res) => {
    try {

        const updateData = { ...req.body };

        // Eğer yeni resim geldiyse güncelle
        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Produkt nicht gefunden." });
        }

        res.json(updatedProduct);

    } catch (err) {
        console.error("UPDATE PRODUCT ERROR:", err);
        res.status(500).json({ message: "Update fehlgeschlagen." });
    }
};


// --- 4. YUMUŞAK SİLME (DELETE) ---
exports.deleteProduct = async (req, res) => {
    try {

        const deletedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedProduct) {
            return res.status(404).json({ message: "Produkt nicht gefunden." });
        }

        res.json({
            message: "Produkt wurde ins Archiv verschoben. 🗑️",
            product: deletedProduct
        });

    } catch (err) {
        console.error("DELETE PRODUCT ERROR:", err);
        res.status(500).json({ message: "Löschen fehlgeschlagen." });
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

        if (!restoredProduct) {
            return res.status(404).json({ message: "Produkt nicht gefunden." });
        }

        res.json({
            message: "Produkt wurde reaktiviert. ♻️",
            product: restoredProduct
        });

    } catch (err) {
        console.error("RESTORE PRODUCT ERROR:", err);
        res.status(500).json({ message: "Wiederherstellung fehlgeschlagen." });
    }
};
