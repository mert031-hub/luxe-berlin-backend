const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // İsteğin başlığındaki (header) token'ı al
    const token = req.header('x-auth-token');

    // Token yoksa erişimi reddet
    if (!token) {
        return res.status(401).json({ message: "Zugriff verweigert. Kein Token." });
    }

    try {
        // .env dosendaki JWT_SECRET ile doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next(); // Görevli onay verdi, asıl işleme geç
    } catch (err) {
        res.status(401).json({ message: "Token ist ungültig." });
    }
};