
// Gerekli Kütüphaneler
// const ejs = require("ejs");
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken")



// Initialization Kodları
const app = express();
const server = http.createServer(app);




// app.use komutları
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
const sessionMiddleware = session({ secret: "mySecretKey", resave: true, saveUninitialized: true });
app.use(sessionMiddleware);



// EJS kullanımını belirtiyoruz
app.set('view engine', 'ejs');



// SOCKET IO için gereklilikler.
const io = socketIo(server);


// JWT token ayarlamaları:
const jwt_secretKey = "gizliAnahtar1067";



// Sqlite3 ayarlamaları:
const db = new sqlite3.Database("data.db");



// Yetkili kullanıcıları veritabanından getirme işlemleri.
let users;
db.all("SELECT kullaniciadi, sifre FROM kullanicilar", [], (err, rows) => {
    if (err) {
        reject(err);
    }

    users = rows.map((row) => ({
        username: row.kullaniciadi,
        password: row.sifre,
    }));
});

// Girişi kontrol etmek için oluşturduğum authenticateUser fonksiyonu:
function authenticateUser(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        res.redirect("/login.html");
    }
}



// Dinamik olarak belirlediğimiz ejs uzantılı dosyalara dinamik olarak veri transferi yapmak için belirlenmiş bir obje:
const messages = [
    { text: 'Bu bir mesajdır.', is_admin: false },
    { text: 'Diğer bir mesaj.', is_admin: true },
    // ... diğer mesajlar
];



// Kullanıcı girişi sırasında yapılacak ilk işlemler:
// Giriş sayfası
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
});



// Giriş kontrolü, "/login" alanına gelen [POST] isteklerini değerlendirme kodları:
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const kullaniciBilgisi = { userId: username, passwd: password };
    console.log(username, password);
    const user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        req.session.user = user;
        res.redirect("/index");
    } else {
        res.send("Invalid username or password. Please try again.");
    }
});



// Ana sayfa
app.get("/index", authenticateUser, (req, res) => {
    if (req.session.user) {
        console.log("\nYönlendirildi.");
        console.log(req.session.user);
        let geciciToken = jwt.sign(req.session.user, jwt_secretKey, {
            expiresIn: "1h",
        });
        console.log("\nToken oluşturuldu, çerez oluşturmaya gidiliyor...");
        console.log("Oluşturulan Token: ", geciciToken);

        res.cookie("kullanici_cerezi", geciciToken);
        console.log("\nCookie(çerez) oluşturuldu.");
        // res.sendFile(__dirname + "/public/website.html"); // Before render way
        res.render('index', { messages });
    }

    else {
        res.redirect("/");
    }
});

// app.get("authentication-error", (req,res) => {
//     res.sendFile(__dirname + "/public/authentication-error.html");
// });



// Çerezleri kontrol etmek için yazılan kod bloğu:
app.get("/cerez", (req, res) => {
    if (req.session.user) {
        let olusturulan_cerez = req.cookies.kullanici_cerezi;

        if (olusturulan_cerez) {
            jwt.verify(olusturulan_cerez, jwt_secretKey, (err, decoded) => {
                if (err) {
                    res.send("Oturum süreniz doldu. Tekrardan giriş yapınız. ");
                } else {
                    // Kullanıcı bilgilerini göster
                    console.log("Oluşturulan şifreli çerez içeriği: ", olusturulan_cerez);
                    console.log("Çözülen çerez: ", decoded);
                }
            });
        }
    } else {
        res.redirect("/");
    }
});



app.get("authentication-error", (req, res) => {
    res.sendFile(__dirname + "/public/authentication-error.html");
});



app.use(express.static(__dirname + "/public"));



server.listen(3000, () => {
    console.log('Sunucu 3000 portunda çalışıyor...');
});
